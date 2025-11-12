'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'
  | 'processing'
  | 'unknown'

interface SubscriptionDetails {
  status: SubscriptionStatus
  plan: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  hasSubscription: boolean
}

const defaultSubscription: SubscriptionDetails = {
  status: 'unknown',
  plan: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  hasSubscription: false,
}

const defaultPriceId = process.env.NEXT_PUBLIC_STRIPE_DEFAULT_PRICE_ID
const trialPeriodDays = parseInt(process.env.NEXT_PUBLIC_STRIPE_TRIAL_PERIOD_DAYS ?? '0', 10)

function formatStatus(status: SubscriptionStatus) {
  switch (status) {
    case 'trialing':
      return 'Trialing'
    case 'active':
      return 'Active'
    case 'past_due':
      return 'Past due'
    case 'canceled':
      return 'Canceled'
    case 'unpaid':
      return 'Unpaid'
    case 'incomplete':
      return 'Incomplete'
    case 'incomplete_expired':
      return 'Incomplete (Expired)'
    case 'paused':
      return 'Paused'
    case 'processing':
      return 'Processing'
    default:
      return 'Not subscribed'
  }
}

export function SubscriptionManager() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<SubscriptionDetails>(defaultSubscription)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const searchParams = useSearchParams()
  const lastSyncedSessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    const status = searchParams.get('billing')

    if (!status) {
      return
    }

    if (status === 'success') {
      setInfoMessage('Your subscription is active. Thank you for being part of Eva Cares!')
      setErrorMessage(null)
    } else if (status === 'cancelled') {
      setInfoMessage('Checkout cancelled. You can resume the upgrade whenever you are ready.')
    } else if (status === 'required') {
      setErrorMessage('An active subscription is required to continue. Please subscribe below.')
    }
  }, [searchParams])

  const fetchSubscription = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setErrorMessage(null)

    try {
      const { data, error } = await supabase
        .from('users')
        .select(
          'subscription_status, subscription_plan, subscription_current_period_end, subscription_cancel_at_period_end, stripe_subscription_id'
        )
        .eq('auth_user_id', user.id)
        .single()

      if (error || !data) {
        throw error ?? new Error('User not found')
      }

      setSubscription({
        status: (data.subscription_status as SubscriptionStatus) ?? 'unknown',
        plan: data.subscription_plan,
        currentPeriodEnd: data.subscription_current_period_end,
        cancelAtPeriodEnd: data.subscription_cancel_at_period_end ?? false,
        hasSubscription: Boolean(data.stripe_subscription_id),
      })
    } catch (err) {
      console.error('Failed to load subscription details', err)
      setErrorMessage('Unable to load subscription status. Please try again.')
      setSubscription(defaultSubscription)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      setSubscription(defaultSubscription)
      return
    }

    fetchSubscription()
  }, [fetchSubscription, user])

  useEffect(() => {
    const status = searchParams.get('billing')
    const sessionId = searchParams.get('session_id')

    if (!user || status !== 'success' || !sessionId || syncing) {
      return
    }

    if (lastSyncedSessionIdRef.current === sessionId) {
      return
    }

    lastSyncedSessionIdRef.current = sessionId

    const controller = new AbortController()

    const sync = async () => {
      setSyncing(true)
      try {
        const response = await fetch('/api/stripe/sync-from-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const { error } = await response.json().catch(() => ({
            error: 'Unable to sync subscription. Please try again.',
          }))
          setErrorMessage(error ?? 'Unable to sync subscription. Please try again.')
          lastSyncedSessionIdRef.current = null
          return
        }

        await fetchSubscription()
      } catch (err) {
        if (controller.signal.aborted) return
        console.error('Failed to sync subscription after checkout', err)
        setErrorMessage('We could not confirm your subscription. Please refresh or contact support.')
        lastSyncedSessionIdRef.current = null
      } finally {
        setSyncing(false)
      }
    }

    sync()

    return () => controller.abort()
  }, [fetchSubscription, searchParams, syncing, user])

  const nextBillingDate = useMemo(() => {
    if (!subscription.currentPeriodEnd) return null
    try {
      return format(new Date(subscription.currentPeriodEnd), 'PPP')
    } catch {
      return null
    }
  }, [subscription.currentPeriodEnd])

  const statusBadgeStyles = useMemo(() => {
    switch (subscription.status) {
      case 'active':
      case 'trialing':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'past_due':
      case 'unpaid':
      case 'incomplete':
      case 'incomplete_expired':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'canceled':
        return 'bg-slate-100 text-slate-700 border-slate-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }, [subscription.status])

  const handleSubscribe = async () => {
    if (!defaultPriceId) {
      setErrorMessage('Stripe price ID is not configured. Please contact support.')
      return
    }

    setActionLoading(true)
    setErrorMessage(null)
    setInfoMessage(null)
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: defaultPriceId }),
      })

      if (!response.ok) {
        throw new Error('Checkout session failed')
      }

      const data = await response.json()

      if (data?.url) {
        window.location.href = data.url as string
        return
      }

      throw new Error('Checkout session missing redirect URL')
    } catch (err) {
      console.error('Failed to start Stripe Checkout', err)
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to start checkout. Please try again.'
      )
    } finally {
      setActionLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setActionLoading(true)
    setErrorMessage(null)
    setInfoMessage(null)
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Billing portal session failed')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (err) {
      console.error('Failed to open Stripe Billing Portal', err)
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to open the billing portal. Please try again.'
      )
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Subscription</h2>
          <p className="mt-1 text-sm text-slate-600">
            Manage your Eva Cares subscription and billing details.
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusBadgeStyles}`}>
          {loading ? 'Loading…' : formatStatus(subscription.status)}
        </span>
      </div>

      <div className="mt-6 space-y-4 text-sm text-slate-700">
        {trialPeriodDays > 0 && (
          <p className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-slate-700">
            New subscriptions include a {trialPeriodDays}-day free trial. You can cancel anytime
            before the trial ends.
          </p>
        )}

        {subscription.plan && (
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Plan</p>
            <p className="mt-1 font-medium text-slate-900">
              {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
            </p>
          </div>
        )}

        {nextBillingDate && (
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Next billing date</p>
            <p className="mt-1 font-medium text-slate-900">{nextBillingDate}</p>
            {subscription.cancelAtPeriodEnd && (
              <p className="mt-1 text-xs text-slate-500">
                Your subscription will end at the close of this billing period.
              </p>
            )}
          </div>
        )}

        {!loading && !subscription.hasSubscription && !syncing && (
          <p className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-amber-800">
            You do not have an active subscription yet. Subscribe to unlock the Eva Cares assistant
            for your loved one.
          </p>
        )}

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

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleManageBilling}
          disabled={loading || actionLoading || !subscription.hasSubscription}
          className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Manage billing
        </button>
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={loading || actionLoading || syncing}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {subscription.hasSubscription ? 'Update plan' : 'Subscribe now'}
        </button>
        <button
          type="button"
          onClick={fetchSubscription}
          disabled={loading || syncing}
          className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}


