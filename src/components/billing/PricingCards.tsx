'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { PLANS, TRIAL_PERIOD_DAYS, formatPrice, type PlanDefinition } from '@/config/plans'

interface PricingCardsProps {
  /** Slug of the user's current plan (if any). */
  currentPlanSlug?: string | null
  /** Whether the user is currently on a trial. */
  isTrialing?: boolean
  /** Optional: override the default redirect-to-checkout behaviour. */
  onSelectPlan?: (plan: PlanDefinition) => void
  /** Compact mode hides the header text (useful when embedded inside another component). */
  compact?: boolean
}

export function PricingCards({
  currentPlanSlug,
  isTrialing,
  onSelectPlan,
  compact = false,
}: PricingCardsProps) {
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSelect = async (plan: PlanDefinition) => {
    if (onSelectPlan) {
      onSelectPlan(plan)
      return
    }

    if (!plan.stripePriceId) {
      setError('This plan is not configured yet. Please contact support.')
      return
    }

    setLoadingSlug(plan.slug)
    setError(null)

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: plan.stripePriceId }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Checkout failed' }))
        throw new Error(data.error ?? 'Unable to start checkout')
      }

      const data = await response.json()

      if (data?.url) {
        window.location.href = data.url as string
        return
      }

      throw new Error('Missing redirect URL')
    } catch (err) {
      console.error('Failed to start checkout', err)
      setError(err instanceof Error ? err.message : 'Unable to start checkout. Please try again.')
    } finally {
      setLoadingSlug(null)
    }
  }

  const isCurrent = (slug: string) => currentPlanSlug === slug

  return (
    <div>
      {!compact && (
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Choose your plan</h2>
          <p className="mt-2 text-sm text-slate-600">
            Start with a {TRIAL_PERIOD_DAYS}-day free trial. Cancel anytime before it ends &mdash;
            no charge.
          </p>
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const current = isCurrent(plan.slug)
          const loading = loadingSlug === plan.slug
          const anyLoading = loadingSlug !== null

          return (
            <div
              key={plan.slug}
              className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition-shadow hover:shadow-md ${
                plan.popular
                  ? 'border-blue-300 bg-blue-50/40 ring-1 ring-blue-200'
                  : 'border-slate-200 bg-white'
              } ${current ? 'ring-2 ring-blue-500' : ''}`}
            >
              {/* Badges */}
              <div className="mb-4 flex items-center gap-2">
                {plan.popular && !current && (
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                    Most popular
                  </span>
                )}
                {current && (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                    {isTrialing ? 'Current trial' : 'Current plan'}
                  </span>
                )}
              </div>

              {/* Plan name */}
              <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>

              {/* Price */}
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900">
                  {formatPrice(plan.priceMonthly)}
                </span>
                <span className="text-sm text-slate-500">/ month</span>
              </div>

              {/* Minutes highlight */}
              <p className="mt-2 text-sm font-medium text-blue-700">
                {plan.minutesIncluded} call minutes included
              </p>

              {/* Features */}
              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                type="button"
                onClick={() => handleSelect(plan)}
                disabled={current || loading || anyLoading}
                className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                  current
                    ? 'border border-green-200 bg-green-50 text-green-700'
                    : plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400'
                }`}
              >
                {current
                  ? isTrialing
                    ? 'Current trial'
                    : 'Current plan'
                  : loading
                    ? 'Redirecting…'
                    : `Start ${TRIAL_PERIOD_DAYS}-day free trial`}
              </button>

              {/* Fine print */}
              {!current && (
                <p className="mt-2 text-center text-xs text-slate-400">
                  Card required &middot; Cancel anytime
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
