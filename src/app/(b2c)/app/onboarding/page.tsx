'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  CreditCard,
  Heart,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { calculateNextScheduledTime, cn } from '@/lib/utils'
import { SubscriptionManager } from '@/components/billing/SubscriptionManager'
import {
  ONBOARDING_STEPS,
  type OnboardingStepId,
  useB2COnboardingSnapshot,
} from '@/hooks/useB2COnboarding'
import type { B2COnboardingSnapshot } from '@/hooks/useB2COnboarding'
import {
  composeE164,
  detectCountryCodeFromE164,
  getNationalNumber,
  sanitizeDigits,
  validateE164,
  type SupportedCountryCode,
} from '@/lib/phone'

const DAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
] as const

const CHECKLIST_SUGGESTIONS = [
  'Checked medication',
  'Feeling safe today',
  'Had water recently',
  'Eaten a meal',
  'Any pain or discomfort',
  'Spoke to family',
] as const

const SCHEDULE_TEMPLATES = [
  {
    id: 'daily-morning',
    label: 'Every day · 9:00',
    helper: 'Gentle post-breakfast check-in',
    days: [0, 1, 2, 3, 4, 5, 6],
    times: ['09:00'],
  },
  {
    id: 'weekday-lunch',
    label: 'Weekdays · 12:00',
    helper: 'Midday reminder during lunch',
    days: [1, 2, 3, 4, 5],
    times: ['12:00'],
  },
  {
    id: 'evening',
    label: 'Every day · 19:30',
    helper: 'Wind-down touchpoint in the evening',
    days: [0, 1, 2, 3, 4, 5, 6],
    times: ['19:30'],
  },
] as const

const RELATION_OPTIONS = ['Spouse', 'Partner', 'Child', 'Sibling', 'Friend', 'Neighbor', 'Doctor', 'Other'] as const

interface ElderFormState {
  firstName: string
  lastName: string
  phone: string
  address: string
  medical: string
  medications: string
  personal: string
}

const EMPTY_ELDER_FORM: ElderFormState = {
  firstName: '',
  lastName: '',
  phone: '',
  address: '',
  medical: '',
  medications: '',
  personal: '',
}

interface ScheduleFormState {
  id: string | null
  days: number[]
  times: string[]
  checklist: string[]
  description: string
  retryAfter: number
  maxRetries: number
}

const DEFAULT_SCHEDULE_FORM: ScheduleFormState = {
  id: null,
  days: [1, 2, 3, 4, 5],
  times: ['09:00'],
  checklist: ['Checked medication', 'Feeling safe today'],
  description: '',
  retryAfter: 30,
  maxRetries: 2,
}

interface ContactFormState {
  id: string | null
  name: string
  relation: string
  customRelation: string
  phone: string
  email: string
}

const DEFAULT_CONTACT_FORM: ContactFormState = {
  id: null,
  name: '',
  relation: 'Child',
  customRelation: '',
  phone: '',
  email: '',
}

const defaultPriceId = process.env.NEXT_PUBLIC_STRIPE_DEFAULT_PRICE_ID

