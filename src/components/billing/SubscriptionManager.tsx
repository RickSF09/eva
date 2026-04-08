'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { PricingCards } from '@/components/billing/PricingCards'
import { TrialProgress } from '@/components/billing/TrialProgress'
import { GracePeriodBanner } from '@/components/billing/GracePeriodBanner'
import { UsageDashboard } from '@/components/billing/UsageDashboard'
import { InboundAddonSelector } from '@/components/billing/InboundAddonSelector'
import { OverageSettings } from '@/components/billing/OverageSettings'
import { useCallUsage } from '@/hooks/useCallUsage'
import { getPlanBySlug, formatPrice } from '@/config/plans'
import type { BillingPhase } from '@/config/plans'

function formatPhaseLabel(phase: BillingPhase): string {
  switch (phase) {
    case 'trial': return 'Free trial'
    case 'grace': return 'Grace period'
    case 'active': return 'Active'
    case 'canceled': return 'Canceled'
    default: return 'Not subscribed'
  }
}

function phaseBadgeStyles(phase: BillingPhase): string {
  switch (phase) {
    case 'active': return 'bg-green-100 text-green-800 border-green-200'
    case 'trial': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'grace': return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'canceled': return 'bg-slate-100 text-slate-700 border-slate-200'
    default: return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

export function SubscriptionManager() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [billingPhase, setBillingPhase] = useState<BillingPhase>('none')
  const [hasSubscription, setHasSubscription] = useState(false)
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const searchParams = useSearchParams()
  const lastSyncedSessionIdRef = useRef<string | null>(null)

  const { v2, loading: usageLoading, refresh: refreshUsage } = useCallUsage()

  // ---- URL param messages -------------------------------------------------
  useEffect(() => {
    const status = searchParams.get('billing')
    if (!status) return

    if (status === 'success') {
      setInfoMessage('Your subscription is active. Thank you for being part of DailyFriend!')
      setErrorMessage(null)
    } else if (status === 'cancelled') {
      setInfoMessage('Checkout cancelled. You can resume the upgrade whenever you are ready.')
    } else if (status === 'required') {
      setErrorMessage('An active subscription is required to continue. Please subscribe below.')
    }
  }, [searchParams])

  // ---- Fetch subscription state -------------------------------------------
  const fetchSubscription = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setErrorMessage(null)

    try {
      const { data, error } = await supabase
        .from('users')
        .select('billing_phase, stripe_subscription_id, subscription_cancel_at_period_end')
        .eq('auth_user_id', user.id)
        .single()

      if (error || !data) throw error ?? new Error('User not found')

      setBillingPhase((data.billing_phase as BillingPhase) ?? 'none')
      setHasSubscription(Boolean(data.stripe_subscription_id))
      setCancelAtPeriodEnd(data.subscription_cancel_at_period_end ?? false)
    } catch (err) {
      console.error('Failed to load subscription details', err)
      setErrorMessage('Unable to load subscription status. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    fetchSubscription()
  }, [fetchSubscription, user])

  // ---- Post-checkout sync -------------------------------------------------
  // NOTE: no AbortController here — the backend is idempotent and we must not
  // cancel an in-flight write when React Strict Mode re-runs the effect.
  // `syncing` is intentionally excluded from deps to avoid re-triggering on
  // the state flip that would abort the request mid-flight.
  useEffect(() => {
    const status = searchParams.get('billing')
    const sessionId = searchParams.get('session_id')

    if (!user || status !== 'success' || !sessionId) return
    if (lastSyncedSessionIdRef.current === sessionId) return

    // Mark immediately so Strict Mode's second invocation skips the call.
    lastSyncedSessionIdRef.current = sessionId

    const sync = async () => {
      setSyncing(true)
      try {
        const response = await fetch('/api/stripe/sync-from-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })

        if (!response.ok) {
          const { error } = await response.json().catch(() => ({
            error: 'Unable to sync subscription. Please try again.',
          }))
          setErrorMessage(error ?? 'Unable to sync subscription.')
          lastSyncedSessionIdRef.current = null
          return
        }

        window.location.replace('/app/settings')
      } catch (err) {
        console.error('Failed to sync after checkout', err)
        setErrorMessage('Could not confirm your subscription. Please refresh or contact support.')
        lastSyncedSessionIdRef.current = null
      } finally {
        setSyncing(false)
      }
    }

    sync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchSubscription, refreshUsage, searchParams, user])

  // ---- Derived values -----------------------------------------------------
  const currentPlan = getPlanBySlug(v2.subscription?.outbound_plan_slug ?? null)

  const nextBillingDate = useMemo(() => {
    if (!v2.subscription?.current_period_end) return null
    try {
      return format(new Date(v2.subscription.current_period_end), 'PPP')
    } catch {
      return null
    }
  }, [v2.subscription])

  // ---- Actions ------------------------------------------------------------
  const handleManageBilling = async () => {
    setActionLoading(true)
    setErrorMessage(null)
    setInfoMessage(null)
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) throw new Error('Billing portal session failed')
      const { url } = await response.json()
      window.location.href = url
    } catch (err) {
      console.error('Failed to open Stripe Billing Portal', err)
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to open the billing portal. Please try again.'
      )
    } finally {
      setActionLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (hasSubscription) {
      setSyncing(true)
      try {
        await fetch('/api/stripe/sync-subscription', { method: 'POST' })
      } finally {
        setSyncing(false)
      }
    }
    await fetchSubscription()
    refreshUsage()
  }

  const handleUpdate = () => {
    fetchSubscription()
    refreshUsage()
  }

  // Use the most authoritative billing phase: v2 reads from billing_subscriptions
  // (source of truth), while billingPhase reads from users table (legacy sync).
  const effectivePhase: BillingPhase = v2.billingPhase !== 'none' ? v2.billingPhase : billingPhase

  // ---- Render: no subscription → show pricing cards -----------------------
  const hasBillingRelationship = hasSubscription || effectivePhase === 'trial' || effectivePhase === 'grace' || effectivePhase === 'active'
  if (!loading && !usageLoading && !hasBillingRelationship && !syncing) {
    return (
      <div className="space-y-4">
        {errorMessage && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}
        {infoMessage && (
          <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {infoMessage}
          </p>
        )}
        <PricingCards />
      </div>
    )
  }

  // ---- Render: has subscription → show billing dashboard ------------------
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Subscription</h2>
          <p className="mt-1 text-sm text-slate-600">
            Manage your DailyFriend subscription and billing details.
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${phaseBadgeStyles(effectivePhase)}`}>
          {loading ? 'Loading...' : formatPhaseLabel(effectivePhase)}
        </span>
      </div>

      <div className="mt-6 space-y-6 text-sm text-slate-700">
        {/* Phase-specific banners */}
        {effectivePhase === 'trial' && (
          <TrialProgress subscription={v2.subscription} />
        )}

        {effectivePhase === 'grace' && (
          <GracePeriodBanner subscription={v2.subscription} onConfirmPlan={handleUpdate} />
        )}

        {/* Plan details */}
        {currentPlan && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Plan</p>
              <p className="mt-1 font-medium text-slate-900">{currentPlan.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Outbound min / month</p>
              <p className="mt-1 font-medium text-slate-900">{currentPlan.minutesIncluded}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Price</p>
              <p className="mt-1 font-medium text-slate-900">
                {formatPrice(currentPlan.priceMonthly)}/mo
              </p>
            </div>
          </div>
        )}

        {/* Usage dashboard (active phase) */}
        {effectivePhase === 'active' && !usageLoading && (
          <UsageDashboard
            outbound={v2.outbound}
            inbound={v2.inbound}
            subscription={v2.subscription}
          />
        )}

        {/* Inbound add-on (grace or active) */}
        {(effectivePhase === 'grace' || effectivePhase === 'active') && (
          <div className="border-t border-slate-100 pt-5">
            <InboundAddonSelector subscription={v2.subscription} onUpdate={handleUpdate} />
          </div>
        )}

        {/* Overage settings (grace or active) */}
        {(effectivePhase === 'grace' || effectivePhase === 'active') && (
          <div className="border-t border-slate-100 pt-5">
            <OverageSettings subscription={v2.subscription} onUpdate={handleUpdate} />
          </div>
        )}

        {/* Next billing date */}
        {nextBillingDate && effectivePhase === 'active' && (
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Next billing date</p>
            <p className="mt-1 font-medium text-slate-900">{nextBillingDate}</p>
            {cancelAtPeriodEnd && (
              <p className="mt-1 text-xs text-slate-500">
                Your subscription will end at the close of this billing period.
              </p>
            )}
          </div>
        )}

        {/* Messages */}
        {errorMessage && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}
        {infoMessage && (
          <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {infoMessage}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        {effectivePhase === 'active' && (
          <button
            type="button"
            onClick={handleManageBilling}
            disabled={loading || actionLoading}
            className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Manage billing
          </button>
        )}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading || syncing || usageLoading}
          className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {syncing ? 'Syncing...' : 'Refresh'}
        </button>
      </div>
    </div>
  )
}
