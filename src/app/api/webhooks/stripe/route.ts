import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function ensureWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set')
  }
  return secret
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  const primaryItem = subscription.items.data.at(0)

  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      subscription_plan: primaryItem?.price.nickname ?? primaryItem?.price.id ?? null,
      subscription_current_period_end: currentPeriodEnd,
      subscription_cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Failed to update subscription status in Supabase', error)
    throw error
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      subscription_status: 'canceled',
      subscription_cancel_at_period_end: false,
      subscription_current_period_end: subscription.ended_at
        ? new Date(subscription.ended_at * 1000).toISOString()
        : null,
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Failed to mark subscription as canceled', error)
    throw error
  }
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
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(subscription)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }
      case 'invoice.payment_succeeded': {
        // Reserved for future use (e.g. generating billing records or notifications)
        break
      }
      case 'invoice.payment_failed': {
        // Reserved for future use (e.g. emailing the customer)
        break
      }
      default: {
        // Ignore other events for now
        break
      }
    }
  } catch (err) {
    console.error(`Error processing Stripe event ${event.type}`, err)
    return NextResponse.json({ error: 'Failed to process webhook event' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}


