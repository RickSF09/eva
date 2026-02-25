'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { getMinutesForPlan } from '@/config/plans'
import { getCurrentAllowanceWindow } from '@/lib/subscription'

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
  /** Current allowance window start (ISO string). */
  periodStart: string | null
  /** Current allowance window end (ISO string). */
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
          subscription_current_period_start,
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

      // 3. Resolve the current allowance window from Stripe period bounds.
      let allowanceWindow = getCurrentAllowanceWindow(
        profile.subscription_current_period_start,
        profile.subscription_current_period_end,
      )

      // Legacy fallback for users without the new period-start column populated yet.
      if (!allowanceWindow && profile.subscription_current_period_end) {
        const periodEnd = new Date(profile.subscription_current_period_end)
        if (!Number.isNaN(periodEnd.getTime())) {
          const fallbackStart = new Date(periodEnd)
          fallbackStart.setUTCDate(fallbackStart.getUTCDate() - 30)
          allowanceWindow = {
            start: fallbackStart.toISOString(),
            end: periodEnd.toISOString(),
          }
        }
      }

      if (!allowanceWindow) {
        const isTrial = profile.subscription_status === 'trialing'
        const minutesIncluded = getMinutesForPlan(profile.subscription_plan, isTrial)
        setUsage({
          ...DEFAULT_USAGE,
          minutesIncluded,
          minutesRemaining: minutesIncluded,
          isTrial,
          periodStart: null,
          periodEnd: profile.subscription_current_period_end,
        })
        setLoading(false)
        return
      }

      // 4. Query call executions for this elder in the current allowance window.
      const { data: executions, error: execError } = await supabase
        .from('call_executions')
        .select('duration')
        .eq('elder_id', elder.id)
        .gte('completed_at', allowanceWindow.start)
        .lt('completed_at', allowanceWindow.end)
        .not('duration', 'is', null)

      if (execError) {
        throw execError
      }

      // 5. Calculate total minutes used (round up each call individually).
      const minutesUsed = (executions ?? []).reduce((sum, execution) => {
        const duration = typeof execution.duration === 'number' ? execution.duration : 0
        if (duration <= 0) return sum
        return sum + Math.ceil(duration / 60)
      }, 0)

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
        periodStart: allowanceWindow.start,
        periodEnd: allowanceWindow.end,
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
