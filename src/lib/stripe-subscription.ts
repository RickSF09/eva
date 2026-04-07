import Stripe from 'stripe'
import { getPlanByPriceId, getInboundPlanByPriceId } from '@/config/plans'

type StripeSubscriptionWithLegacyPeriod = Stripe.Subscription & {
  current_period_start?: number
  current_period_end?: number
}

// -- Legacy mapping (keeps existing users table columns in sync) ------

export interface StripeSubscriptionUserFields {
  stripe_subscription_id: string
  subscription_status: string
  subscription_plan: string | null
  subscription_current_period_start: string | null
  subscription_current_period_end: string | null
  subscription_cancel_at_period_end: boolean
}

/**
 * Normalize a Stripe subscription into the user columns we persist in Supabase.
 * This keeps the legacy users table columns in sync for backend compatibility.
 */
export function mapStripeSubscriptionToUserFields(
  subscription: Stripe.Subscription
): StripeSubscriptionUserFields {
  const { outboundItem } = classifySubscriptionItems(subscription)
  const priceId = outboundItem?.price.id ?? null

  const configPlan = getPlanByPriceId(priceId)
  const planSlug = configPlan?.slug ?? outboundItem?.price.nickname ?? priceId

  // Stripe API 2026: current_period_start/end moved from Subscription to SubscriptionItem.
  const legacySubscription = subscription as StripeSubscriptionWithLegacyPeriod
  const currentPeriodStart = outboundItem?.current_period_start ?? legacySubscription.current_period_start
  const currentPeriodEnd = outboundItem?.current_period_end ?? legacySubscription.current_period_end
  const cancelAtPeriodEnd = (subscription as any).cancel_at_period_end as boolean | undefined

  return {
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    subscription_plan: planSlug,
    subscription_current_period_start: currentPeriodStart
      ? new Date(currentPeriodStart * 1000).toISOString()
      : null,
    subscription_current_period_end: currentPeriodEnd
      ? new Date(currentPeriodEnd * 1000).toISOString()
      : null,
    subscription_cancel_at_period_end: cancelAtPeriodEnd ?? false,
  }
}

// -- Multi-item subscription mapping (billing_subscriptions table) ----

export interface ClassifiedItems {
  outboundItem: Stripe.SubscriptionItem | null
  inboundItem: Stripe.SubscriptionItem | null
}

/**
 * Classify subscription items into outbound (main plan) and inbound (add-on).
 * The outbound item matches one of the PLANS price IDs.
 * The inbound item matches one of the INBOUND_PLANS price IDs.
 */
export function classifySubscriptionItems(
  subscription: Stripe.Subscription
): ClassifiedItems {
  let outboundItem: Stripe.SubscriptionItem | null = null
  let inboundItem: Stripe.SubscriptionItem | null = null

  for (const item of subscription.items.data) {
    const priceId = item.price.id
    if (getPlanByPriceId(priceId)) {
      outboundItem = item
    } else if (getInboundPlanByPriceId(priceId)) {
      inboundItem = item
    }
  }

  // Fallback: if no outbound item matched config, use the first item
  if (!outboundItem && subscription.items.data.length > 0) {
    outboundItem = subscription.items.data[0]
  }

  return { outboundItem, inboundItem }
}

export interface BillingSubscriptionFields {
  stripe_subscription_id: string
  stripe_customer_id: string
  outbound_plan_slug: string | null
  outbound_minutes_included: number
  inbound_plan_slug: string | null
  inbound_minutes_included: number
  inbound_stripe_item_id: string | null
  current_period_start: string | null
  current_period_end: string | null
}

/**
 * Map a Stripe subscription into fields for the billing_subscriptions table.
 */
export function mapStripeToBillingSubscription(
  subscription: Stripe.Subscription
): BillingSubscriptionFields {
  const { outboundItem, inboundItem } = classifySubscriptionItems(subscription)
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id

  const outboundPlan = getPlanByPriceId(outboundItem?.price.id ?? null)
  const inboundPlan = getInboundPlanByPriceId(inboundItem?.price.id ?? null)

  const legacySubscription = subscription as StripeSubscriptionWithLegacyPeriod
  const periodStart = outboundItem?.current_period_start ?? legacySubscription.current_period_start
  const periodEnd = outboundItem?.current_period_end ?? legacySubscription.current_period_end

  return {
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    outbound_plan_slug: outboundPlan?.slug ?? null,
    outbound_minutes_included: outboundPlan?.minutesIncluded ?? 0,
    inbound_plan_slug: inboundPlan?.slug ?? null,
    inbound_minutes_included: inboundPlan?.minutesIncluded ?? 0,
    inbound_stripe_item_id: inboundItem?.id ?? null,
    current_period_start: periodStart
      ? new Date(periodStart * 1000).toISOString()
      : null,
    current_period_end: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
  }
}