export default function B2COnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const billingParam = searchParams?.get('billing') ?? null
  const { snapshot, steps, loading, error, isComplete, nextStepId, refresh } = useB2COnboardingSnapshot()
  const [activeStep, setActiveStep] = useState<OnboardingStepId>('elder')
  const [initialized, setInitialized] = useState(false)

  console.log('B2COnboardingPage Render:', { 
    loading, 
    activeStep, 
    nextStepId, 
    isComplete, 
    completedCount: steps.filter(s => s.completed).length,
    billingParam,
    hasSubscription: snapshot.hasSubscription
  })

  useEffect(() => {
    if (!loading && !initialized) {
      setActiveStep(nextStepId)
      setInitialized(true)
    }
  }, [loading, nextStepId, initialized])

  useEffect(() => {
    if (billingParam) {
      refresh()
    }
  }, [billingParam, refresh])

  const completedCount = useMemo(() => steps.filter((step) => step.completed).length, [steps])
  const progressPercent = Math.round((completedCount / steps.length) * 100)

  const goToNextIncomplete = () => {
    const next = steps.find((step) => !step.completed)
    if (next) {
      setActiveStep(next.id)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-slate-600" />
          <p className="mt-3 text-sm text-slate-500">Loading your onboarding flow…</p>
        </div>
      </div>
    )
  }

  const stepMap = Object.fromEntries(steps.map((step) => [step.id, step])) as Record<
    OnboardingStepId,
    (typeof steps)[number]
  >

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <HeroCard progressPercent={progressPercent} completed={isComplete} />

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertCircle className="h-4 w-4 flex-none" />
          {error}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-72 lg:flex-none">
          <ProgressRail steps={steps} activeStep={activeStep} onSelect={setActiveStep} />
        </aside>

        <section className="flex-1 space-y-6">
          {isComplete && (
            <CompletionBanner
              onPrimary={() => router.push('/app/home')}
              onSecondary={() => router.push('/app/elder')}
            />
          )}

          {activeStep === 'elder' && (
            <ElderStep
              snapshot={snapshot}
              completed={stepMap.elder?.completed ?? false}
              onSaved={refresh}
              onContinue={goToNextIncomplete}
            />
          )}

          {activeStep === 'schedule' && (
            <ScheduleStep
              snapshot={snapshot}
              completed={stepMap.schedule?.completed ?? false}
              onSaved={refresh}
              onContinue={goToNextIncomplete}
            />
          )}

          {activeStep === 'contact' && (
            <ContactStep
              snapshot={snapshot}
              completed={stepMap.contact?.completed ?? false}
              onSaved={refresh}
              onContinue={goToNextIncomplete}
            />
          )}

          {activeStep === 'billing' && (
            <BillingStep
              snapshot={snapshot}
              completed={stepMap.billing?.completed ?? false}
              billingParam={billingParam}
              onRefresh={refresh}
              onContinue={() => router.push('/app/home')}
            />
          )}
        </section>
      </div>
    </div>
  )
}

function HeroCard({ progressPercent, completed }: { progressPercent: number; completed: boolean }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/80 px-6 py-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-blue-600/90 p-3 text-white">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {completed ? 'All set! Eva is ready.' : 'Let’s finish setting up Eva'}
            </h1>
            <p className="text-sm text-slate-600">
              Four lightweight steps. You can save and come back anytime.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-700">
          <Heart className="h-4 w-4 text-blue-500" />
          Peace of mind is moments away
        </div>
      </div>
      <div className="mt-5">
        <div className="h-2 w-full rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-[width]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs font-medium text-slate-600">
          {progressPercent}% complete · {progressPercent === 100 ? 'Ready to go' : 'Finish the remaining steps'}
        </p>
      </div>
    </section>
  )
}

interface ProgressRailProps {
  steps: { id: OnboardingStepId; title: string; helper: string; completed: boolean }[]
  activeStep: OnboardingStepId
  onSelect: (id: OnboardingStepId) => void
}

