import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { mapStripeToBillingSubscription } from '@/lib/stripe-subscription'
import { getPlanBySlug } from '@/config/plans'

/**
 * Activate billing for a user who completed the trial + grace period.
 *
 * Two flows depending on whether checkout used setup mode or subscription mode:
 *
 * - Setup mode (new):  No Stripe subscription exists yet.
 *   Creates the subscription using the customer's saved default payment method,
 *   then syncs period bounds into billing_subscriptions + billing_period_usage.
 *
 * - Subscription mode (legacy): Stripe subscription exists but is in trial.
 *   Ends the trial immediately (trial_end: 'now') so billing starts now.
 *
 * Accepts { billingSubscriptionId } or { userId } in the request body.
 * Can be called by a cron job or by the confirm-plan endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { billingSubscriptionId, userId } = body

    // Find the billing subscription
    let query = supabaseAdmin
      .from('billing_subscriptions')
      .select('*')

    if (billingSubscriptionId) {
      query = query.eq('id', billingSubscriptionId)
    } else if (userId) {
      query = query.eq('user_id', userId).in('billing_phase', ['grace', 'trial'])
    } else {
      return NextResponse.json(
        { error: 'Missing billingSubscriptionId or userId' },
        { status: 400 }
      )
    }

    const { data: billingSub, error: fetchError } = await query.single()

    if (fetchError || !billingSub) {
      return NextResponse.json({ error: 'Billing subscription not found' }, { status: 404 })
    }

    if (billingSub.billing_phase === 'active') {
      return NextResponse.json({ message: 'Billing already active' })
    }

    const now = new Date().toISOString()
    let subscription: import('stripe').Stripe.Subscription

    if (!billingSub.stripe_subscription_id) {
      // ── Setup-mode flow: create the Stripe subscription now ──────────────
      const customerId = billingSub.stripe_customer_id
      if (!customerId) {
        return NextResponse.json(
          { error: 'No Stripe customer ID on billing subscription' },
          { status: 400 }
        )
      }

      const plan = getPlanBySlug(billingSub.outbound_plan_slug)
      if (!plan || !plan.stripePriceId) {
        return NextResponse.json(
          { error: `Unknown plan slug: ${billingSub.outbound_plan_slug}` },
          { status: 400 }
        )
      }

      // Build subscription items — always include outbound tier
      const items: import('stripe').Stripe.SubscriptionCreateParams.Item[] = [
        { price: plan.stripePriceId },
      ]

      // Include inbound add-on if one was selected during trial
      if (billingSub.inbound_stripe_item_id) {
        // inbound_stripe_item_id holds the price ID when set before subscription creation
        items.push({ price: billingSub.inbound_stripe_item_id })
      }

      subscription = await stripe.subscriptions.create({
        customer: customerId,
        items,
        default_payment_method: await getCustomerDefaultPaymentMethod(customerId),
        metadata: {
          user_id: billingSub.user_id,
          billing_subscription_id: billingSub.id,
          outbound_plan_slug: billingSub.outbound_plan_slug,
        },
      } as any)

      // Link the new Stripe subscription ID back to billing_subscriptions
      await supabaseAdmin
        .from('billing_subscriptions')
        .update({ stripe_subscription_id: subscription.id })
        .eq('id', billingSub.id)

    } else {
      // ── Legacy subscription-mode flow: end trial immediately ─────────────
      subscription = await stripe.subscriptions.update(
        billingSub.stripe_subscription_id,
        { trial_end: 'now', proration_behavior: 'none' } as any
      )
    }

    // Get new period bounds from the subscription
    const billingFields = mapStripeToBillingSubscription(subscription)

    // Update billing_subscriptions → active
    await supabaseAdmin
      .from('billing_subscriptions')
      .update({
        billing_phase: 'active',
        billing_activated_at: now,
        stripe_subscription_id: subscription.id,
        current_period_start: billingFields.current_period_start,
        current_period_end: billingFields.current_period_end,
        updated_at: now,
      })
      .eq('id', billingSub.id)

    // Update users table
    await supabaseAdmin
      .from('users')
      .update({
        billing_phase: 'active',
        subscription_status: 'active',
        stripe_subscription_id: subscription.id,
        subscription_current_period_start: billingFields.current_period_start,
        subscription_current_period_end: billingFields.current_period_end,
      })
      .eq('id', billingSub.user_id)

    // Create initial usage bucket rows
    const { data: elder } = await supabaseAdmin
      .from('elders')
      .select('id')
      .eq('user_id', billingSub.user_id)
      .limit(1)
      .maybeSingle()

    if (billingFields.current_period_start && billingFields.current_period_end) {
      await supabaseAdmin
        .from('billing_period_usage')
        .upsert(
          {
            subscription_id: billingSub.id,
            user_id: billingSub.user_id,
            elder_id: elder?.id ?? null,
            bucket_type: 'outbound',
            period_start: billingFields.current_period_start,
            period_end: billingFields.current_period_end,
            minutes_included: billingSub.outbound_minutes_included,
            minutes_used: 0,
            overage_minutes: 0,
            overage_cost_pence: 0,
            call_count: 0,
          },
          { onConflict: 'subscription_id,bucket_type,period_start' }
        )

      if (billingSub.inbound_plan_slug) {
        await supabaseAdmin
          .from('billing_period_usage')
          .upsert(
            {
              subscription_id: billingSub.id,
              user_id: billingSub.user_id,
              elder_id: elder?.id ?? null,
              bucket_type: 'inbound',
              period_start: billingFields.current_period_start,
              period_end: billingFields.current_period_end,
              minutes_included: billingSub.inbound_minutes_included ?? 0,
              minutes_used: 0,
              overage_minutes: 0,
              overage_cost_pence: 0,
              call_count: 0,
            },
            { onConflict: 'subscription_id,bucket_type,period_start' }
          )
      }
    }

    return NextResponse.json({ success: true, billing_phase: 'active' })
  } catch (error) {
    console.error('Error activating billing:', error)
    return NextResponse.json({ error: 'Failed to activate billing' }, { status: 500 })
  }
}

/** Retrieve the default payment method ID for a Stripe customer. */
async function getCustomerDefaultPaymentMethod(customerId: string): Promise<string | undefined> {
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted) return undefined
  const pmId = customer.invoice_settings?.default_payment_method
  return typeof pmId === 'string' ? pmId : (pmId as any)?.id
}
