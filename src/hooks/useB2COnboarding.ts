'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { isSubscriptionActiveForAccess } from '@/lib/subscription'
import type { Tables } from '@/types/database'
import { useCallback, useEffect, useMemo, useState } from 'react'

const SNAPSHOT_QUERY_TIMEOUT_MS = 8000

async function withTimeout<T>(promise: PromiseLike<T>, label: string, ms = SNAPSHOT_QUERY_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    }),
  ])
}

export type OnboardingStepId = 'elder' | 'schedule' | 'contact' | 'billing' | 'consent'

export interface OnboardingStepDefinition {
  id: OnboardingStepId
  title: string
  helper: string
}

export interface OnboardingStepProgress extends OnboardingStepDefinition {
  completed: boolean
}

export const ONBOARDING_STEPS: OnboardingStepDefinition[] = [
  { id: 'elder', title: 'Elder profile', helper: 'Who Eva supports' },
  { id: 'schedule', title: 'Call plan', helper: 'When to check in' },
  { id: 'contact', title: 'Emergency contact', helper: 'Who we alert' },
  { id: 'billing', title: 'Start Free Trial', helper: 'Enable calling' },
  { id: 'consent', title: 'Consent activation', helper: 'Recorded consent before calls begin' },
]

type ElderRecord = Pick<
  Tables<'elders'>,
  | 'id'
  | 'first_name'
  | 'last_name'
  | 'phone'
  | 'address'
  | 'medical_conditions'
  | 'medications'
  | 'personal_info'
  | 'consent_status'
  | 'consent_pathway'
  | 'consent_obtained_at'
  | 'consent_decision_at'
  | 'self_consent_capable_confirmed'
>

export interface ScheduleSummary {
  id: string
  name: string
  frequency: string
  description: string | null
  callTimes: string[]
  daysOfWeek: number[]
  checklist: string[]
  retryAfter: number | null
  maxRetries: number | null
}

export interface EmergencyContactSummary {
  id: string
  name: string
  phone: string
  email: string | null
  relation: string | null
  priority: number | null
}

export interface B2COnboardingSnapshot {
  profileId: string | null
  elder: ElderRecord | null
  schedules: ScheduleSummary[]
  contacts: EmergencyContactSummary[]
  subscriptionStatus: string | null
  subscriptionPlan: string | null
  subscriptionPeriodEnd: string | null
  /** True when the user has any Stripe subscription record (including canceled). */
  hasSubscription: boolean
  /** True when billing status should unlock B2C app access. */
  hasActiveSubscription: boolean
}

const EMPTY_SNAPSHOT: B2COnboardingSnapshot = {
  profileId: null,
  elder: null,
  schedules: [],
  contacts: [],
  subscriptionStatus: null,
  subscriptionPlan: null,
  subscriptionPeriodEnd: null,
  hasSubscription: false,
  hasActiveSubscription: false,
}

export interface UseB2COnboardingOptions {
  enabled?: boolean
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item : typeof item === 'number' ? String(item).padStart(2, '0') : null))
    .filter((item): item is string => Boolean(item))
}

function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'number' && Number.isFinite(item) ? item : Number(item)))
    .filter((num) => Number.isInteger(num)) as number[]
}

