# Backend Billing V2 Handoff

**Date:** 2026-04-07
**Context:** The frontend (Next.js) has a new billing system built. The backend needs to take over the automated lifecycle events: call usage recording, trial-to-grace transitions, grace expiry, billing activation, emails, and overage. This document tells you everything you need.

---

## 1. What changed from the old billing

### Old system (what your backend probably still does)
- Time-based trial: 7-day free trial managed by Stripe's `trial_period_days`
- Backend reads `users.subscription_status` (e.g. `'trialing'`, `'active'`) and `users.subscription_plan` (e.g. `'essential'`)
- Backend reads `users.subscription_current_period_start` / `users.subscription_current_period_end` for period bounds
- Backend may read `users.trial_minutes` (was 90) to check minute allowance during trial
- Stripe subscription is created at checkout with an actual trial period

### New system (Billing V2)
- **Call-count trial**: 5 free calls (not time-based), then 14-day grace period, then billing activates
- **No Stripe subscription exists during trial/grace** — only a saved payment method. Stripe subscription is created when billing activates.
- The source of truth for billing state is now `billing_subscriptions` table (not `users`)
- `users` table columns are still synced for backward compatibility but are **secondary**
- New `billing_period_usage` table tracks per-period minutes as an append-only ledger
- Two minute buckets: `outbound` (funded by subscription) and `inbound` (optional add-on)

### IMPORTANT: Do NOT delete or stop writing to these `users` columns
The frontend still syncs these for backward compat. Your backend can keep reading them:
```
users.subscription_status      -- 'trialing' | 'active' | 'canceled' | null
users.subscription_plan        -- 'essential' | 'peace_of_mind' | 'complete_care' | null
users.stripe_subscription_id   -- null during trial (setup mode), set when billing activates
users.subscription_current_period_start
users.subscription_current_period_end
users.subscription_cancel_at_period_end
```

**New columns on `users` (added in V2):**
```
users.billing_phase                    -- 'none' | 'trial' | 'grace' | 'active' | 'canceled'
users.active_billing_subscription_id   -- FK to billing_subscriptions.id
```

`billing_phase` is the column you should use for access control decisions going forward. It is the most reliable indicator of whether the user should be allowed to use the service.

---

## 2. Database tables

### `billing_subscriptions` (new — source of truth)
```sql
id                        UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id                   UUID NOT NULL REFERENCES users(id)
stripe_subscription_id    TEXT             -- NULL during trial/grace, set when billing activates
stripe_customer_id        TEXT             -- Stripe customer ID (set at checkout)
outbound_plan_slug        TEXT NOT NULL    -- 'essential' | 'peace_of_mind' | 'complete_care'
outbound_minutes_included INTEGER NOT NULL -- 180 | 400 | 750
billing_phase             TEXT NOT NULL DEFAULT 'trial'  -- CHECK IN ('trial','grace','active','canceled')
trial_calls_required      INTEGER DEFAULT 5
trial_calls_completed     INTEGER DEFAULT 0
trial_minutes_ceiling     INTEGER DEFAULT 90   -- safety cap on total minutes during trial
trial_completed_at        TIMESTAMPTZ          -- when 5th call finished
grace_period_ends_at      TIMESTAMPTZ          -- when grace period expires (trial_completed_at + 14 days)
billing_activated_at      TIMESTAMPTZ          -- when billing actually started
current_period_start      TIMESTAMPTZ          -- Stripe billing period start (only after activation)
current_period_end        TIMESTAMPTZ          -- Stripe billing period end
inbound_plan_slug         TEXT                 -- 'inbound_1' | 'inbound_2' | 'inbound_3' | null
inbound_minutes_included  INTEGER DEFAULT 0
inbound_stripe_item_id    TEXT                 -- Stripe subscription item ID for inbound add-on
overage_enabled           BOOLEAN DEFAULT false
overage_spend_cap_pence   INTEGER DEFAULT 0    -- user-set monthly overage cap in pence
overage_product_id        TEXT                 -- Stripe product ID for overage invoice items
overage_stripe_item_id    TEXT
canceled_at               TIMESTAMPTZ
created_at                TIMESTAMPTZ DEFAULT now()
updated_at                TIMESTAMPTZ DEFAULT now()
```

