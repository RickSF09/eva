import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getPlanByPriceId } from '@/config/plans'

/**
 * Re-fetches the user's subscription from Stripe and updates Supabase.
 * Use when webhooks missed an update or subscription_current_period_end is null.
 */
export async function POST() {
  try {
    const supabase = await createServerSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, stripe_subscription_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 400 })
    }

    if (!profile.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No subscription to sync' },
        { status: 400 }
      )
    }

    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found in Stripe' },
        { status: 404 }
      )
    }

    const primaryItem = subscription.items.data.at(0)
    const priceId = primaryItem?.price.id ?? null

    const configPlan = getPlanByPriceId(priceId)
    const planSlug = configPlan?.slug ?? primaryItem?.price.nickname ?? priceId

    // Stripe API 2026: current_period_end moved from Subscription to SubscriptionItem
    const currentPeriodEnd =
      primaryItem?.current_period_end ??
      (subscription as { current_period_end?: number }).current_period_end
    const cancelAtPeriodEnd = (subscription as any).cancel_at_period_end as boolean | undefined

    const { error: updateError } = await supabase
      .from('users')
      .update({
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        subscription_plan: planSlug,
        subscription_current_period_end: currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000).toISOString()
          : null,
        subscription_cancel_at_period_end: cancelAtPeriodEnd ?? false,
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('Failed to sync subscription to Supabase', updateError)
      return NextResponse.json(
        { error: 'Failed to sync subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: planSlug,
        currentPeriodEnd: currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000).toISOString()
          : null,
      },
    })
  } catch (err) {
    console.error('Error syncing subscription from Stripe', err)
    return NextResponse.json(
      { error: 'Unable to sync subscription' },
      { status: 500 }
    )
  }
}
