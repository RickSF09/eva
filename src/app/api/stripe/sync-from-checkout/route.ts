import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getPlanByPriceId } from '@/config/plans'

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Missing Stripe Checkout session ID' }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, stripe_customer_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    const sessionCustomer =
      typeof session.customer === 'string' ? session.customer : session.customer?.id

    if (!session || !sessionCustomer) {
      return NextResponse.json(
        { error: 'Checkout session missing customer information' },
        { status: 400 }
      )
    }

    if (!profile.stripe_customer_id) {
      const { error: updateCustomerError } = await supabase
        .from('users')
        .update({ stripe_customer_id: sessionCustomer })
        .eq('id', profile.id)

      if (updateCustomerError) {
        return NextResponse.json(
          { error: 'Failed to attach customer to profile' },
          { status: 500 }
        )
      }
    } else if (sessionCustomer !== profile.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Session does not belong to the current user' },
        { status: 403 }
      )
    }

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Unable to locate subscription for session' },
        { status: 404 }
      )
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    if (!subscription) {
      return NextResponse.json(
        { error: 'Unable to retrieve subscription' },
        { status: 404 }
      )
    }

    const primaryItem = subscription.items.data.at(0)
    const priceId = primaryItem?.price.id ?? null

    // Resolve the plan slug from our config; fall back to nickname, then price ID
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
      return NextResponse.json(
        { error: 'Failed to sync subscription with Supabase' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: planSlug,
        currentPeriodEnd: currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000).toISOString()
          : null,
        cancelAtPeriodEnd: cancelAtPeriodEnd ?? false,
      },
    })
  } catch (err) {
    console.error('Failed to sync subscription from Checkout session', err)
    return NextResponse.json(
      { error: 'Unexpected error while syncing subscription' },
      { status: 500 }
    )
  }
}