### `billing_period_usage` (new — append-only usage ledger)
```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
subscription_id   UUID NOT NULL REFERENCES billing_subscriptions(id)
user_id           UUID NOT NULL REFERENCES users(id)
elder_id          UUID REFERENCES elders(id)
bucket_type       TEXT NOT NULL    -- 'outbound' | 'inbound'
period_start      TIMESTAMPTZ NOT NULL
period_end        TIMESTAMPTZ NOT NULL
minutes_included  INTEGER DEFAULT 0
minutes_used      INTEGER DEFAULT 0
overage_minutes   INTEGER DEFAULT 0
overage_cost_pence INTEGER DEFAULT 0
call_count        INTEGER DEFAULT 0
created_at        TIMESTAMPTZ DEFAULT now()
updated_at        TIMESTAMPTZ DEFAULT now()

UNIQUE(subscription_id, bucket_type, period_start)
```

---

## 3. The billing lifecycle (full picture)

```
[1] User signs up → picks a plan on frontend
         │
[2] Stripe Checkout (mode: 'setup') → saves card, NO subscription created
         │
[3] Frontend creates billing_subscriptions row:
         billing_phase = 'trial'
         trial_calls_completed = 0
         stripe_subscription_id = NULL
         │
[4] User makes calls (YOUR BACKEND handles this)
    ├── After each call: increment trial_calls_completed
    ├── After 5th call: set billing_phase = 'grace', grace_period_ends_at = now + 14 days
    └── SEND EMAIL: "Your 5 free calls are done. Billing starts in 14 days on {plan}. Change plan or cancel anytime."
         │
[5] Grace period (14 days) — YOUR BACKEND cron handles this
    ├── Day 12 (2 days before expiry): SEND EMAIL reminder
    └── Day 14 (grace_period_ends_at reached): activate billing
         │
[6] Activate billing (YOUR BACKEND does this)
    ├── Create Stripe subscription using saved payment method
    ├── Set billing_phase = 'active'
    ├── Create billing_period_usage rows for the first period
    └── SEND EMAIL: "Your subscription is now active"
         │
[7] Ongoing calls (YOUR BACKEND handles this)
    ├── Update billing_period_usage.minutes_used
    ├── If minutes exceed plan allowance AND overage_enabled: track overage
    └── If overage exceeds spend cap: stop tracking (call still completes, never cut mid-call)
         │
[8] Period renewal — Stripe webhook (FRONTEND handles this, no backend work needed)
    ├── invoice.payment_succeeded → creates new billing_period_usage rows
    └── invoice.payment_failed → TODO: send email notification
```

---

## 4. What your backend needs to build

### 4A. Replace the frontend's `record-call-usage` route

The frontend currently has this at `POST /api/internal/record-call-usage`. It works but adds an unnecessary HTTP hop since your backend already knows when a call ends. **Move this logic directly into your backend.**

Here is the exact logic to replicate (pseudocode):

```python
def after_call_ends(call_execution_id):
    # 1. Get the call
    call = db.call_executions.get(call_execution_id)
    call_minutes = ceil(call.duration / 60)
    bucket_type = call.direction  # 'outbound' or 'inbound'

    # 2. Get the user via elder
    elder = db.elders.get(call.elder_id)
    user = db.users.get(elder.user_id)

    if not user.active_billing_subscription_id:
        return  # no billing sub, nothing to track

    # 3. Get billing subscription
    billing_sub = db.billing_subscriptions.get(user.active_billing_subscription_id)

    # ── TRIAL PHASE ──────────────────────────────────────────────
    if billing_sub.billing_phase == 'trial':
        new_completed = billing_sub.trial_calls_completed + 1
        trial_done = new_completed >= billing_sub.trial_calls_required  # 5

        db.billing_subscriptions.update(billing_sub.id, {
            trial_calls_completed: new_completed,
        })

        if trial_done:
            grace_ends = now() + timedelta(days=14)
            db.billing_subscriptions.update(billing_sub.id, {
                billing_phase: 'grace',
                trial_completed_at: now(),
                grace_period_ends_at: grace_ends,
            })
            db.users.update(user.id, { billing_phase: 'grace' })

            # >>> SEND EMAIL: trial complete, grace period started <<<
            send_trial_complete_email(user, billing_sub, grace_ends)

        return

    # ── ACTIVE PHASE ─────────────────────────────────────────────
    if billing_sub.billing_phase == 'active' and billing_sub.current_period_start:
        bucket = db.billing_period_usage.get(
            subscription_id=billing_sub.id,
            bucket_type=bucket_type,
            period_start=billing_sub.current_period_start,
        )

        if not bucket:
            return  # no usage bucket for this period yet

        new_minutes = bucket.minutes_used + call_minutes
        new_count = bucket.call_count + 1
        new_overage_mins = bucket.overage_minutes
        new_overage_cost = bucket.overage_cost_pence

        # Check overage
        if new_minutes > bucket.minutes_included:
            overage_this_call = max(0, new_minutes - max(bucket.minutes_used, bucket.minutes_included))

            if overage_this_call > 0 and billing_sub.overage_enabled:
                additional_cost = overage_this_call * 50  # OVERAGE_RATE_PENCE_PER_MINUTE (placeholder)

                # Check spend cap across BOTH buckets combined
                all_buckets = db.billing_period_usage.list(
                    subscription_id=billing_sub.id,
                    period_start=billing_sub.current_period_start,
                )
                combined_overage = sum(b.overage_cost_pence for b in all_buckets) \
                    - bucket.overage_cost_pence \
                    + (bucket.overage_cost_pence + additional_cost)

                if combined_overage <= billing_sub.overage_spend_cap_pence:
                    new_overage_mins = bucket.overage_minutes + overage_this_call
                    new_overage_cost = bucket.overage_cost_pence + additional_cost

        db.billing_period_usage.update(bucket.id, {
            minutes_used: new_minutes,
            call_count: new_count,
            overage_minutes: new_overage_mins,
            overage_cost_pence: new_overage_cost,
        })
```

