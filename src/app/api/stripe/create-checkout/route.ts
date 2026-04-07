import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { stripe } from '@/lib/stripe-server'
import { getPlanByPriceId } from '@/config/plans'

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

    const plan = getPlanByPriceId(priceId)
    if (!plan) {
      return NextResponse.json({ error: 'Invalid price ID. Please contact support.' }, { status: 400 })
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

    // Use setup mode — collect card details with £0 shown, no trial duration displayed.
    // A Stripe subscription is created programmatically in /api/stripe/activate-billing
    // once the 5 trial calls + 3-day grace period are complete.
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'setup',
      currency: 'gbp',
      locale: 'en-GB',
      success_url: `${getAppUrl()}${successPath}&session_id={CHECKOUT_SESSION_ID}&price_id=${priceId}`,
      cancel_url: `${getAppUrl()}${canceledPath}`,
      metadata: {
        supabase_user_id: profile.id,
        auth_user_id: user.id,
        price_id: priceId,
        plan_slug: plan.slug,
      },
    } as any)

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)

    let message = 'Unable to create checkout session'
    if (error instanceof Error) {
      if (error.message.includes('NEXT_PUBLIC_APP_URL')) {
        message = 'Server misconfiguration: NEXT_PUBLIC_APP_URL is not set'
      } else if (error.message.includes('STRIPE_SECRET_KEY')) {
        message = 'Server misconfiguration: Stripe is not configured'
      }
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
