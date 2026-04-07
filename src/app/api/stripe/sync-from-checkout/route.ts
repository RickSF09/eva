import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-server'
import { createServerSupabase } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getPlanByPriceId, TRIAL_CALLS_REQUIRED, TRIAL_MINUTES_CEILING } from '@/config/plans'

export async function POST(req: NextRequest) {
  try {
    let body: { sessionId?: string } = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Missing or invalid request body' }, { status: 400 })
    }
    const { sessionId } = body

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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, stripe_customer_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 400 })
    }

    // Retrieve the checkout session with setup_intent expanded
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['setup_intent'],
    })

    if (session.mode !== 'setup') {
      return NextResponse.json({ error: 'Expected a setup-mode checkout session' }, { status: 400 })
    }

    const sessionCustomer =
      typeof session.customer === 'string' ? session.customer : session.customer?.id

    if (!sessionCustomer) {
      return NextResponse.json(
        { error: 'Checkout session missing customer information' },
        { status: 400 }
      )
    }

    // Verify this session belongs to the current user
    if (!profile.stripe_customer_id) {
      const { error: updateCustomerError } = await supabaseAdmin
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

    // Extract the SetupIntent
    const setupIntent =
      typeof session.setup_intent === 'string'
        ? await stripe.setupIntents.retrieve(session.setup_intent)
        : (session.setup_intent as import('stripe').Stripe.SetupIntent | null)

    if (!setupIntent || setupIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Setup intent is not in a completed state' },
        { status: 400 }
      )
    }

    const paymentMethodId =
      typeof setupIntent.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'No payment method found on setup intent' },
        { status: 400 }
      )
    }

    // Save the payment method as the customer's default
    await stripe.customers.update(sessionCustomer, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    // Get price_id from session metadata (set by create-checkout)
    const priceId = session.metadata?.price_id
    if (!priceId) {
      return NextResponse.json(
        { error: 'No price_id in session metadata' },
        { status: 400 }
      )
    }

    const plan = getPlanByPriceId(priceId)
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid price ID in session metadata' },
        { status: 400 }
      )
    }

    // Idempotency: skip if a trial/grace billing_subscriptions row already exists
    const { data: existingBillingSub } = await supabaseAdmin
      .from('billing_subscriptions')
      .select('id')
      .eq('user_id', profile.id)
      .in('billing_phase', ['trial', 'grace'])
      .maybeSingle()

    if (!existingBillingSub) {
      const { data: newBillingSub, error: insertError } = await supabaseAdmin
        .from('billing_subscriptions')
        .insert({
          user_id: profile.id,
          stripe_customer_id: sessionCustomer,
          outbound_plan_slug: plan.slug,
          outbound_minutes_included: plan.minutesIncluded,
          billing_phase: 'trial',
          trial_calls_required: TRIAL_CALLS_REQUIRED,
          trial_calls_completed: 0,
          trial_minutes_ceiling: TRIAL_MINUTES_CEILING,
        })
        .select('id')
        .single()

      if (insertError || !newBillingSub) {
        console.error('billing_subscriptions insert error:', insertError)
        return NextResponse.json(
          { error: 'Failed to create billing subscription record' },
          { status: 500 }
        )
      }

      // Link the new billing_subscriptions row on the user
      await supabaseAdmin
        .from('users')
        .update({ active_billing_subscription_id: newBillingSub.id })
        .eq('id', profile.id)
    }

    // Sync billing_phase on users table
    await supabaseAdmin
      .from('users')
      .update({
        billing_phase: 'trial',
        subscription_plan: plan.slug,
        subscription_status: 'trialing',
      })
      .eq('id', profile.id)

    return NextResponse.json({
      success: true,
      billingPhase: 'trial',
      plan: plan.slug,
      paymentMethodSaved: true,
    })
  } catch (err) {
    console.error('Failed to sync from Checkout session', err)
    return NextResponse.json(
      { error: 'Unexpected error while syncing checkout' },
      { status: 500 }
    )
  }
}