function ProgressRail({ steps, activeStep, onSelect }: ProgressRailProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm lg:sticky lg:top-8">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Progress</p>
      <div className="space-y-2">
        {steps.map((step, index) => {
          const isActive = step.id === activeStep
          const Icon = step.completed ? CheckCircle2 : Circle
          return (
            <button
              key={step.id}
              onClick={() => onSelect(step.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all',
                isActive
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                  : 'border-transparent bg-slate-50 text-slate-800 hover:border-slate-200',
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold',
                  isActive ? 'bg-blue-700 text-white' : 'bg-white text-slate-600',
                )}
              >
                {index + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{step.title}</p>
                <p className={cn('text-xs', isActive ? 'text-blue-100' : 'text-slate-500')}>
                  {step.helper}
                </p>
              </div>
              <Icon
                className={cn('h-4 w-4 flex-none', step.completed ? 'text-blue-100' : 'text-slate-400')}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CompletionBanner({ onPrimary, onSecondary }: { onPrimary: () => void; onSecondary: () => void }) {
  return (
    <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 px-6 py-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
          <div>
            <p className="text-base font-semibold text-emerald-900">You’re ready to go</p>
            <p className="text-sm text-emerald-800">
              Eva has everything she needs. Head to the dashboard or fine-tune the profile anytime.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={onPrimary}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-500"
          >
            Go to dashboard
            <ChevronRight className="ml-1 h-4 w-4" />
          </button>
          <button
            onClick={onSecondary}
            className="inline-flex items-center justify-center rounded-xl border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            Tweak details
          </button>
        </div>
      </div>
    </div>
  )
}

interface StepHeaderProps {
  title: string
  helper: string
  completed: boolean
  icon: React.ReactNode
}

function StepHeader({ title, helper, completed, icon }: StepHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-blue-600/90 p-2.5 text-white">{icon}</div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{helper}</p>
        </div>
      </div>
      <StepStatusPill completed={completed} />
    </div>
  )
}

function StepStatusPill({ completed }: { completed: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
        completed ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600',
      )}
    >
      {completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
      {completed ? 'Complete' : 'Required'}
    </span>
  )
}

function ElderStep({
  snapshot,
  completed,
  onSaved,
  onContinue,
}: {
  snapshot: B2COnboardingSnapshot
  completed: boolean
  onSaved: () => void
  onContinue: () => void
}) {
  const existing = snapshot.elder
  const [form, setForm] = useState<ElderFormState>(EMPTY_ELDER_FORM)
  const [countryCode, setCountryCode] = useState<SupportedCountryCode>(detectCountryCodeFromE164(existing?.phone))
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (existing) {
      setForm({
        firstName: existing.first_name ?? '',
        lastName: existing.last_name ?? '',
        phone: existing.phone ?? '',
        address: existing.address ?? '',
        medical: existing.medical_conditions ?? '',
        medications: existing.medications ?? '',
        personal: existing.personal_info ?? '',
      })
      setCountryCode(detectCountryCodeFromE164(existing.phone))
      setPhoneError(null)
    } else {
      setForm(EMPTY_ELDER_FORM)
      setCountryCode('+1')
    }
  }, [existing?.id])

  const nationalNumber = useMemo(() => getNationalNumber(form.phone, countryCode), [form.phone, countryCode])

  const handleDigitsChange = (value: string) => {
    const digits = sanitizeDigits(value)
    const full = composeE164(countryCode, digits)
    setForm((prev) => ({ ...prev, phone: full }))
    setFeedback(null)
    setPhoneError(full ? validateE164(full, countryCode) : 'Phone number is required')
  }

  const handleCountryChange = (next: SupportedCountryCode) => {
    setCountryCode(next)
    const digits = sanitizeDigits(getNationalNumber(form.phone, next))
    const full = composeE164(next, digits)
    setForm((prev) => ({ ...prev, phone: full }))
    setFeedback(null)
    setPhoneError(full ? validateE164(full, next) : 'Phone number is required')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!snapshot.profileId) {
      setFeedback({ type: 'error', message: 'We could not find your profile. Please reload.' })
      return
    }

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFeedback({ type: 'error', message: 'Add at least a first and last name.' })
      return
    }

    const validation = validateE164(form.phone, countryCode)
    if (validation) {
      setPhoneError(validation)
      return
    }

    setSaving(true)
    setFeedback(null)

    try {
      const payload = {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        phone: form.phone,
        address: form.address.trim() || null,
        medical_conditions: form.medical.trim() || null,
        medications: form.medications.trim() || null,
        personal_info: form.personal.trim() || null,
        user_id: snapshot.profileId,
        active: true,
      }

      if (existing?.id) {
        const { error: updateError } = await supabase.from('elders').update(payload).eq('id', existing.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('elders').insert(payload).select('id').single()
        if (insertError) throw insertError
      }

      setFeedback({ type: 'success', message: 'Saved. Eva can now address your loved one by name.' })
      onSaved()
    } catch (err) {
      console.error('Failed to save elder details', err)
      setFeedback({ type: 'error', message: 'Could not save those details. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/80 px-6 py-6 shadow-sm">
      <StepHeader
        title="Elder basics"
        helper="Name, phone, and location so Eva sounds natural"
        completed={completed}
        icon={<User className="h-5 w-5" />}
      />

      <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-600">
            First name
            <input
              value={form.firstName}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, firstName: event.target.value }))
                setFeedback(null)
              }}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
              placeholder="Eva"
              required
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Last name
            <input
              value={form.lastName}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, lastName: event.target.value }))
                setFeedback(null)
              }}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
              placeholder="Jones"
              required
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-600">
            Phone number
            <div className="mt-1 flex rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-slate-100">
              <select
                value={countryCode}
                onChange={(event) => handleCountryChange(event.target.value as SupportedCountryCode)}
                className="rounded-l-2xl border-0 border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:outline-none"
              >
                <option value="+1">🇺🇸 +1</option>
                <option value="+31">🇳🇱 +31</option>
                <option value="+44">🇬🇧 +44</option>
              </select>
              <input
                type="tel"
                value={nationalNumber}
                onChange={(event) => handleDigitsChange(event.target.value)}
                placeholder={countryCode === '+1' ? '5551234567' : countryCode === '+31' ? '612345678' : '7123456789'}
                className="flex-1 rounded-r-2xl border-0 px-3 py-2 text-slate-900 focus:outline-none"
                required
              />
            </div>
            {phoneError && <p className="mt-1 text-xs text-rose-600">{phoneError}</p>}
          </label>

          <label className="text-sm font-medium text-slate-600">
            City or address
            <div className="mt-1 flex items-center rounded-2xl border border-slate-200 px-3">
              <MapPin className="mr-2 h-4 w-4 text-slate-400" />
              <input
                value={form.address}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, address: event.target.value }))
                  setFeedback(null)
                }}
                placeholder="e.g. Austin, TX"
                className="w-full border-0 py-2 text-slate-900 focus:outline-none"
              />
            </div>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-slate-600">
            Medical considerations
            <textarea
              value={form.medical}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, medical: event.target.value }))
                setFeedback(null)
              }}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Mobility limits, allergies, diagnoses…"
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Medications
            <textarea
              value={form.medications}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, medications: event.target.value }))
                setFeedback(null)
              }}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Name, dosage, reminders…"
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Personal notes
            <textarea
              value={form.personal}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, personal: event.target.value }))
                setFeedback(null)
              }}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Preferred name, favourite people, routines…"
            />
          </label>
        </div>

        {feedback && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm',
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-rose-200 bg-rose-50 text-rose-900',
            )}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {feedback.message}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Save anytime — data syncs instantly with the call team.
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save details'
              )}
            </button>
            {completed && (
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex items-center justify-center rounded-2xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                Continue
                <ChevronRight className="ml-1 h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </form>

      {existing && (
        <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p className="font-medium text-slate-800">
            Current profile · {existing.first_name} {existing.last_name}
          </p>
          <div className="mt-1 flex flex-wrap gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-slate-600">
              <Phone className="h-3.5 w-3.5" />
              {existing.phone}
            </span>
            {existing.address && (
              <span className="inline-flex items-center gap-1 text-slate-600">
                <MapPin className="h-3.5 w-3.5" />
                {existing.address}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function ScheduleStep({
  snapshot,
  completed,
  onSaved,
  onContinue,
}: {
  snapshot: B2COnboardingSnapshot
  completed: boolean
  onSaved: () => void
  onContinue: () => void
}) {
  const primarySchedule = snapshot.schedules[0] ?? null
  const [form, setForm] = useState<ScheduleFormState>(DEFAULT_SCHEDULE_FORM)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (primarySchedule) {
      setForm({
        id: primarySchedule.id,
        days: primarySchedule.daysOfWeek.length > 0 ? primarySchedule.daysOfWeek : DEFAULT_SCHEDULE_FORM.days,
        times: primarySchedule.callTimes.length > 0 ? primarySchedule.callTimes : DEFAULT_SCHEDULE_FORM.times,
        checklist:
          primarySchedule.checklist && primarySchedule.checklist.length > 0
            ? primarySchedule.checklist
            : DEFAULT_SCHEDULE_FORM.checklist,
        description: primarySchedule.description ?? '',
        retryAfter: primarySchedule.retryAfter ?? DEFAULT_SCHEDULE_FORM.retryAfter,
        maxRetries: primarySchedule.maxRetries ?? DEFAULT_SCHEDULE_FORM.maxRetries,
      })
    } else {
      setForm(DEFAULT_SCHEDULE_FORM)
    }
    setMessage(null)
  }, [primarySchedule?.id])

  const elderId = snapshot.elder?.id ?? null

  const toggleDay = (day: number) => {
    setForm((prev) => {
      const hasDay = prev.days.includes(day)
      const days = hasDay ? prev.days.filter((d) => d !== day) : [...prev.days, day]
      return { ...prev, days: days.sort((a, b) => a - b) }
    })
  }

  const updateTime = (index: number, time: string) => {
    setForm((prev) => {
      const nextTimes = [...prev.times]
      nextTimes[index] = time
      return { ...prev, times: nextTimes }
    })
  }

  const addTime = () => {
    setForm((prev) => ({ ...prev, times: [...prev.times, '09:00'] }))
  }

  const removeTime = (index: number) => {
    setForm((prev) => ({ ...prev, times: prev.times.filter((_, idx) => idx !== index) }))
  }

  const applyTemplate = (templateId: string) => {
    const template = SCHEDULE_TEMPLATES.find((preset) => preset.id === templateId)
    if (!template) return
    setForm((prev) => ({
      ...prev,
      days: [...template.days],
      times: [...template.times],
      description: prev.description || template.helper,
    }))
    setMessage(null)
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!elderId) {
      setMessage({ type: 'error', text: 'Add the elder profile first.' })
      return
    }

    const times = form.times.filter(Boolean)
    if (times.length === 0) {
      setMessage({ type: 'error', text: 'Add at least one call time.' })
      return
    }

    if (form.days.length === 0) {
      setMessage({ type: 'error', text: 'Select at least one day.' })
      return
    }

    setSaving(true)
    setMessage(null)

    const checklist = form.checklist.map((item) => item.trim()).filter(Boolean)
    const description = (form.description && form.description.trim()) || buildScheduleDescription(form.days, times)
    const frequency = form.days.length === 7 ? 'daily' : 'custom'

    try {
      if (form.id) {
        const { error: updateError } = await supabase
          .from('call_schedules')
          .update({
            call_times: times,
            days_of_week: form.days,
            checklist,
            description,
            frequency,
            retry_after_minutes: form.retryAfter,
            max_retries: form.maxRetries,
          })
          .eq('id', form.id)

        if (updateError) throw updateError

        await supabase
          .from('call_executions')
          .delete()
          .eq('elder_id', elderId)
          .eq('schedule_id', form.id)
          .eq('status', 'pending')

        const nextCall = calculateNextScheduledTime(form.days, times)
        if (nextCall) {
          await supabase.from('call_executions').insert({
            elder_id: elderId,
            schedule_id: form.id,
            call_type: 'scheduled',
            status: 'pending',
            scheduled_for: nextCall.toISOString(),
          })
        }
      } else {
        const { data: schedule, error: insertError } = await supabase
          .from('call_schedules')
          .insert({
            name: 'Personal check-in',
            call_times: times,
            days_of_week: form.days,
            checklist,
            description,
            frequency,
            retry_after_minutes: form.retryAfter,
            max_retries: form.maxRetries,
            active: true,
            org_id: null,
            schedule_type: 'b2c',
          })
          .select('id')
          .single()

        if (insertError || !schedule?.id) throw insertError || new Error('Missing schedule id')

        await supabase.from('elder_call_schedules').insert({
          elder_id: elderId,
          schedule_id: schedule.id,
          active: true,
        })

        const nextCall = calculateNextScheduledTime(form.days, times)
        if (nextCall) {
          await supabase.from('call_executions').insert({
            elder_id: elderId,
            schedule_id: schedule.id,
            call_type: 'scheduled',
            status: 'pending',
            scheduled_for: nextCall.toISOString(),
          })
        }
      }

      setMessage({ type: 'success', text: 'Schedule saved. Eva knows when to dial.' })
      onSaved()
    } catch (err) {
      console.error('Failed to save schedule', err)
      setMessage({ type: 'error', text: 'Unable to save that plan. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/80 px-6 py-6 shadow-sm">
      <StepHeader
        title="Call schedule"
        helper="Tell Eva when to gently check in"
        completed={completed}
        icon={<Clock className="h-5 w-5" />}
      />

      {!elderId && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add the elder profile first, then you can craft the call plan.
        </div>
      )}

      <form className="mt-5 space-y-5" onSubmit={handleSave}>
        <div>
          <p className="text-sm font-medium text-slate-700">Quick templates</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {SCHEDULE_TEMPLATES.map((template) => {
              const selected =
                JSON.stringify(form.days) === JSON.stringify(template.days) &&
                JSON.stringify(form.times) === JSON.stringify(template.times)
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template.id)}
                  className={cn(
                    'rounded-2xl border px-3 py-3 text-left',
                    selected
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300',
                  )}
                >
                  <p className="text-sm font-semibold">{template.label}</p>
                  <p className={cn('text-xs', selected ? 'text-slate-200' : 'text-slate-500')}>
                    {template.helper}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700">Days</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DAY_OPTIONS.map((day) => {
              const selected = form.days.includes(day.value)
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm font-medium',
                    selected
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                  )}
                >
                  {day.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700">Times</p>
          <div className="mt-2 space-y-3">
            {form.times.map((time, index) => (
              <div key={`${time}-${index}`} className="flex items-center gap-2">
                <input
                  type="time"
                  value={time}
                  onChange={(event) => updateTime(index, event.target.value)}
                  className="w-40 rounded-2xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                  required
                />
                {form.times.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTime(index)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          {form.times.length < 3 && (
            <button type="button" onClick={addTime} className="mt-2 text-xs font-medium text-blue-600">
              + Add another time
            </button>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700">Call checkpoints</p>
          <p className="text-xs text-slate-500">Eva will ask about each item below and capture it in the report.</p>
          <div className="mt-3 space-y-2">
            {form.checklist.map((item, index) => (
              <div key={`checklist-${index}`} className="flex items-center gap-2">
                <input
                  value={item}
                  onChange={(event) => {
                    const next = [...form.checklist]
                    next[index] = event.target.value
                    setForm((prev) => ({ ...prev, checklist: next }))
                  }}
                  className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="e.g. Taken medication"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      checklist: prev.checklist.filter((_, idx) => idx !== index),
                    }))
                  }
                  className="text-xs font-medium text-slate-500 hover:text-slate-900"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, checklist: [...prev.checklist, ''] }))}
              className="text-xs font-semibold text-blue-600"
            >
              + Add custom checkpoint
            </button>
            <span className="text-xs text-slate-500">Quick add:</span>
            <div className="flex flex-wrap gap-2">
              {CHECKLIST_SUGGESTIONS.map((suggestion) => {
                const already = form.checklist.some(
                  (entry) => entry.trim().toLowerCase() === suggestion.toLowerCase(),
                )
                return (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={already}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        checklist: [...prev.checklist, suggestion],
                      }))
                    }
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs font-semibold transition',
                      already
                        ? 'border-blue-200 bg-blue-50 text-blue-500'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600',
                    )}
                  >
                    {suggestion}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Call guidance
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={4}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Explain the tone or objectives for this schedule."
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Retry after (minutes)
              <input
                type="number"
                min={5}
                max={120}
                value={form.retryAfter}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, retryAfter: Number(event.target.value) || 5 }))
                }
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Max retries per call
              <input
                type="number"
                min={0}
                max={5}
                value={form.maxRetries}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, maxRetries: Number(event.target.value) || 0 }))
                }
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>
        </div>

        {message && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm',
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-rose-200 bg-rose-50 text-rose-900',
            )}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {message.text}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Eva automatically calculates retries and next call windows.
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !elderId}
              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save plan'
              )}
            </button>
            {completed && (
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex items-center justify-center rounded-2xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                Continue
                <ChevronRight className="ml-1 h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </form>

      {primarySchedule && (
        <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p className="font-medium text-slate-800">Current plan</p>
          <p className="text-sm">
            {formatDays(primarySchedule.daysOfWeek)} at {formatTimes(primarySchedule.callTimes)}
          </p>
          {primarySchedule.description && (
            <p className="text-xs text-slate-500">{primarySchedule.description}</p>
          )}
        </div>
      )}
    </section>
  )
}

