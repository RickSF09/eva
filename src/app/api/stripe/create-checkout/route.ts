import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { stripe } from '@/lib/stripe-server'
import { TRIAL_PERIOD_DAYS } from '@/config/plans'

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
      .select('id, stripe_customer_id, stripe_subscription_id')
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

    // Only apply trial if the user has never had a subscription
    const trialDays =
      !profile.stripe_subscription_id && TRIAL_PERIOD_DAYS > 0
        ? TRIAL_PERIOD_DAYS
        : undefined

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
        trial_period_days: trialDays,
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
    console.error('Error creating checkout session:', error)

    let message = 'Unable to create checkout session'
    if (error instanceof Error) {
      console.error('Full error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      })

      if (error.message.includes('NEXT_PUBLIC_APP_URL')) {
        message = 'Server misconfiguration: NEXT_PUBLIC_APP_URL is not set'
      } else if (error.message.includes('STRIPE_SECRET_KEY')) {
        message = 'Server misconfiguration: Stripe is not configured'
      } else if (error.message.includes('No such price')) {
        message = 'Invalid price ID. Please contact support.'
      }
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
