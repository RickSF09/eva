// ============================================================
// BILLING CONFIGURATION
// Edit values here when plans or trial terms change.
// This is the single source of truth for all billing-related
// display values used by the frontend.
// ============================================================

// -- Trial settings --------------------------------------------------
/** Number of free calls before trial is considered complete. */
export const TRIAL_CALLS_REQUIRED = 5

/** Safety-net ceiling on total minutes consumed during trial. */
export const TRIAL_MINUTES_CEILING = 90

/** Number of days the post-trial grace period lasts. */
export const GRACE_PERIOD_DAYS = 14

// -- Legacy exports (kept for backend compatibility) -----------------
/** @deprecated Use TRIAL_CALLS_REQUIRED instead. */
export const TRIAL_PERIOD_DAYS = 7
/** @deprecated Use TRIAL_MINUTES_CEILING instead. */
export const TRIAL_MINUTES = TRIAL_MINUTES_CEILING

// -- Overage settings ------------------------------------------------
/** Per-minute overage rate in pence (placeholder – update when decided). */
export const OVERAGE_RATE_PENCE_PER_MINUTE = 50 // £0.50 placeholder

/** Stripe product ID for overage invoice items. */
export const OVERAGE_PRODUCT_ID = process.env.STRIPE_OVERAGE_PRODUCT_ID ?? ''

// -- Outbound plan definitions ---------------------------------------

export interface PlanDefinition {
  /** Must match the slug stored in `billing_subscriptions.outbound_plan_slug`. */
  slug: string
  /** Human-readable name shown in the UI. */
  name: string
  /** Monthly price in pence (for display only – Stripe is the billing source of truth). */
  priceMonthly: number
  /** ISO 4217 currency code. */
  currency: string
  /** Outbound call minutes included per month. */
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

// -- Inbound add-on definitions --------------------------------------

export interface InboundPlanDefinition {
  /** Must match the slug stored in `billing_subscriptions.inbound_plan_slug`. */
  slug: string
  /** Human-readable name shown in the UI. */
  name: string
  /** Monthly price in pence. */
  priceMonthly: number
  /** ISO 4217 currency code. */
  currency: string
  /** Inbound call minutes included per month. */
  minutesIncluded: number
  /** Bullet points shown on inbound add-on cards. */
  features: string[]
  /** Stripe Price ID loaded from env vars. */
  stripePriceId: string
}

export const INBOUND_PLANS: InboundPlanDefinition[] = [
  {
    slug: 'inbound_1',
    name: 'Inbound Tier 1',
    priceMonthly: 999,
    currency: 'GBP',
    minutesIncluded: 60,
    features: ['60 inbound minutes / month'],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_INBOUND_1 ?? '',
  },
  {
    slug: 'inbound_2',
    name: 'Inbound Tier 2',
    priceMonthly: 1999,
    currency: 'GBP',
    minutesIncluded: 150,
    features: ['150 inbound minutes / month'],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_INBOUND_2 ?? '',
  },
  {
    slug: 'inbound_3',
    name: 'Inbound Tier 3',
    priceMonthly: 2999,
    currency: 'GBP',
    minutesIncluded: 300,
    features: ['300 inbound minutes / month'],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_INBOUND_3 ?? '',
  },
]

// -- Billing phase type -----------------------------------------------

export type BillingPhase = 'none' | 'trial' | 'grace' | 'active' | 'canceled'

// -- Helpers ----------------------------------------------------------

/** Look up an outbound plan by its slug. */
export function getPlanBySlug(slug: string | null | undefined): PlanDefinition | null {
  if (!slug) return null
  return PLANS.find((p) => p.slug === slug) ?? null
}

/** Look up an outbound plan by its Stripe Price ID. */
export function getPlanByPriceId(priceId: string | null | undefined): PlanDefinition | null {
  if (!priceId) return null
  return PLANS.find((p) => p.stripePriceId === priceId) ?? null
}

/** Look up an inbound plan by its slug. */
export function getInboundPlanBySlug(slug: string | null | undefined): InboundPlanDefinition | null {
  if (!slug) return null
  return INBOUND_PLANS.find((p) => p.slug === slug) ?? null
}

/** Look up an inbound plan by its Stripe Price ID. */
export function getInboundPlanByPriceId(priceId: string | null | undefined): InboundPlanDefinition | null {
  if (!priceId) return null
  return INBOUND_PLANS.find((p) => p.stripePriceId === priceId) ?? null
}

/** Format a pence amount as a display price, e.g. `"£29.99"`. */
export function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}

/**
 * Return the outbound minute allowance for a plan.
 * During trial the user gets `TRIAL_MINUTES_CEILING`; after trial they get the plan's full allowance.
 */
export function getMinutesForPlan(slug: string | null | undefined, isTrial: boolean): number {
  if (isTrial) return TRIAL_MINUTES_CEILING
  return getPlanBySlug(slug)?.minutesIncluded ?? 0
}