function ContactStep({
  snapshot,
  completed,
  onSaved,
  onContinue,
}: {
  snapshot: B2COnboardingSnapshot
  completed: boolean
  onSaved: () => void
  onContinue: () => void
}) {
  const existing = snapshot.contacts[0] ?? null
  const [form, setForm] = useState<ContactFormState>(DEFAULT_CONTACT_FORM)
  const [countryCode, setCountryCode] = useState<SupportedCountryCode>(detectCountryCodeFromE164(existing?.phone))
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (existing) {
      setForm({
        id: existing.id,
        name: existing.name,
        relation: existing.relation && RELATION_OPTIONS.includes(existing.relation as any)
          ? (existing.relation as string)
          : 'Other',
        customRelation:
          existing.relation && !RELATION_OPTIONS.includes(existing.relation as any)
            ? existing.relation
            : '',
        phone: existing.phone,
        email: existing.email ?? '',
      })
      setCountryCode(detectCountryCodeFromE164(existing.phone))
      setPhoneError(null)
    } else {
      setForm(DEFAULT_CONTACT_FORM)
      setCountryCode('+1')
    }
    setMessage(null)
  }, [existing?.id])

  const elderId = snapshot.elder?.id ?? null
  const nationalNumber = useMemo(() => getNationalNumber(form.phone, countryCode), [form.phone, countryCode])

  const handleDigitsChange = (value: string) => {
    const digits = sanitizeDigits(value)
    const full = composeE164(countryCode, digits)
    setForm((prev) => ({ ...prev, phone: full }))
    setPhoneError(full ? validateE164(full, countryCode) : 'Phone number is required')
  }

  const handleCountryChange = (next: SupportedCountryCode) => {
    setCountryCode(next)
    const digits = sanitizeDigits(getNationalNumber(form.phone, next))
    const full = composeE164(next, digits)
    setForm((prev) => ({ ...prev, phone: full }))
    setPhoneError(full ? validateE164(full, next) : 'Phone number is required')
  }

  const finalRelation =
    form.relation === 'Other' ? form.customRelation.trim() || 'Family contact' : form.relation

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!elderId) {
      setMessage({ type: 'error', text: 'Add the elder profile first.' })
      return
    }

    if (!form.name.trim()) {
      setMessage({ type: 'error', text: 'Name is required.' })
      return
    }

    if (form.relation === 'Other' && !form.customRelation.trim()) {
      setMessage({ type: 'error', text: 'Add the relationship label.' })
      return
    }

    const validation = validateE164(form.phone, countryCode)
    if (validation) {
      setPhoneError(validation)
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      if (form.id) {
        const { error: updateError } = await supabase
          .from('emergency_contacts')
          .update({
            name: form.name.trim(),
            phone: form.phone,
            email: form.email.trim() || null,
            active: true,
          })
          .eq('id', form.id)

        if (updateError) throw updateError

        await supabase
          .from('elder_emergency_contact')
          .update({ relation: finalRelation })
          .eq('elder_id', elderId)
          .eq('emergency_contact_id', form.id)
      } else {
        const { data: contact, error: insertError } = await supabase
          .from('emergency_contacts')
          .insert({
            name: form.name.trim(),
            phone: form.phone,
            email: form.email.trim() || null,
            active: true,
            org_id: null,
          })
          .select('id')
          .single()

        if (insertError || !contact?.id) throw insertError || new Error('Missing contact id')

        const nextPriority =
          (snapshot.contacts.reduce((max, current) => Math.max(max, current.priority ?? 0), 0) || 0) + 1

        await supabase.from('elder_emergency_contact').insert({
          elder_id: elderId,
          emergency_contact_id: contact.id,
          relation: finalRelation,
          'priority order': nextPriority,
        })
      }

      setMessage({ type: 'success', text: 'Contact saved. Escalations now have a backup.' })
      onSaved()
    } catch (err) {
      console.error('Failed to save contact', err)
      setMessage({ type: 'error', text: 'Could not save that contact. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/80 px-6 py-6 shadow-sm">
      <StepHeader
        title="Emergency contact"
        helper="Who should we call if Eva spots an issue?"
        completed={completed}
        icon={<Phone className="h-5 w-5" />}
      />

      <form className="mt-5 space-y-5" onSubmit={handleSave}>
        <label className="text-sm font-medium text-slate-700">
          Full name
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
            placeholder="Jamie Doe"
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Relationship
            <select
              value={form.relation}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, relation: event.target.value, customRelation: '' }))
              }
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
            >
              {RELATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {form.relation === 'Other' && (
            <label className="text-sm font-medium text-slate-700">
              Custom relation
              <input
                value={form.customRelation}
                onChange={(event) => setForm((prev) => ({ ...prev, customRelation: event.target.value }))}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                placeholder="Neighbour, cousin…"
                required
              />
            </label>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Phone number
            <div className="mt-1 flex rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-slate-100">
              <select
                value={countryCode}
                onChange={(event) => handleCountryChange(event.target.value as SupportedCountryCode)}
                className="rounded-l-2xl border-0 border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:outline-none"
              >
                <option value="+1">🇺🇸 +1</option>
                <option value="+31">🇳🇱 +31</option>
                <option value="+44">🇬🇧 +44</option>
              </select>
              <input
                type="tel"
                value={nationalNumber}
                onChange={(event) => handleDigitsChange(event.target.value)}
                placeholder={countryCode === '+1' ? '5551234567' : countryCode === '+31' ? '612345678' : '7123456789'}
                className="flex-1 rounded-r-2xl border-0 px-3 py-2 text-slate-900 focus:outline-none"
                required
              />
            </div>
            {phoneError && <p className="mt-1 text-xs text-rose-600">{phoneError}</p>}
          </label>
          <label className="text-sm font-medium text-slate-700">
            Email (optional)
            <div className="mt-1 flex items-center rounded-2xl border border-slate-200 px-3">
              <Mail className="mr-2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="contact@example.com"
                className="w-full border-0 py-2 text-slate-900 focus:outline-none"
              />
            </div>
          </label>
        </div>

        {message && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm',
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-rose-200 bg-rose-50 text-rose-900',
            )}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {message.text}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">We only reach out if Eva can’t get hold of you.</p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !elderId}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save contact'
              )}
            </button>
            {completed && (
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex items-center justify-center rounded-2xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                Continue
                <ChevronRight className="ml-1 h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </form>

      {existing && (
        <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p className="font-medium text-slate-800">Primary contact</p>
          <p>
            {existing.name} · {existing.relation || 'Family'}
          </p>
          <p className="text-xs text-slate-500">{existing.phone}</p>
        </div>
      )}
    </section>
  )
}