### 4B. Grace period expiry cron

Run daily (or more frequently). Checks for subscriptions whose grace period has ended and activates billing.

```python
def cron_check_grace_expiry():
    """Run every hour or daily."""
    expired = db.billing_subscriptions.list(
        billing_phase='grace',
        grace_period_ends_at__lte=now(),
    )

    for billing_sub in expired:
        activate_billing(billing_sub)
```

### 4C. Activate billing (create Stripe subscription)

This is the most critical piece. When grace expires, you create the actual Stripe subscription.

```python
def activate_billing(billing_sub):
    # 1. Look up the plan to get the Stripe Price ID
    plan = get_plan_by_slug(billing_sub.outbound_plan_slug)
    # Plan slugs → Stripe Price IDs (get these from your env vars):
    #   'essential'      → STRIPE_PRICE_ESSENTIAL
    #   'peace_of_mind'  → STRIPE_PRICE_PEACE_OF_MIND
    #   'complete_care'  → STRIPE_PRICE_COMPLETE_CARE

    # 2. Get the customer's default payment method
    customer = stripe.customers.retrieve(billing_sub.stripe_customer_id)
    default_pm = customer.invoice_settings.default_payment_method

    # 3. Build subscription items
    items = [{ 'price': plan.stripe_price_id }]
    if billing_sub.inbound_plan_slug:
        inbound_plan = get_inbound_plan_by_slug(billing_sub.inbound_plan_slug)
        items.append({ 'price': inbound_plan.stripe_price_id })

    # 4. Create the Stripe subscription
    subscription = stripe.subscriptions.create(
        customer=billing_sub.stripe_customer_id,
        items=items,
        default_payment_method=default_pm,
        metadata={
            'user_id': billing_sub.user_id,
            'billing_subscription_id': billing_sub.id,
            'outbound_plan_slug': billing_sub.outbound_plan_slug,
        },
    )

    # 5. Get period bounds from the subscription
    # NOTE: In Stripe API 2026 (dahlia), current_period_start/end moved to
    # subscription.items.data[0].current_period_start/end (not on the subscription root)
    outbound_item = subscription.items.data[0]
    period_start = datetime.fromtimestamp(outbound_item.current_period_start)
    period_end = datetime.fromtimestamp(outbound_item.current_period_end)

    # 6. Update billing_subscriptions
    db.billing_subscriptions.update(billing_sub.id, {
        billing_phase: 'active',
        billing_activated_at: now(),
        stripe_subscription_id: subscription.id,
        current_period_start: period_start,
        current_period_end: period_end,
    })

    # 7. Update users table (legacy columns + new billing_phase)
    db.users.update(billing_sub.user_id, {
        billing_phase: 'active',
        subscription_status: 'active',
        stripe_subscription_id: subscription.id,
        subscription_plan: billing_sub.outbound_plan_slug,
        subscription_current_period_start: period_start,
        subscription_current_period_end: period_end,
    })

    # 8. Create initial usage bucket rows
    elder = db.elders.find_one(user_id=billing_sub.user_id)

    db.billing_period_usage.upsert({
        subscription_id: billing_sub.id,
        user_id: billing_sub.user_id,
        elder_id: elder.id if elder else None,
        bucket_type: 'outbound',
        period_start: period_start,
        period_end: period_end,
        minutes_included: billing_sub.outbound_minutes_included,
        minutes_used: 0,
        overage_minutes: 0,
        overage_cost_pence: 0,
        call_count: 0,
    }, on_conflict='subscription_id,bucket_type,period_start')

    if billing_sub.inbound_plan_slug:
        db.billing_period_usage.upsert({
            subscription_id: billing_sub.id,
            user_id: billing_sub.user_id,
            elder_id: elder.id if elder else None,
            bucket_type: 'inbound',
            period_start: period_start,
            period_end: period_end,
            minutes_included: billing_sub.inbound_minutes_included,
            minutes_used: 0,
            overage_minutes: 0,
            overage_cost_pence: 0,
            call_count: 0,
        }, on_conflict='subscription_id,bucket_type,period_start')

    # 9. Send email
    send_billing_activated_email(user, billing_sub, plan)
```

