import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  mapStripeSubscriptionToUserFields,
  mapStripeToBillingSubscription,
} from '@/lib/stripe-subscription'
import { getPlanByPriceId } from '@/config/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function ensureWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set')
  }
  return secret
}

/**
 * Sync legacy users table columns so the backend keeps working.
 */
async function syncLegacyUserFields(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id
  const updatePayload = mapStripeSubscriptionToUserFields(subscription)

  const { error } = await supabaseAdmin
    .from('users')
    .update(updatePayload)
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Failed to update legacy user subscription fields', error)
    throw error
  }
}

/**
 * Handle new subscription: create billing_subscriptions row, pause for trial.
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  // 1. Sync legacy fields
  await syncLegacyUserFields(subscription)

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id

  // 2. Find the user
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (userError || !user) {
    console.error('No user found for Stripe customer', customerId, userError)
    throw userError ?? new Error('User not found')
  }

  // 3. Map subscription items
  const billingFields = mapStripeToBillingSubscription(subscription)
  const outboundPlan = getPlanByPriceId(
    subscription.items.data.find(i => getPlanByPriceId(i.price.id))?.price.id ?? null
  )

  // 4. Create billing_subscriptions row
  const { data: billingSub, error: insertError } = await supabaseAdmin
    .from('billing_subscriptions')
    .insert({
      user_id: user.id,
      stripe_subscription_id: billingFields.stripe_subscription_id,
      stripe_customer_id: billingFields.stripe_customer_id,
      outbound_plan_slug: billingFields.outbound_plan_slug ?? 'essential',
      outbound_minutes_included: outboundPlan?.minutesIncluded ?? 0,
      billing_phase: 'trial',
      trial_calls_required: 5,
      trial_calls_completed: 0,
      trial_minutes_ceiling: 90,
      current_period_start: billingFields.current_period_start,
      current_period_end: billingFields.current_period_end,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('Failed to create billing_subscriptions row', insertError)
    throw insertError
  }

  // 5. Link user to the billing subscription
  await supabaseAdmin
    .from('users')
    .update({
      active_billing_subscription_id: billingSub.id,
      billing_phase: 'trial',
    })
    .eq('id', user.id)

  // 6. Pause billing (no charge during trial)
  try {
    await stripe.subscriptions.update(subscription.id, {
      pause_collection: { behavior: 'void' },
    })
  } catch (pauseError) {
    console.error('Failed to pause subscription for trial', pauseError)
    // Non-fatal: subscription still exists, we can retry
  }
}

/**
 * Handle subscription updates (plan changes, item additions/removals).
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // 1. Sync legacy fields
  await syncLegacyUserFields(subscription)

  // 2. Update billing_subscriptions if it exists
  const billingFields = mapStripeToBillingSubscription(subscription)
  const outboundPlan = getPlanByPriceId(
    subscription.items.data.find(i => getPlanByPriceId(i.price.id))?.price.id ?? null
  )

  const { error } = await supabaseAdmin
    .from('billing_subscriptions')
    .update({
      outbound_plan_slug: billingFields.outbound_plan_slug ?? undefined,
      outbound_minutes_included: outboundPlan?.minutesIncluded ?? undefined,
      inbound_plan_slug: billingFields.inbound_plan_slug,
      inbound_minutes_included: billingFields.inbound_minutes_included,
      inbound_stripe_item_id: billingFields.inbound_stripe_item_id,
      current_period_start: billingFields.current_period_start,
      current_period_end: billingFields.current_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Failed to update billing_subscriptions', error)
    // Non-fatal: legacy fields were already synced
  }
}

/**
 * Handle subscription deletion.
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id
  const endedAt = (subscription as any).ended_at as number | undefined

  // 1. Update legacy user fields
  const { error: userError } = await supabaseAdmin
    .from('users')
    .update({
      subscription_status: 'canceled',
      subscription_cancel_at_period_end: false,
      subscription_current_period_start: null,
      subscription_current_period_end: endedAt
        ? new Date(endedAt * 1000).toISOString()
        : null,
      billing_phase: 'canceled',
    })
    .eq('stripe_customer_id', customerId)

  if (userError) {
    console.error('Failed to mark subscription as canceled on users', userError)
  }

  // 2. Update billing_subscriptions
  const { error: billingError } = await supabaseAdmin
    .from('billing_subscriptions')
    .update({
      billing_phase: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (billingError) {
    console.error('Failed to mark billing_subscription as canceled', billingError)
  }
}

/**
 * Handle successful payment: create usage bucket rows for the new billing period.
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Stripe API 2026: invoice.subscription is now just a string ID (or null).
  const subscriptionId = (invoice as any).subscription as string | null

  if (!subscriptionId) return

  // Find the billing subscription
  const { data: billingSub } = await supabaseAdmin
    .from('billing_subscriptions')
    .select('id, user_id, outbound_plan_slug, outbound_minutes_included, inbound_plan_slug, inbound_minutes_included, billing_phase')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!billingSub || billingSub.billing_phase !== 'active') return

  // Find elder for this user
  const { data: elder } = await supabaseAdmin
    .from('elders')
    .select('id')
    .eq('user_id', billingSub.user_id)
    .limit(1)
    .single()

  // Fetch the subscription to get period bounds
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const billingFields = mapStripeToBillingSubscription(subscription)

  if (!billingFields.current_period_start || !billingFields.current_period_end) return

  // Create outbound usage bucket
  await supabaseAdmin
    .from('billing_period_usage')
    .upsert({
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
    }, { onConflict: 'subscription_id,bucket_type,period_start' })

  // Create inbound usage bucket if add-on is enabled
  if (billingSub.inbound_plan_slug) {
    await supabaseAdmin
      .from('billing_period_usage')
      .upsert({
        subscription_id: billingSub.id,
        user_id: billingSub.user_id,
        elder_id: elder?.id ?? null,
        bucket_type: 'inbound',
        period_start: billingFields.current_period_start,
        period_end: billingFields.current_period_end,
        minutes_included: billingSub.inbound_minutes_included,
        minutes_used: 0,
        overage_minutes: 0,
        overage_cost_pence: 0,
        call_count: 0,
      }, { onConflict: 'subscription_id,bucket_type,period_start' })
  }

  // Update period on billing_subscriptions
  await supabaseAdmin
    .from('billing_subscriptions')
    .update({
      current_period_start: billingFields.current_period_start,
      current_period_end: billingFields.current_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('id', billingSub.id)
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const body = await req.text()
    event = stripe.webhooks.constructEvent(body, signature, ensureWebhookSecret())
  } catch (err) {
    console.error('Failed to verify Stripe webhook', err)
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCreated(subscription)
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentSucceeded(invoice)
        break
      }
      case 'invoice.payment_failed': {
        // TODO: Send payment failure notification to user
        break
      }
      default: {
        break
      }
    }
  } catch (err) {
    console.error(`Error processing Stripe event ${event.type}`, err)
    return NextResponse.json({ error: 'Failed to process webhook event' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
