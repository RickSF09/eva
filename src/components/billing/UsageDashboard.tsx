'use client'

import type { BucketUsage, BillingSubscriptionInfo } from '@/hooks/useCallUsage'
import { formatPrice, OVERAGE_RATE_PENCE_PER_MINUTE } from '@/config/plans'

interface UsageDashboardProps {
  outbound: BucketUsage | null
  inbound: BucketUsage | null
  subscription: BillingSubscriptionInfo | null
}

function UsageBar({ label, bucket }: { label: string; bucket: BucketUsage }) {
  const barColor =
    bucket.usagePercent >= 90
      ? 'bg-red-500'
      : bucket.usagePercent >= 75
        ? 'bg-yellow-500'
        : 'bg-blue-500'

  const textColor =
    bucket.usagePercent >= 90
      ? 'text-red-700'
      : bucket.usagePercent >= 75
        ? 'text-yellow-700'
        : 'text-slate-700'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-700">{label}</span>
        <span className={`text-xs font-semibold ${textColor}`}>
          {bucket.minutesUsed} / {bucket.minutesIncluded} min
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(100, bucket.usagePercent)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{bucket.callCount} call{bucket.callCount !== 1 ? 's' : ''}</span>
        <span>
          {bucket.minutesRemaining > 0
            ? `${bucket.minutesRemaining} min remaining`
            : 'Allowance used'}
        </span>
      </div>

      {bucket.overageMinutes > 0 && (
        <p className="text-xs text-amber-600">
          +{bucket.overageMinutes} overage min ({formatPrice(bucket.overageCostPence)})
        </p>
      )}

      {bucket.usagePercent >= 90 && bucket.minutesRemaining > 0 && (
        <p className="text-xs text-red-600">
          Running low on minutes. Consider upgrading your plan or enabling overage.
        </p>
      )}
    </div>
  )
}

export function UsageDashboard({ outbound, inbound, subscription }: UsageDashboardProps) {
  const overageTotal =
    (outbound?.overageCostPence ?? 0) + (inbound?.overageCostPence ?? 0)

  return (
    <div className="space-y-4">
      {outbound && (
        <UsageBar label="Outbound calls" bucket={outbound} />
      )}

      {inbound && (
        <UsageBar label="Inbound calls" bucket={inbound} />
      )}

      {!outbound && !inbound && (
        <p className="text-xs text-slate-500">No usage data for this billing period yet.</p>
      )}

      {subscription?.overage_enabled && (
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">Overage this cycle</span>
            <span className="font-semibold text-slate-800">
              {formatPrice(overageTotal)} / {formatPrice(subscription.overage_spend_cap_pence)} cap
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{
                width: `${Math.min(100, subscription.overage_spend_cap_pence > 0 ? Math.round((overageTotal / subscription.overage_spend_cap_pence) * 100) : 0)}%`,
              }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {formatPrice(OVERAGE_RATE_PENCE_PER_MINUTE)}/min beyond plan allowance
          </p>
        </div>
      )}
    </div>
  )
}