### 4D. Grace period reminder cron

```python
def cron_send_grace_reminders():
    """Run daily. Send a reminder 2 days before grace period ends."""
    two_days_from_now = now() + timedelta(days=2)

    upcoming = db.billing_subscriptions.list(
        billing_phase='grace',
        grace_period_ends_at__gte=now(),
        grace_period_ends_at__lte=two_days_from_now,
    )

    for billing_sub in upcoming:
        # Check if we already sent a reminder (avoid duplicates)
        # You could use a `grace_reminder_sent_at` column or a separate table
        if not billing_sub.grace_reminder_sent_at:
            send_grace_reminder_email(billing_sub)
            db.billing_subscriptions.update(billing_sub.id, {
                grace_reminder_sent_at: now()
            })
```

> **Note:** You may want to add a `grace_reminder_sent_at` column to `billing_subscriptions` to avoid duplicate emails. The column doesn't exist yet — you'll need to add it via migration.

### 4E. Overage invoice item creation (end of billing period)

At the end of each billing period, if overage was accrued, create a Stripe invoice item so it's added to the next invoice.

```python
def cron_bill_overage():
    """Run daily or at period boundaries."""
    active_subs = db.billing_subscriptions.list(billing_phase='active')

    for billing_sub in active_subs:
        if not billing_sub.current_period_end:
            continue

        # Check if period is about to end (within 1 day)
        if billing_sub.current_period_end > now() + timedelta(days=1):
            continue

        # Sum overage across both buckets for this period
        buckets = db.billing_period_usage.list(
            subscription_id=billing_sub.id,
            period_start=billing_sub.current_period_start,
        )
        total_overage_pence = sum(b.overage_cost_pence for b in buckets)

        if total_overage_pence > 0:
            stripe.invoice_items.create(
                customer=billing_sub.stripe_customer_id,
                amount=total_overage_pence,
                currency='gbp',
                description=f'Overage: {sum(b.overage_minutes for b in buckets)} extra minutes',
                subscription=billing_sub.stripe_subscription_id,
                # This gets added to the next invoice automatically
            )
```

---

## 5. Emails to send

| Trigger | When | Content |
|---------|------|---------|
| **Trial complete** | 5th call finishes | "Your 5 free calls are done! Your {plan_name} subscription ({price}/month) will activate on {grace_period_ends_at}. You can change your plan or cancel anytime from Settings." |
| **Grace reminder** | 2 days before grace_period_ends_at | "Reminder: Your {plan_name} subscription starts in 2 days on {date}. First charge will be {price}. Change plan or cancel in Settings." |
| **Billing activated** | When activate_billing() runs | "Your {plan_name} subscription is now active. You have {minutes_included} outbound minutes this month. Manage your plan in Settings." |
| **Payment failed** | Stripe `invoice.payment_failed` webhook | "Your payment of {amount} failed. Please update your payment method to keep your service active." |

---

## 6. Plan definitions (reference data)

### Outbound plans
| Slug | Name | Price/mo | Minutes | Stripe Price env var |
|------|------|----------|---------|---------------------|
| `essential` | Essential | £29.99 (2999p) | 180 | `STRIPE_PRICE_ESSENTIAL` |
| `peace_of_mind` | Peace of Mind | £49.99 (4999p) | 400 | `STRIPE_PRICE_PEACE_OF_MIND` |
| `complete_care` | Complete Care | £79.99 (7999p) | 750 | `STRIPE_PRICE_COMPLETE_CARE` |

