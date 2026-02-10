// ============================================================
// BILLING CONFIGURATION
// Edit values here when plans or trial terms change.
// This is the single source of truth for all billing-related
// display values used by the frontend.
// ============================================================

// -- Trial settings --------------------------------------------------
/** Number of free-trial days new subscribers receive. */
export const TRIAL_PERIOD_DAYS = 7

/** Call minutes available during the trial period. */
export const TRIAL_MINUTES = 90

// -- Plan definitions ------------------------------------------------

export interface PlanDefinition {
  /** Must match the slug stored in `users.subscription_plan`. */
  slug: string
  /** Human-readable name shown in the UI. */
  name: string
  /** Monthly price in pence (for display only – Stripe is the billing source of truth). */
  priceMonthly: number
  /** ISO 4217 currency code. */
  currency: string
  /** Call minutes included per month (after trial). */
  minutesIncluded: number
  /** Bullet points shown on pricing cards. */
  features: string[]
  /** Stripe Price ID loaded from env vars. */
  stripePriceId: string
  /** If true, this plan gets a "Most popular" badge. */
  popular?: boolean
}

export const PLANS: PlanDefinition[] = [
  {
    slug: 'essential',
    name: 'Essential',
    priceMonthly: 2999,
    currency: 'GBP',
    minutesIncluded: 180,
    features: [
      '180 call minutes / month',
      'Daily check-in calls',
      'Post-call reports',
      'Emergency escalation',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ESSENTIAL ?? '',
  },
  {
    slug: 'peace_of_mind',
    name: 'Peace of Mind',
    priceMonthly: 4999,
    currency: 'GBP',
    minutesIncluded: 400,
    features: [
      '400 call minutes / month',
      'Daily check-in calls',
      'Post-call reports',
      'Emergency escalation',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PEACE_OF_MIND ?? '',
    popular: true,
  },
  {
    slug: 'complete_care',
    name: 'Complete Care',
    priceMonthly: 7999,
    currency: 'GBP',
    minutesIncluded: 750,
    features: [
      '750 call minutes / month',
      'Daily check-in calls',
      'Post-call reports',
      'Emergency escalation',
      'Priority support',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_COMPLETE_CARE ?? '',
  },
]

// -- Helpers ----------------------------------------------------------

/** Look up a plan by its slug (e.g. `"essential"`). */
export function getPlanBySlug(slug: string | null | undefined): PlanDefinition | null {
  if (!slug) return null
  return PLANS.find((p) => p.slug === slug) ?? null
}

/** Look up a plan by its Stripe Price ID. */
export function getPlanByPriceId(priceId: string | null | undefined): PlanDefinition | null {
  if (!priceId) return null
  return PLANS.find((p) => p.stripePriceId === priceId) ?? null
}

/** Format a pence amount as a display price, e.g. `"£29.99"`. */
export function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}

/**
 * Return the minute allowance for a plan.
 * During trial the user gets `TRIAL_MINUTES`; after trial they get the plan's full allowance.
 */
export function getMinutesForPlan(slug: string | null | undefined, isTrial: boolean): number {
  if (isTrial) return TRIAL_MINUTES
  return getPlanBySlug(slug)?.minutesIncluded ?? 0
}
