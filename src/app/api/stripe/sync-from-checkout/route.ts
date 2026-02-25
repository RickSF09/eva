import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-server'
import { createServerSupabase } from '@/lib/supabase-server'
import { mapStripeSubscriptionToUserFields } from '@/lib/stripe-subscription'

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

    const updatePayload = mapStripeSubscriptionToUserFields(subscription)

    const { error: updateError } = await supabase
      .from('users')
      .update(updatePayload)
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
        status: updatePayload.subscription_status,
        plan: updatePayload.subscription_plan,
        currentPeriodStart: updatePayload.subscription_current_period_start,
        currentPeriodEnd: updatePayload.subscription_current_period_end,
        cancelAtPeriodEnd: updatePayload.subscription_cancel_at_period_end,
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
