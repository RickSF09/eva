export const FALLBACK_SCHEDULING_TIMEZONE = 'Europe/London'

export function getBrowserSchedulingTimezone(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!timezone || typeof timezone !== 'string') {
      return FALLBACK_SCHEDULING_TIMEZONE
    }

    const supportedValuesOf = (Intl as any).supportedValuesOf as unknown
    if (typeof supportedValuesOf === 'function') {
      const supported = (supportedValuesOf as any)('timeZone') as string[]
      if (!supported.includes(timezone)) {
        return FALLBACK_SCHEDULING_TIMEZONE
      }
    }

    return timezone
  } catch {
    return FALLBACK_SCHEDULING_TIMEZONE
  }
}