function BillingStep({
  snapshot,
  completed,
  billingParam,
  onRefresh,
  onContinue,
}: {
  snapshot: B2COnboardingSnapshot
  completed: boolean
  billingParam: string | null
  onRefresh: () => void
  onContinue: () => void
}) {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [action, setAction] = useState<'checkout' | 'portal' | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (billingParam === 'success') {
      setMessage({ type: 'success', text: 'Card added. Your trial is active.' })
    } else if (billingParam === 'cancelled') {
      setMessage({ type: 'error', text: 'Checkout cancelled. You can restart anytime.' })
    } else if (billingParam === 'required') {
      setMessage({
        type: 'error',
        text: 'An active subscription is required. Please add a payment method.',
      })
    }
  }, [billingParam])

  const trialEnds = snapshot.subscriptionPeriodEnd
    ? format(new Date(snapshot.subscriptionPeriodEnd), 'PPP')
    : null

  const handleCheckout = async () => {
    if (!defaultPriceId) {
      setMessage({
        type: 'error',
        text: 'Stripe price ID missing. Contact support.',
      })
      return
    }

    setAction('checkout')
    setMessage(null)
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: defaultPriceId }),
      })

      if (!response.ok) {
        throw new Error('Unable to start checkout')
      }

      const data = await response.json()
      window.location.href = data.url as string
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: 'Checkout failed. Please try again.' })
    } finally {
      setAction(null)
    }
  }

  const handlePortal = async () => {
    setAction('portal')
    setMessage(null)
    try {
      const response = await fetch('/api/stripe/create-portal-session', { method: 'POST' })
      if (!response.ok) throw new Error('Unable to open billing portal')
      const data = await response.json()
      window.location.href = data.url as string
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: 'Billing portal unavailable. Please try again.' })
    } finally {
      setAction(null)
    }
  }

  const statusLabel = snapshot.hasSubscription ? formatSubscriptionStatus(snapshot.subscriptionStatus) : 'Pending'

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/80 px-6 py-6 shadow-sm">
      <StepHeader
        title="Start Free Trial"
        helper="Eva needs a card on file to place calls (free trial first)"
        completed={completed}
        icon={<CreditCard className="h-5 w-5" />}
      />

      <div className="mt-5 space-y-4 text-sm text-slate-600">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">
            Status: <span className="text-slate-900">{statusLabel}</span>
          </p>
          <p className="text-xs text-slate-500">
            {trialEnds
              ? `Trial ends ${trialEnds}. We'll remind you before any charges.`
              : 'Add a card to unlock the 14-day free trial. No charges today.'}
          </p>
        </div>

        {message && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm',
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-rose-200 bg-rose-50 text-rose-900',
            )}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {message.text}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleCheckout}
            disabled={Boolean(action)}
            className="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {action === 'checkout' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting…
              </>
            ) : snapshot.hasSubscription ? (
              'Update payment method'
            ) : (
              'Add card & start trial'
            )}
          </button>
          <button
            type="button"
            onClick={handlePortal}
            disabled={!snapshot.hasSubscription || Boolean(action)}
            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {action === 'portal' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading…
              </>
            ) : (
              'Manage billing'
            )}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-white"
          >
            Refresh status
          </button>
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-white"
          >
            {showDetails ? 'Hide plan details' : 'Show plan details'}
          </button>
        </div>

        {showDetails && (
          <div className="mt-2">
            <SubscriptionManager />
          </div>
        )}

        {completed && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
            >
              Go to dashboard
              <ChevronRight className="ml-1 h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function formatDays(days: number[]): string {
  if (days.length === 7) return 'every day'
  if (days.length === 5 && [1, 2, 3, 4, 5].every((day) => days.includes(day))) return 'weekdays'
  return days
    .sort((a, b) => a - b)
    .map((day) => DAY_OPTIONS.find((option) => option.value === day)?.label ?? '')
    .filter(Boolean)
    .join(', ')
}

function formatTimes(times: string[]): string {
  return times.join(' · ')
}

function buildScheduleDescription(days: number[], times: string[]) {
  return `Eva checks in ${formatDays(days)} at ${formatTimes(times)}`
}

function formatSubscriptionStatus(status: string | null) {
  switch (status) {
    case 'trialing':
      return 'Trialing'
    case 'active':
      return 'Active'
    case 'past_due':
      return 'Past due'
    case 'incomplete':
    case 'incomplete_expired':
      return 'Incomplete'
    case 'unpaid':
      return 'Unpaid'
    case 'canceled':
      return 'Canceled'
    default:
      return 'Not active yet'
  }
}