### Inbound add-on plans (optional, prices are placeholders)
| Slug | Name | Price/mo | Minutes | Stripe Price env var |
|------|------|----------|---------|---------------------|
| `inbound_1` | Inbound Tier 1 | £9.99 (999p) | 60 | `STRIPE_PRICE_INBOUND_1` |
| `inbound_2` | Inbound Tier 2 | £19.99 (1999p) | 150 | `STRIPE_PRICE_INBOUND_2` |
| `inbound_3` | Inbound Tier 3 | £29.99 (2999p) | 300 | `STRIPE_PRICE_INBOUND_3` |

### Constants
| Constant | Value | Notes |
|----------|-------|-------|
| `TRIAL_CALLS_REQUIRED` | 5 | Free calls before grace period |
| `TRIAL_MINUTES_CEILING` | 90 | Safety cap during trial |
| `GRACE_PERIOD_DAYS` | 14 | Days between trial end and billing activation |
| `OVERAGE_RATE_PENCE_PER_MINUTE` | 50 | £0.50/min placeholder — may change |

---

## 7. Stripe API notes

- **API version:** `2026-03-25.dahlia` (Stripe SDK v22+)
- **IMPORTANT:** In this API version, `subscription.current_period_start` and `subscription.current_period_end` have moved from the subscription root to `subscription.items.data[N].current_period_start` / `.current_period_end`. Access them on the subscription item, not the subscription itself.
- **Stripe account:** DailyFriend LTD sandbox (new account, separate from any previous Stripe account)
- **Setup mode:** No Stripe subscription exists during trial/grace. The card is saved via `mode: 'setup'` checkout. The default payment method is stored on the Stripe customer's `invoice_settings.default_payment_method`.
- All prices are in **GBP (pence)**.

---

## 8. Access control recommendation

Your backend currently checks `users.subscription_status` to decide if a user can make calls. Update to:

```python
# OLD (replace this):
if user.subscription_status in ('trialing', 'active'):
    allow_call()

# NEW:
if user.billing_phase in ('trial', 'grace', 'active'):
    allow_call()
```

During `trial`: allow up to `TRIAL_MINUTES_CEILING` (90) total minutes.
During `grace`: same as trial — the user should still be able to use the service.
During `active`: allow up to plan's `minutes_included`, plus overage if enabled.

**Never terminate a call mid-conversation.** If a user exceeds their limits, the call completes and overage is recorded. Enforcement happens before the _next_ call starts, not during one.

---

## 9. What the frontend still handles (do NOT replicate)

- Stripe Checkout session creation (card save)
- `sync-from-checkout` (creates billing_subscriptions row after checkout)
- Stripe webhook handler (syncs Stripe events → DB)
- Billing UI display (SubscriptionManager, UsageDashboard, etc.)
- Stripe Customer Portal session creation (plan changes via Stripe's hosted UI)

---

## 10. What to delete/deprecate in your backend

- Any logic that checks `users.subscription_status == 'trialing'` for trial management — replace with `users.billing_phase`
- Any references to `TRIAL_PERIOD_DAYS = 7` — trial is now call-count based (5 calls), not time-based
- Any logic that creates Stripe subscriptions at signup — subscriptions are now only created when billing activates (after trial + grace)
- The frontend's `POST /api/internal/record-call-usage` route can be deleted once your backend handles call usage recording directly (but confirm with Rick first)

---

## 11. Env vars your backend needs

```
STRIPE_SECRET_KEY=sk_test_...           # Same key as frontend uses
STRIPE_PRICE_ESSENTIAL=price_...
STRIPE_PRICE_PEACE_OF_MIND=price_...
STRIPE_PRICE_COMPLETE_CARE=price_...
STRIPE_PRICE_INBOUND_1=price_...
STRIPE_PRICE_INBOUND_2=price_...
STRIPE_PRICE_INBOUND_3=price_...
STRIPE_OVERAGE_PRODUCT_ID=prod_...

# Billing constants (or hardcode them):
TRIAL_CALLS_REQUIRED=5
TRIAL_MINUTES_CEILING=90
GRACE_PERIOD_DAYS=14
OVERAGE_RATE_PENCE_PER_MINUTE=50
```

Get the actual Stripe Price IDs from the frontend's `.env.local` file or from the Stripe Dashboard (DailyFriend LTD sandbox account).
