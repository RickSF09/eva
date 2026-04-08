import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

/**
 * User explicitly confirms their plan during the grace period,
 * short-circuiting the grace timer. Delegates to activate-billing.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, billing_phase')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (profile.billing_phase !== 'grace') {
      return NextResponse.json({ error: 'Not in grace period' }, { status: 400 })
    }

    // Call activate-billing internally
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/stripe/activate-billing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile.id }),
    })

    const result = await response.json()

    if (!response.ok) {
      return NextResponse.json(result, { status: response.status })
    }

    return NextResponse.json({ success: true, billing_phase: 'active' })
  } catch (error) {
    console.error('Error confirming plan:', error)
    return NextResponse.json(
      { error: 'Failed to confirm plan' },
      { status: 500 }
    )
  }
}
