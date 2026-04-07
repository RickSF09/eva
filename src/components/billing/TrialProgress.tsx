'use client'

import type { BillingSubscriptionInfo } from '@/hooks/useCallUsage'
import { TRIAL_CALLS_REQUIRED } from '@/config/plans'

interface TrialProgressProps {
  subscription: BillingSubscriptionInfo | null
}

export function TrialProgress({ subscription }: TrialProgressProps) {
  const completed = subscription?.trial_calls_completed ?? 0
  const required = subscription?.trial_calls_required ?? TRIAL_CALLS_REQUIRED
  const percent = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-blue-900">Free trial in progress</h3>
          <p className="mt-0.5 text-xs text-blue-700">
            {completed} of {required} trial calls completed
          </p>
        </div>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
          Trial
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-blue-100">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-3 text-xs text-blue-600">
        Your first {required} calls are free. No charge will be made until your trial is complete
        and you confirm your plan. Cancel anytime.
      </p>
    </div>
  )
}
