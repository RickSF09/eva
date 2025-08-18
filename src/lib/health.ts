// Simple health scoring and helpers derived from post_call_reports data.
// Uses only fields that exist in the database types.

export type HealthTrafficLight = 'green' | 'yellow' | 'red'

export interface WeeklyCallStats {
  completedCount: number
  totalCount: number
  completionRate: number // 0..1
  averageSentiment: number | null // -1..1 (depending on data); fallback to 0
  escalations: number
}

export function computeHealthStatus(stats: WeeklyCallStats): HealthTrafficLight {
  // Treat unknown sentiment as neutral rather than bad
  const avgSentiment = stats.averageSentiment ?? 0.5
  const completion = stats.completionRate

  // Red if any recent escalations or very low sentiment/completion
  if (stats.escalations > 0) return 'red'
  if (avgSentiment <= 0.2 || completion < 0.4) return 'red'

  // Yellow if middling metrics
  if (avgSentiment <= 0.5 || completion < 0.6) return 'yellow'

  return 'green'
}

export function healthColorClasses(status: HealthTrafficLight) {
  switch (status) {
    case 'green':
      return {
        badge: 'bg-green-100 text-green-700',
        dot: 'bg-green-500',
      }
    case 'yellow':
      return {
        badge: 'bg-yellow-100 text-yellow-700',
        dot: 'bg-yellow-500',
      }
    case 'red':
    default:
      return {
        badge: 'bg-red-100 text-red-700',
        dot: 'bg-red-500',
      }
  }
}

export function formatPercent(n: number) {
  return `${Math.round(n * 100)}%`
}


