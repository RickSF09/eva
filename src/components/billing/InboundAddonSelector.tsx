'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { INBOUND_PLANS, formatPrice, type InboundPlanDefinition } from '@/config/plans'
import type { BillingSubscriptionInfo } from '@/hooks/useCallUsage'

interface InboundAddonSelectorProps {
  subscription: BillingSubscriptionInfo | null
  onUpdate?: () => void
}

export function InboundAddonSelector({ subscription, onUpdate }: InboundAddonSelectorProps) {
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null)
  const [disabling, setDisabling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentSlug = subscription?.inbound_plan_slug

  const handleSelect = async (plan: InboundPlanDefinition) => {
    if (!plan.stripePriceId) {
      setError('This plan is not configured yet.')
      return
    }

    setLoadingSlug(plan.slug)
    setError(null)

    try {
      const action = currentSlug ? 'change' : 'enable'
      const res = await fetch('/api/stripe/update-inbound-addon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, inboundPlanSlug: plan.slug }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to update inbound add-on')
      }

      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoadingSlug(null)
    }
  }

  const handleDisable = async () => {
    setDisabling(true)
    setError(null)

    try {
      const res = await fetch('/api/stripe/update-inbound-addon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable' }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to disable inbound add-on')
      }

      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setDisabling(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Inbound calling add-on</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Allow your loved one to call Eva anytime. Billed separately from your outbound subscription.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {INBOUND_PLANS.map((plan) => {
          const isCurrent = currentSlug === plan.slug
          const loading = loadingSlug === plan.slug

          return (
            <div
              key={plan.slug}
              className={`flex flex-col rounded-xl border p-4 transition-shadow hover:shadow-sm ${
                isCurrent
                  ? 'border-blue-300 bg-blue-50/40 ring-1 ring-blue-200'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <h4 className="text-sm font-semibold text-slate-900">{plan.name}</h4>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-bold text-slate-900">
                  {formatPrice(plan.priceMonthly)}
                </span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
              <p className="mt-1 text-xs font-medium text-blue-700">
                {plan.minutesIncluded} inbound minutes
              </p>

              <ul className="mt-3 flex-1 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-slate-600">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handleSelect(plan)}
                disabled={isCurrent || loading || loadingSlug !== null}
                className={`mt-3 w-full rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                  isCurrent
                    ? 'border border-green-200 bg-green-50 text-green-700'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400'
                }`}
              >
                {isCurrent ? 'Current' : loading ? 'Updating...' : currentSlug ? 'Switch' : 'Enable'}
              </button>
            </div>
          )
        })}
      </div>

      {currentSlug && (
        <button
          type="button"
          onClick={handleDisable}
          disabled={disabling}
          className="text-xs text-red-600 underline hover:text-red-700 disabled:text-slate-400"
        >
          {disabling ? 'Removing...' : 'Remove inbound add-on'}
        </button>
      )}
    </div>
  )
}
