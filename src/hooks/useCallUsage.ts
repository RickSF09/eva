'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import type { BillingPhase } from '@/config/plans'

// -- Types ---------------------------------------------------------------

export interface BucketUsage {
  minutesUsed: number
  minutesIncluded: number
  minutesRemaining: number
  usagePercent: number
  overageMinutes: number
  overageCostPence: number
  callCount: number
  periodStart: string | null
  periodEnd: string | null
}

export interface BillingSubscriptionInfo {
  id: string
  outbound_plan_slug: string
  outbound_minutes_included: number
  inbound_plan_slug: string | null
  inbound_minutes_included: number
  overage_enabled: boolean
  overage_spend_cap_pence: number
  trial_calls_required: number
  trial_calls_completed: number
  trial_minutes_ceiling: number
  grace_period_ends_at: string | null
  billing_activated_at: string | null
  current_period_start: string | null
  current_period_end: string | null
}

export interface CallUsageV2 {
  billingPhase: BillingPhase
  outbound: BucketUsage | null
  inbound: BucketUsage | null
  subscription: BillingSubscriptionInfo | null
}

// -- Legacy interface (kept for backward-compatible consumers) -----------

export interface CallUsage {
  minutesUsed: number
  minutesIncluded: number
  minutesRemaining: number
  usagePercent: number
  isTrial: boolean
  periodStart: string | null
  periodEnd: string | null
  callCount: number
}

// -- Defaults ------------------------------------------------------------

const DEFAULT_V2: CallUsageV2 = {
  billingPhase: 'none',
  outbound: null,
  inbound: null,
  subscription: null,
}

const DEFAULT_USAGE: CallUsage = {
  minutesUsed: 0,
  minutesIncluded: 0,
  minutesRemaining: 0,
  usagePercent: 0,
  isTrial: false,
  periodStart: null,
  periodEnd: null,
  callCount: 0,
}

// -- Hook ----------------------------------------------------------------

export function useCallUsage() {
  const { user } = useAuth()
  const [v2, setV2] = useState<CallUsageV2>(DEFAULT_V2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsage = useCallback(async () => {
    if (!user) {
      setV2(DEFAULT_V2)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/billing/usage')
      if (!res.ok) throw new Error('Failed to fetch billing usage')

      const data = await res.json()
      setV2({
        billingPhase: data.billing_phase ?? 'none',
        outbound: data.outbound ?? null,
        inbound: data.inbound ?? null,
        subscription: data.subscription ?? null,
      })
    } catch (err) {
      console.error('Failed to fetch call usage', err)
      setError('Unable to load usage data')
      setV2(DEFAULT_V2)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  // Build a legacy-compatible `usage` object from the V2 data
  const usage: CallUsage = v2.outbound
    ? {
        minutesUsed: v2.outbound.minutesUsed,
        minutesIncluded: v2.outbound.minutesIncluded,
        minutesRemaining: v2.outbound.minutesRemaining,
        usagePercent: v2.outbound.usagePercent,
        isTrial: v2.billingPhase === 'trial',
        periodStart: v2.outbound.periodStart,
        periodEnd: v2.outbound.periodEnd,
        callCount: v2.outbound.callCount,
      }
    : {
        ...DEFAULT_USAGE,
        isTrial: v2.billingPhase === 'trial',
        minutesIncluded: v2.subscription?.outbound_minutes_included ?? 0,
        minutesRemaining: v2.subscription?.outbound_minutes_included ?? 0,
      }

  return { usage, v2, loading, error, refresh: fetchUsage }
}
