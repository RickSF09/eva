import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { stripe } from '@/lib/stripe-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getInboundPlanBySlug } from '@/config/plans'

/**
 * Enable, change, or disable the inbound calling add-on.
 * Body: { action: 'enable' | 'change' | 'disable', inboundPlanSlug?: string }
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

    const { action, inboundPlanSlug } = await req.json()

    if (!['enable', 'change', 'disable'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Get user profile and billing subscription
    const { data: profile } = await supabase
      .from('users')
      .select('id, active_billing_subscription_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile?.active_billing_subscription_id) {
      return NextResponse.json({ error: 'No active billing subscription' }, { status: 400 })
    }

    const { data: billingSub } = await supabaseAdmin
      .from('billing_subscriptions')
      .select('*')
      .eq('id', profile.active_billing_subscription_id)
      .single()

    if (!billingSub?.stripe_subscription_id) {
      return NextResponse.json({ error: 'Billing subscription not found' }, { status: 404 })
    }

    if (action === 'enable' || action === 'change') {
      if (!inboundPlanSlug) {
        return NextResponse.json({ error: 'Missing inboundPlanSlug' }, { status: 400 })
      }

      const inboundPlan = getInboundPlanBySlug(inboundPlanSlug)
      if (!inboundPlan) {
        return NextResponse.json({ error: 'Invalid inbound plan' }, { status: 400 })
      }

      if (action === 'enable' && !billingSub.inbound_stripe_item_id) {
        // Add new subscription item
        const item = await stripe.subscriptionItems.create({
          subscription: billingSub.stripe_subscription_id,
          price: inboundPlan.stripePriceId,
          proration_behavior: 'create_prorations',
        })

        await supabaseAdmin
          .from('billing_subscriptions')
          .update({
            inbound_plan_slug: inboundPlan.slug,
            inbound_minutes_included: inboundPlan.minutesIncluded,
            inbound_stripe_item_id: item.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', billingSub.id)
      } else if (action === 'change' && billingSub.inbound_stripe_item_id) {
        // Update existing item's price
        await stripe.subscriptionItems.update(billingSub.inbound_stripe_item_id, {
          price: inboundPlan.stripePriceId,
          proration_behavior: 'create_prorations',
        })

        await supabaseAdmin
          .from('billing_subscriptions')
          .update({
            inbound_plan_slug: inboundPlan.slug,
            inbound_minutes_included: inboundPlan.minutesIncluded,
            updated_at: new Date().toISOString(),
          })
          .eq('id', billingSub.id)
      } else {
        return NextResponse.json({ error: 'Invalid action for current state' }, { status: 400 })
      }
    } else if (action === 'disable') {
      if (!billingSub.inbound_stripe_item_id) {
        return NextResponse.json({ error: 'Inbound add-on not enabled' }, { status: 400 })
      }

      await stripe.subscriptionItems.del(billingSub.inbound_stripe_item_id, {
        proration_behavior: 'create_prorations',
      })

      await supabaseAdmin
        .from('billing_subscriptions')
        .update({
          inbound_plan_slug: null,
          inbound_minutes_included: 0,
          inbound_stripe_item_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', billingSub.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating inbound add-on:', error)
    return NextResponse.json(
      { error: 'Failed to update inbound add-on' },
      { status: 500 }
    )
  }
}
