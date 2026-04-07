import type { BillingPhase } from '@/config/plans'

const ACCESS_ELIGIBLE_STATUSES = new Set(['trialing', 'active'])
const ACCESS_ELIGIBLE_PHASES = new Set<BillingPhase>(['trial', 'grace', 'active'])

export interface AllowanceWindow {
  start: string
  end: string
}

function daysInUtcMonth(year: number, monthZeroBased: number): number {
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate()
}

function addUtcMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  const seconds = date.getUTCSeconds()
  const millis = date.getUTCMilliseconds()

  const totalMonths = month + months
  const nextYear = year + Math.floor(totalMonths / 12)
  const nextMonth = ((totalMonths % 12) + 12) % 12
  const maxDay = daysInUtcMonth(nextYear, nextMonth)

  return new Date(
    Date.UTC(nextYear, nextMonth, Math.min(day, maxDay), hours, minutes, seconds, millis)
  )
}

/**
 * Splits a Stripe billing period into month-sized allowance windows anchored at period start.
 * This supports "monthly allowance on yearly billing" without relying on fixed day subtraction.
 */
export function getCurrentAllowanceWindow(
  periodStartIso: string | null | undefined,
  periodEndIso: string | null | undefined,
  referenceDate: Date = new Date()
): AllowanceWindow | null {
  if (!periodStartIso || !periodEndIso) return null

  const periodStart = new Date(periodStartIso)
  const periodEnd = new Date(periodEndIso)

  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) return null
  if (periodStart >= periodEnd) return null

  let effectiveReference = referenceDate
  if (effectiveReference < periodStart) effectiveReference = periodStart
  if (effectiveReference >= periodEnd) {
    effectiveReference = new Date(periodEnd.getTime() - 1)
  }

  let windowStart = periodStart

  while (true) {
    const nextWindowStart = addUtcMonths(windowStart, 1)
    if (nextWindowStart >= periodEnd) break
    if (effectiveReference < nextWindowStart) break
    windowStart = nextWindowStart
  }

  const oneMonthLater = addUtcMonths(windowStart, 1)
  const windowEnd = oneMonthLater < periodEnd ? oneMonthLater : periodEnd

  return {
    start: windowStart.toISOString(),
    end: windowEnd.toISOString(),
  }
}

/**
 * Returns true when a Stripe subscription status should grant product access.
 * Kept for backward compatibility with code that checks Stripe status directly.
 */
export function isSubscriptionActiveForAccess(status: string | null | undefined): boolean {
  if (!status) return false
  return ACCESS_ELIGIBLE_STATUSES.has(status)
}

/**
 * Returns true when the billing phase should grant product access.
 * Use this for the new billing flow where billing_phase is the source of truth.
 */
export function isBillingPhaseActiveForAccess(phase: string | null | undefined): boolean {
  if (!phase) return false
  return ACCESS_ELIGIBLE_PHASES.has(phase as BillingPhase)
}
