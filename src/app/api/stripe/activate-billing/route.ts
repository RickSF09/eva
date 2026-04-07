import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { mapStripeToBillingSubscription } from '@/lib/stripe-subscription'

/**
 * Activate billing: resume the paused Stripe subscription and anchor
 * the first real billing cycle from now. Called when:
 * - Grace period expires (via cron/edge function)
 * - User explicitly confirms plan (via /api/stripe/confirm-plan)
 *
 * Accepts either { billingSubscriptionId } or { userId } in the body.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { billingSubscriptionId, userId } = body

    // Find the billing subscription
    let query = supabaseAdmin
      .from('billing_subscriptions')
      .select('*')

    if (billingSubscriptionId) {
      query = query.eq('id', billingSubscriptionId)
    } else if (userId) {
      query = query.eq('user_id', userId).in('billing_phase', ['grace', 'trial'])
    } else {
      return NextResponse.json({ error: 'Missing billingSubscriptionId or userId' }, { status: 400 })
    }

    const { data: billingSub, error: fetchError } = await query.single()

    if (fetchError || !billingSub) {
      return NextResponse.json({ error: 'Billing subscription not found' }, { status: 404 })
    }

    if (billingSub.billing_phase === 'active') {
      return NextResponse.json({ message: 'Billing already active' })
    }

    if (!billingSub.stripe_subscription_id) {
      return NextResponse.json({ error: 'No Stripe subscription linked' }, { status: 400 })
    }

    // End the Stripe trial now — this starts real billing immediately.
    // The 60-day trial ceiling in checkout was just to show £0 due today;
    // we always end it programmatically here rather than letting it expire.
    const subscription = await stripe.subscriptions.update(billingSub.stripe_subscription_id, {
      trial_end: 'now',
      proration_behavior: 'none',
    } as any)

    // 3. Get new period bounds
    const billingFields = mapStripeToBillingSubscription(subscription)

    // 4. Update billing_subscriptions
    const now = new Date().toISOString()
    await supabaseAdmin
      .from('billing_subscriptions')
      .update({
        billing_phase: 'active',
        billing_activated_at: now,
        current_period_start: billingFields.current_period_start,
        current_period_end: billingFields.current_period_end,
        updated_at: now,
      })
      .eq('id', billingSub.id)

    // 5. Update users table
    await supabaseAdmin
      .from('users')
      .update({ billing_phase: 'active' })
      .eq('id', billingSub.user_id)

    // 6. Create initial usage bucket rows
    const { data: elder } = await supabaseAdmin
      .from('elders')
      .select('id')
      .eq('user_id', billingSub.user_id)
      .limit(1)
      .single()

    if (billingFields.current_period_start && billingFields.current_period_end) {
      await supabaseAdmin
        .from('billing_period_usage')
        .upsert({
          subscription_id: billingSub.id,
          user_id: billingSub.user_id,
          elder_id: elder?.id ?? null,
          bucket_type: 'outbound',
          period_start: billingFields.current_period_start,
          period_end: billingFields.current_period_end,
          minutes_included: billingSub.outbound_minutes_included,
        }, { onConflict: 'subscription_id,bucket_type,period_start' })

      if (billingSub.inbound_plan_slug) {
        await supabaseAdmin
          .from('billing_period_usage')
          .upsert({
            subscription_id: billingSub.id,
            user_id: billingSub.user_id,
            elder_id: elder?.id ?? null,
            bucket_type: 'inbound',
            period_start: billingFields.current_period_start,
            period_end: billingFields.current_period_end,
            minutes_included: billingSub.inbound_minutes_included,
          }, { onConflict: 'subscription_id,bucket_type,period_start' })
      }
    }

    return NextResponse.json({ success: true, billing_phase: 'active' })
  } catch (error) {
    console.error('Error activating billing:', error)
    return NextResponse.json(
      { error: 'Failed to activate billing' },
      { status: 500 }
    )
  }
}
