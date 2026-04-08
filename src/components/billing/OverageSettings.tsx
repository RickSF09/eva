'use client'

import { useState, useEffect } from 'react'
import { formatPrice, OVERAGE_RATE_PENCE_PER_MINUTE } from '@/config/plans'
import type { BillingSubscriptionInfo } from '@/hooks/useCallUsage'

interface OverageSettingsProps {
  subscription: BillingSubscriptionInfo | null
  onUpdate?: () => void
}

export function OverageSettings({ subscription, onUpdate }: OverageSettingsProps) {
  const [enabled, setEnabled] = useState(subscription?.overage_enabled ?? false)
  const [capPence, setCapPence] = useState(subscription?.overage_spend_cap_pence ?? 500)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setEnabled(subscription?.overage_enabled ?? false)
    setCapPence(subscription?.overage_spend_cap_pence ?? 500)
    setDirty(false)
  }, [subscription])

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/stripe/update-overage-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, spendCapPence: capPence }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to update overage settings')
      }

      setDirty(false)
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const capGBP = (capPence / 100).toFixed(2)
  const capMinutes = OVERAGE_RATE_PENCE_PER_MINUTE > 0
    ? Math.floor(capPence / OVERAGE_RATE_PENCE_PER_MINUTE)
    : 0

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Pay-as-you-go overage</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          When enabled, calls continue beyond your plan allowance at{' '}
          {formatPrice(OVERAGE_RATE_PENCE_PER_MINUTE)}/min, up to your spend cap.
          Applies to both outbound and inbound buckets.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked)
              setDirty(true)
            }}
            className="peer sr-only"
          />
          <div className="h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full" />
        </label>
        <span className="text-sm text-slate-700">
          {enabled ? 'Overage enabled' : 'Overage disabled'}
        </span>
      </div>

      {enabled && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-700">
            Monthly spend cap
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">&pound;</span>
            <input
              type="number"
              min="1"
              max="500"
              step="1"
              value={Number((capPence / 100).toFixed(0))}
              onChange={(e) => {
                const gbp = Math.max(1, Math.min(500, Number(e.target.value) || 1))
                setCapPence(gbp * 100)
                setDirty(true)
              }}
              className="w-24 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
            />
          </div>
          <p className="text-xs text-slate-500">
            Cap: &pound;{capGBP} ({capMinutes} extra minutes at {formatPrice(OVERAGE_RATE_PENCE_PER_MINUTE)}/min)
          </p>
        </div>
      )}

      {dirty && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-slate-300"
        >
          {saving ? 'Saving...' : 'Save overage settings'}
        </button>
      )}
    </div>
  )
}
