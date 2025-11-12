import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { stripe } from '@/lib/stripe-server'

function getAppUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL environment variable is not set')
  }
  return baseUrl.replace(/\/$/, '')
}

export async function POST() {
  try {
    const supabase = await createServerSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('auth_user_id', user.id)
      .single()

    if (error || !profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No active subscription found for this user' },
        { status: 400 }
      )
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${getAppUrl()}/app/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Error creating billing portal session', err)
    const errorMessage = err?.message || 'Unknown error'
    const errorCode = err?.code || 'unknown'
    return NextResponse.json(
      {
        error: 'Unable to create portal session',
        details: errorMessage,
        code: errorCode,
      },
      { status: 500 }
    )
  }
}


