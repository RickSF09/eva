import Stripe from 'stripe'
import { getPlanByPriceId } from '@/config/plans'

type StripeSubscriptionWithLegacyPeriod = Stripe.Subscription & {
  current_period_start?: number
  current_period_end?: number
}

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
 */
export function mapStripeSubscriptionToUserFields(
  subscription: Stripe.Subscription
): StripeSubscriptionUserFields {
  const primaryItem = subscription.items.data.at(0)
  const priceId = primaryItem?.price.id ?? null

  const configPlan = getPlanByPriceId(priceId)
  const planSlug = configPlan?.slug ?? primaryItem?.price.nickname ?? priceId

  // Stripe API 2026: current_period_start/end moved from Subscription to SubscriptionItem.
  const legacySubscription = subscription as StripeSubscriptionWithLegacyPeriod
  const currentPeriodStart = primaryItem?.current_period_start ?? legacySubscription.current_period_start
  const currentPeriodEnd = primaryItem?.current_period_end ?? legacySubscription.current_period_end
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

