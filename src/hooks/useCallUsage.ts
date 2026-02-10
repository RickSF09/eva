'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { getMinutesForPlan, TRIAL_MINUTES } from '@/config/plans'

export interface CallUsage {
  /** Total minutes used in the current billing period (rounded up per call). */
  minutesUsed: number
  /** Total minutes included in the plan (or trial). */
  minutesIncluded: number
  /** Minutes remaining (never negative). */
  minutesRemaining: number
  /** Usage as a percentage (0-100, capped at 100). */
  usagePercent: number
  /** Whether the user is on a trial. */
  isTrial: boolean
  /** Billing period start (ISO string). */
  periodStart: string | null
  /** Billing period end (ISO string). */
  periodEnd: string | null
  /** Number of calls in this period. */
  callCount: number
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

export function useCallUsage() {
  const { user } = useAuth()
  const [usage, setUsage] = useState<CallUsage>(DEFAULT_USAGE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsage = useCallback(async () => {
    if (!user) {
      setUsage(DEFAULT_USAGE)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Get user's subscription info and elder ID
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select(`
          id,
          subscription_status,
          subscription_plan,
          subscription_current_period_end,
          stripe_subscription_id
        `)
        .eq('auth_user_id', user.id)
        .single()

      if (profileError || !profile) {
        throw profileError ?? new Error('Profile not found')
      }

      // If no subscription, return defaults
      if (!profile.stripe_subscription_id) {
        setUsage(DEFAULT_USAGE)
        setLoading(false)
        return
      }

      // 2. Get the elder associated with this user
      const { data: elder, error: elderError } = await supabase
        .from('elders')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle()

      if (elderError) {
        throw elderError
      }

      // If no elder, can't calculate usage
      if (!elder) {
        const isTrial = profile.subscription_status === 'trialing'
        const minutesIncluded = getMinutesForPlan(profile.subscription_plan, isTrial)
        setUsage({
          ...DEFAULT_USAGE,
          minutesIncluded,
          minutesRemaining: minutesIncluded,
          isTrial,
          periodEnd: profile.subscription_current_period_end,
        })
        setLoading(false)
        return
      }

      // 3. Calculate billing period
      const periodEnd = profile.subscription_current_period_end
        ? new Date(profile.subscription_current_period_end)
        : new Date()

      // Period start is 30 days before period end (monthly billing)
      const periodStart = new Date(periodEnd)
      periodStart.setDate(periodStart.getDate() - 30)

      // 4. Query call executions for this elder in the billing period
      const { data: executions, error: execError } = await supabase
        .from('call_executions')
        .select('duration')
        .eq('elder_id', elder.id)
        .gte('completed_at', periodStart.toISOString())
        .lte('completed_at', periodEnd.toISOString())
        .not('duration', 'is', null)

      if (execError) {
        throw execError
      }

      // 5. Calculate total minutes used (round up each call's duration)
      const totalSeconds = (executions ?? []).reduce(
        (sum, e) => sum + (typeof e.duration === 'number' ? e.duration : 0),
        0
      )
      // Convert to minutes, rounding up to the nearest minute
      const minutesUsed = Math.ceil(totalSeconds / 60)

      // 6. Get minutes included based on plan
      const isTrial = profile.subscription_status === 'trialing'
      const minutesIncluded = getMinutesForPlan(profile.subscription_plan, isTrial)

      // 7. Calculate remaining and percentage
      const minutesRemaining = Math.max(0, minutesIncluded - minutesUsed)
      const usagePercent = minutesIncluded > 0
        ? Math.min(100, Math.round((minutesUsed / minutesIncluded) * 100))
        : 0

      setUsage({
        minutesUsed,
        minutesIncluded,
        minutesRemaining,
        usagePercent,
        isTrial,
        periodStart: periodStart.toISOString(),
        periodEnd: profile.subscription_current_period_end,
        callCount: executions?.length ?? 0,
      })
    } catch (err) {
      console.error('Failed to fetch call usage', err)
      setError('Unable to load usage data')
      setUsage(DEFAULT_USAGE)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  return { usage, loading, error, refresh: fetchUsage }
}
