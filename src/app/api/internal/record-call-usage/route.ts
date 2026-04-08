import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { GRACE_PERIOD_DAYS, OVERAGE_RATE_PENCE_PER_MINUTE } from '@/config/plans'

/**
 * Internal endpoint called by the call backend after a call completes.
 * Records usage, handles trial progression, and manages overage.
 *
 * Body: { callExecutionId: string }
 *
 * Protected by checking for an internal API key in the Authorization header.
 */
export async function POST(req: NextRequest) {
  // Simple auth check for internal calls
  const authHeader = req.headers.get('authorization')
  const internalKey = process.env.INTERNAL_API_KEY
  if (internalKey && authHeader !== `Bearer ${internalKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { callExecutionId } = await req.json()

    if (!callExecutionId) {
      return NextResponse.json({ error: 'Missing callExecutionId' }, { status: 400 })
    }

    // 1. Fetch the call execution
    const { data: call, error: callError } = await supabaseAdmin
      .from('call_executions')
      .select('id, elder_id, duration, direction, completed_at')
      .eq('id', callExecutionId)
      .single()

    if (callError || !call) {
      return NextResponse.json({ error: 'Call execution not found' }, { status: 404 })
    }

    if (!call.duration || !call.direction) {
      return NextResponse.json({ error: 'Call has no duration or direction' }, { status: 400 })
    }

    const callMinutes = Math.ceil(call.duration / 60)
    const bucketType = call.direction as 'outbound' | 'inbound'

    // 2. Find the user via elder
    const { data: elder } = await supabaseAdmin
      .from('elders')
      .select('id, user_id')
      .eq('id', call.elder_id)
      .single()

    if (!elder?.user_id) {
      return NextResponse.json({ error: 'Elder not found' }, { status: 404 })
    }

    // 3. Find active billing subscription
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, active_billing_subscription_id')
      .eq('id', elder.user_id)
      .single()

    if (!user?.active_billing_subscription_id) {
      return NextResponse.json({ error: 'No active billing subscription' }, { status: 400 })
    }

    const { data: billingSub } = await supabaseAdmin
      .from('billing_subscriptions')
      .select('*')
      .eq('id', user.active_billing_subscription_id)
      .single()

    if (!billingSub) {
      return NextResponse.json({ error: 'Billing subscription not found' }, { status: 404 })
    }

    // 4. Handle trial phase
    if (billingSub.billing_phase === 'trial') {
      const newCompleted = billingSub.trial_calls_completed + 1
      const trialDone = newCompleted >= billingSub.trial_calls_required

      const updates: Record<string, any> = {
        trial_calls_completed: newCompleted,
        updated_at: new Date().toISOString(),
      }

      if (trialDone) {
        const graceEnd = new Date()
        graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS)

        updates.billing_phase = 'grace'
        updates.trial_completed_at = new Date().toISOString()
        updates.grace_period_ends_at = graceEnd.toISOString()

        // Update users table too
        await supabaseAdmin
          .from('users')
          .update({ billing_phase: 'grace' })
          .eq('id', user.id)
      }

      await supabaseAdmin
        .from('billing_subscriptions')
        .update(updates)
        .eq('id', billingSub.id)

      return NextResponse.json({
        success: true,
        trial_calls_completed: newCompleted,
        trial_done: trialDone,
        billing_phase: trialDone ? 'grace' : 'trial',
      })
    }

    // 5. Handle active phase: update usage buckets
    if (billingSub.billing_phase === 'active' && billingSub.current_period_start) {
      // Find or create usage bucket for current period
      const { data: existingBucket } = await supabaseAdmin
        .from('billing_period_usage')
        .select('*')
        .eq('subscription_id', billingSub.id)
        .eq('bucket_type', bucketType)
        .eq('period_start', billingSub.current_period_start)
        .single()

      if (existingBucket) {
        const newMinutesUsed = existingBucket.minutes_used + callMinutes
        const newCallCount = existingBucket.call_count + 1
        let newOverageMinutes = existingBucket.overage_minutes
        let newOverageCost = existingBucket.overage_cost_pence

        // Check if this pushes into overage
        if (newMinutesUsed > existingBucket.minutes_included) {
          const overageThisCall = Math.max(0, newMinutesUsed - Math.max(existingBucket.minutes_used, existingBucket.minutes_included))
          if (overageThisCall > 0 && billingSub.overage_enabled) {
            const additionalCost = overageThisCall * OVERAGE_RATE_PENCE_PER_MINUTE
            const totalOverageCost = existingBucket.overage_cost_pence + additionalCost

            // Check spend cap (applies across both buckets combined)
            const { data: allBuckets } = await supabaseAdmin
              .from('billing_period_usage')
              .select('overage_cost_pence')
              .eq('subscription_id', billingSub.id)
              .eq('period_start', billingSub.current_period_start)

            const combinedOverage = (allBuckets ?? []).reduce((sum, b) => sum + b.overage_cost_pence, 0)
              - existingBucket.overage_cost_pence + totalOverageCost

            if (combinedOverage <= billingSub.overage_spend_cap_pence) {
              newOverageMinutes = existingBucket.overage_minutes + overageThisCall
              newOverageCost = totalOverageCost
            }
          }
        }

        await supabaseAdmin
          .from('billing_period_usage')
          .update({
            minutes_used: newMinutesUsed,
            call_count: newCallCount,
            overage_minutes: newOverageMinutes,
            overage_cost_pence: newOverageCost,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingBucket.id)

        return NextResponse.json({
          success: true,
          minutes_used: newMinutesUsed,
          minutes_included: existingBucket.minutes_included,
          overage_minutes: newOverageMinutes,
        })
      }
    }

    return NextResponse.json({ success: true, note: 'No active usage bucket for current period' })
  } catch (error) {
    console.error('Error recording call usage:', error)
    return NextResponse.json(
      { error: 'Failed to record call usage' },
      { status: 500 }
    )
  }
}
