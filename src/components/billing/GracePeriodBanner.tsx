'use client'

import { useState } from 'react'
import type { BillingSubscriptionInfo } from '@/hooks/useCallUsage'
import { getPlanBySlug, formatPrice } from '@/config/plans'

interface GracePeriodBannerProps {
  subscription: BillingSubscriptionInfo | null
  onConfirmPlan?: () => void
}

export function GracePeriodBanner({ subscription, onConfirmPlan }: GracePeriodBannerProps) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!subscription?.grace_period_ends_at) return null

  const graceEnd = new Date(subscription.grace_period_ends_at)
  const now = new Date()
  const daysRemaining = Math.max(0, Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  const plan = getPlanBySlug(subscription.outbound_plan_slug)

  const handleConfirm = async () => {
    setConfirming(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/confirm-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to confirm plan')
      }
      onConfirmPlan?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-amber-900">
            Your trial is complete!
          </h3>
          <p className="mt-0.5 text-xs text-amber-700">
            {daysRemaining > 0
              ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} to review your plan before billing starts.`
              : 'Your grace period has ended. Billing will activate shortly.'}
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
          Grace period
        </span>
      </div>

      {plan && (
        <div className="mt-3 flex items-center gap-2 text-sm text-amber-800">
          <span className="font-medium">{plan.name}</span>
          <span className="text-amber-600">&middot;</span>
          <span>{formatPrice(plan.priceMonthly)}/mo</span>
          <span className="text-amber-600">&middot;</span>
          <span>{plan.minutesIncluded} outbound min</span>
        </div>
      )}

      <p className="mt-2 text-xs text-amber-600">
        You can switch plans, enable inbound calling, or configure overage settings before confirming.
      </p>

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={confirming}
        className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:bg-amber-300"
      >
        {confirming ? 'Confirming...' : 'Confirm plan and start billing'}
      </button>
    </div>
  )
}
