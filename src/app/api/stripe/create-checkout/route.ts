import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { stripe } from '@/lib/stripe-server'

const successPath = '/app/settings?billing=success'
const canceledPath = '/app/settings?billing=cancelled'

function getAppUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL environment variable is not set')
  }
  return baseUrl.replace(/\/$/, '')
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { priceId } = await req.json()

    if (!priceId || typeof priceId !== 'string') {
      return NextResponse.json({ error: 'Missing Stripe price ID' }, { status: 400 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, stripe_customer_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 400 })
    }

    let customerId = profile.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          supabase_user_id: profile.id,
          auth_user_id: user.id,
        },
      })
      customerId = customer.id

      const { error: updateError } = await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', profile.id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to persist Stripe customer ID' }, { status: 500 })
      }
    }

    const trialPeriodDays = parseInt(
      process.env.STRIPE_TRIAL_PERIOD_DAYS ??
        process.env.NEXT_PUBLIC_STRIPE_TRIAL_PERIOD_DAYS ??
        '0',
      10
    )

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${getAppUrl()}${successPath}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getAppUrl()}${canceledPath}`,
      subscription_data: {
        trial_period_days: Number.isFinite(trialPeriodDays) && trialPeriodDays > 0 ? trialPeriodDays : undefined,
        metadata: {
          supabase_user_id: profile.id,
        },
      },
      metadata: {
        supabase_user_id: profile.id,
        auth_user_id: user.id,
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Error creating checkout session', error)
    return NextResponse.json(
      { error: 'Unable to create checkout session' },
      { status: 500 }
    )
  }
}


