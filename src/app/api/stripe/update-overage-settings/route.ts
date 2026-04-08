import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Enable/disable pay-as-you-go overage or update the spend cap.
 * Body: { enabled: boolean, spendCapPence?: number }
 *
 * Overage is tracked app-side and billed via invoice items at cycle end.
 * No Stripe metered subscription item needed.
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

    const { enabled, spendCapPence } = await req.json()

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Missing enabled flag' }, { status: 400 })
    }

    if (enabled && (typeof spendCapPence !== 'number' || spendCapPence <= 0)) {
      return NextResponse.json({ error: 'Spend cap must be a positive number' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, active_billing_subscription_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile?.active_billing_subscription_id) {
      return NextResponse.json({ error: 'No active billing subscription' }, { status: 400 })
    }

    await supabaseAdmin
      .from('billing_subscriptions')
      .update({
        overage_enabled: enabled,
        overage_spend_cap_pence: enabled ? spendCapPence : 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.active_billing_subscription_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating overage settings:', error)
    return NextResponse.json(
      { error: 'Failed to update overage settings' },
      { status: 500 }
    )
  }
}
