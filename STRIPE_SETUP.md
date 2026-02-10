# Stripe Setup Guide

## 1. Configure Stripe Billing Portal

The billing portal must be configured in your Stripe Dashboard before it can be used:

1. Go to [Stripe Dashboard → Customer Portal Settings](https://dashboard.stripe.com/settings/billing/portal)
2. Click **"Activate link"** in the "Ways to get started" section
3. Configure the portal settings:
   - **Cancel subscription**: Enable this so customers can cancel
   - **Cancellation reason**: Optional, but recommended
   - **Switch plan**: Enable if you want customers to upgrade/downgrade
   - **Update quantities**: Enable if you have seat-based pricing
4. Click **"Save"** to save your configuration

**Important**: Make sure you're in **Test mode** (toggle in top right) when configuring for development.

## 2. Install Stripe CLI (for Webhook Testing)

The Stripe CLI lets you test webhooks locally without deploying your app.

### macOS Installation:

```bash
# Using Homebrew (recommended)
brew install stripe/stripe-cli/stripe

# Or download from: https://github.com/stripe/stripe-cli/releases
```

### Login to Stripe:

```bash
stripe login
```

This will open your browser to authenticate. After logging in, the CLI will be connected to your Stripe account.

### Forward Webhooks to Local Server:

In a separate terminal window, run:

```bash
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

This will:
- Forward all Stripe events to your local webhook endpoint
- Display a webhook signing secret (starts with `whsec_`)
- Show you all events in real-time

**Copy the webhook signing secret** and add it to your `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Test Webhook Events:

The CLI will show you events as they happen. You can also trigger test events:

```bash
# Trigger a test subscription creation event
stripe trigger customer.subscription.created

# Trigger a test payment success event
stripe trigger invoice.payment_succeeded
```

## 3. Environment Variables

Make sure your `.env.local` has all required variables:

```env
# Stripe Keys (from Dashboard → Developers → API keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Stripe Webhook Secret (from `stripe listen` command)
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (one per plan tier)
NEXT_PUBLIC_STRIPE_PRICE_ESSENTIAL=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_PEACE_OF_MIND=price_yyy
NEXT_PUBLIC_STRIPE_PRICE_COMPLETE_CARE=price_zzz
# Trial length & minutes are configured in src/config/plans.ts

# App URL (for redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase (you should already have these)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...  # Required for webhooks
```

## 4. Testing the Integration

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **In another terminal, start webhook forwarding:**
   ```bash
   stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
   ```

3. **Test the subscription flow:**
   - Go to `/app/settings` in your B2C portal
   - Click "Subscribe now"
   - Complete checkout with test card: `4242 4242 4242 4242`
   - Any future date for expiry, any CVC
   - You should be redirected back and see "Your subscription is active"

4. **Test the billing portal:**
   - Click "Manage billing"
   - You should be able to view invoices, update payment methods, cancel subscription, etc.

## Troubleshooting

### "Unable to create portal session" Error

This usually means:
1. **Portal not activated**: Go to Stripe Dashboard → Settings → Billing → Customer Portal and click "Activate link"
2. **Wrong mode**: Make sure you're in Test mode if using test keys
3. **Customer doesn't exist**: The customer must have been created in Stripe first

### Webhooks Not Working

1. Make sure `stripe listen` is running
2. Check that `STRIPE_WEBHOOK_SECRET` matches what `stripe listen` shows
3. Check your server logs for webhook errors
4. Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly

### Subscription Status Not Updating

1. Check that webhooks are being received (look at `stripe listen` output)
2. Check server logs for webhook processing errors
3. Manually sync by clicking "Refresh" in the subscription UI
4. Or use the sync endpoint: `POST /api/stripe/sync-from-checkout` with `sessionId`