export function useB2COnboardingSnapshot(options: UseB2COnboardingOptions = {}) {
  const { enabled = true } = options
  const { user } = useAuth()
  const [snapshot, setSnapshot] = useState<B2COnboardingSnapshot>(EMPTY_SNAPSHOT)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSnapshot = useCallback(async () => {
    if (!enabled || !user) {
      setSnapshot(EMPTY_SNAPSHOT)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: profile, error: profileError } = await withTimeout(
        supabase
        .from('users')
        .select('id, subscription_status, subscription_plan, subscription_current_period_end, stripe_subscription_id')
        .eq('auth_user_id', user.id)
        .maybeSingle(),
        'B2C onboarding profile query',
      )

      if (profileError) {
        throw profileError
      }

      if (!profile?.id) {
        setSnapshot(EMPTY_SNAPSHOT)
        return
      }

      let elder: ElderRecord | null = null
      let schedules: ScheduleSummary[] = []
      let contacts: EmergencyContactSummary[] = []

      const { data: elderData, error: elderError } = await withTimeout(
        supabase
        .from('elders')
        .select(
          'id, first_name, last_name, phone, address, medical_conditions, medications, personal_info, consent_status, consent_pathway, consent_obtained_at, consent_decision_at, self_consent_capable_confirmed',
        )
        .eq('user_id', profile.id)
        .maybeSingle(),
        'B2C onboarding elder query',
      )

      if (elderError && elderError.code !== 'PGRST116') {
        throw elderError
      }

      if (elderData) {
        elder = elderData

        const { data: scheduleRows, error: scheduleError } = await withTimeout(
          supabase
          .from('elder_call_schedules')
          .select(
            `
            schedule_id,
            call_schedules (
              id,
              name,
              description,
              frequency,
              call_times,
              days_of_week,
              checklist,
              retry_after_minutes,
              max_retries
            )
          `,
          )
          .eq('elder_id', elderData.id)
          .order('created_at', { ascending: true }),
          'B2C onboarding schedules query',
        )

        if (scheduleError) {
          throw scheduleError
        }

        schedules =
          scheduleRows?.map((row: any) => {
            const schedule = Array.isArray(row.call_schedules) ? row.call_schedules[0] : row.call_schedules
            if (!schedule?.id) return null
            return {
              id: schedule.id as string,
              name: (schedule.name as string) || 'Check-in plan',
              frequency: (schedule.frequency as string) || 'custom',
              description: (schedule.description as string) || null,
              callTimes: asStringArray(schedule.call_times),
              daysOfWeek: asNumberArray(schedule.days_of_week),
              checklist: asStringArray(schedule.checklist),
              retryAfter: typeof schedule.retry_after_minutes === 'number' ? schedule.retry_after_minutes : null,
              maxRetries: typeof schedule.max_retries === 'number' ? schedule.max_retries : null,
            } satisfies ScheduleSummary
          })?.filter((item): item is ScheduleSummary => Boolean(item)) ?? []

        const { data: contactRows, error: contactError } = await withTimeout(
          supabase
          .from('elder_emergency_contact')
          .select(
            `
            id,
            relation,
            "priority order",
            emergency_contacts (
              id,
              name,
              phone,
              email,
              active
            )
          `,
          )
          .eq('elder_id', elderData.id)
          .order('"priority order"', { ascending: true }),
          'B2C onboarding contacts query',
        )

        if (contactError) {
          throw contactError
        }

        const mappedContacts = (contactRows ?? [])
          .map((row: any) => {
            const contact = Array.isArray(row.emergency_contacts) ? row.emergency_contacts[0] : row.emergency_contacts
            if (!contact?.id) return null
            
            const summary: EmergencyContactSummary = {
              id: contact.id as string,
              name: contact.name as string,
              phone: contact.phone as string,
              email: (contact.email as string) || null,
              relation: (row.relation as string) || null,
              priority: typeof row['priority order'] === 'number' ? row['priority order'] : null,
            }
            return summary
          })
          .filter((item): item is EmergencyContactSummary => Boolean(item))

        contacts = mappedContacts
      }

      const subscriptionStatus = profile.subscription_status ?? null

      setSnapshot({
        profileId: profile.id,
        elder,
        schedules,
        contacts,
        subscriptionStatus,
        subscriptionPlan: profile.subscription_plan ?? null,
        subscriptionPeriodEnd: profile.subscription_current_period_end ?? null,
        hasSubscription: Boolean(profile.stripe_subscription_id),
        hasActiveSubscription: isSubscriptionActiveForAccess(subscriptionStatus),
      })
    } catch (err) {
      console.error('Failed to load onboarding snapshot', err)
      setSnapshot(EMPTY_SNAPSHOT)
      setError('Unable to load your progress. Please refresh.')
    } finally {
      setLoading(false)
    }
  }, [enabled, user])

  useEffect(() => {
    if (!enabled) {
      setSnapshot(EMPTY_SNAPSHOT)
      setLoading(false)
      return
    }

    fetchSnapshot()
  }, [enabled, fetchSnapshot])

  const completionMap = useMemo(() => {
    const elderComplete = Boolean(snapshot.elder?.first_name && snapshot.elder?.phone)
    const scheduleComplete = elderComplete && snapshot.schedules.length > 0
    const contactComplete = elderComplete && snapshot.contacts.length > 0
    const billingComplete = snapshot.hasActiveSubscription
    const consentComplete =
      elderComplete &&
      billingComplete &&
      snapshot.elder?.consent_status === 'granted'

    return {
      elder: elderComplete,
      schedule: scheduleComplete,
      contact: contactComplete,
      billing: billingComplete,
      consent: consentComplete,
    } as Record<OnboardingStepId, boolean>
  }, [snapshot])

  const steps = useMemo<OnboardingStepProgress[]>(
    () =>
      ONBOARDING_STEPS.map((step) => ({
        ...step,
        completed: completionMap[step.id],
      })),
    [completionMap],
  )

  const isComplete = steps.every((step) => step.completed)

  const nextStepId = useMemo<OnboardingStepId>(
    () => steps.find((step) => !step.completed)?.id ?? 'elder',
    [steps],
  )

  return {
    snapshot,
    steps,
    loading,
    error,
    isComplete,
    nextStepId,
    refresh: fetchSnapshot,
  }
}
