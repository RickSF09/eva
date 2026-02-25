import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-server'
import { createServerSupabase } from '@/lib/supabase-server'
import { mapStripeSubscriptionToUserFields } from '@/lib/stripe-subscription'

/**
 * Re-fetches the user's subscription from Stripe and updates Supabase.
 * Use when webhooks missed an update or period bounds are stale/missing.
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

    const updatePayload = mapStripeSubscriptionToUserFields(subscription)

    const { error: updateError } = await supabase
      .from('users')
      .update(updatePayload)
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
        status: updatePayload.subscription_status,
        plan: updatePayload.subscription_plan,
        currentPeriodStart: updatePayload.subscription_current_period_start,
        currentPeriodEnd: updatePayload.subscription_current_period_end,
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
