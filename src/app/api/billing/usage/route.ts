import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

/**
 * GET /api/billing/usage
 * Returns current usage for both outbound and inbound buckets,
 * plus billing subscription metadata.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with billing subscription
    const { data: profile } = await supabase
      .from('users')
      .select('id, active_billing_subscription_id, billing_phase')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile?.active_billing_subscription_id) {
      return NextResponse.json({
        billing_phase: profile?.billing_phase ?? 'none',
        outbound: null,
        inbound: null,
        subscription: null,
      })
    }

    // Get billing subscription
    const { data: billingSub } = await supabase
      .from('billing_subscriptions')
      .select('*')
      .eq('id', profile.active_billing_subscription_id)
      .single()

    if (!billingSub) {
      return NextResponse.json({
        billing_phase: profile.billing_phase ?? 'none',
        outbound: null,
        inbound: null,
        subscription: null,
      })
    }

    // Get current period usage buckets
    let outbound = null
    let inbound = null

    if (billingSub.current_period_start) {
      const { data: buckets } = await supabase
        .from('billing_period_usage')
        .select('*')
        .eq('subscription_id', billingSub.id)
        .eq('period_start', billingSub.current_period_start)

      for (const bucket of buckets ?? []) {
        const usage = {
          minutesUsed: bucket.minutes_used,
          minutesIncluded: bucket.minutes_included,
          minutesRemaining: Math.max(0, bucket.minutes_included - bucket.minutes_used),
          usagePercent: bucket.minutes_included > 0
            ? Math.min(100, Math.round((bucket.minutes_used / bucket.minutes_included) * 100))
            : 0,
          overageMinutes: bucket.overage_minutes,
          overageCostPence: bucket.overage_cost_pence,
          callCount: bucket.call_count,
          periodStart: bucket.period_start,
          periodEnd: bucket.period_end,
        }

        if (bucket.bucket_type === 'outbound') outbound = usage
        if (bucket.bucket_type === 'inbound') inbound = usage
      }
    }

    return NextResponse.json({
      billing_phase: billingSub.billing_phase,
      outbound,
      inbound,
      subscription: {
        id: billingSub.id,
        outbound_plan_slug: billingSub.outbound_plan_slug,
        outbound_minutes_included: billingSub.outbound_minutes_included,
        inbound_plan_slug: billingSub.inbound_plan_slug,
        inbound_minutes_included: billingSub.inbound_minutes_included,
        overage_enabled: billingSub.overage_enabled,
        overage_spend_cap_pence: billingSub.overage_spend_cap_pence,
        trial_calls_required: billingSub.trial_calls_required,
        trial_calls_completed: billingSub.trial_calls_completed,
        trial_minutes_ceiling: billingSub.trial_minutes_ceiling,
        grace_period_ends_at: billingSub.grace_period_ends_at,
        billing_activated_at: billingSub.billing_activated_at,
        current_period_start: billingSub.current_period_start,
        current_period_end: billingSub.current_period_end,
      },
    })
  } catch (error) {
    console.error('Error fetching billing usage:', error)
    return NextResponse.json(
      { error: 'Failed to fetch billing usage' },
      { status: 500 }
    )
  }
}
