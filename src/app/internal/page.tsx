'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ElderConsentRow = {
  id: string
  first_name: string
  last_name: string
  phone: string
  consent_status: string | null
  consent_decision_at: string | null
  consent_obtained_at: string | null
  consent_recording_storage_path: string | null
  consent_recorded_by: string | null
  consent_notes: string | null
  carer_first_name: string | null
  carer_last_name: string | null
  updated_at: string
}

function ConsentCallScript({
  elderFirstName,
  carerFirstName,
}: {
  elderFirstName: string | null
  carerFirstName: string | null
}) {
  const [open, setOpen] = useState(false)

  const elder = elderFirstName || '[Elder]'
  const carer = carerFirstName || '[Carer]'

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-blue-900">Consent Call Script</p>
          <p className="text-xs text-blue-700">Reference script for making the consent call</p>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-blue-600" />
        ) : (
          <ChevronDown className="h-4 w-4 text-blue-600" />
        )}
      </button>

      {open && (
        <div className="border-t border-blue-200 px-5 py-4 text-sm leading-relaxed text-slate-800">
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
            <p className="font-semibold">Important reminders</p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              <li>This call <strong>must be recorded</strong> for compliance evidence.</li>
              <li>A clear &quot;Yes, I agree&quot; is required for each consent question.</li>
              <li>Any confusion, silence, or &quot;No&quot; must be treated as refusal.</li>
              <li>Consent is obtained in <strong>two parts</strong>: (1) recording &amp; transcription, (2) health data processing &amp; sharing.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Opening</p>
              <p>
                &quot;Hello, this is a call from <strong>DailyFriend</strong> for{' '}
                <strong className="text-blue-700">{elder}</strong>. Your family member,{' '}
                <strong className="text-blue-700">{carer}</strong>, has set up a new service for you.
              </p>
              <p className="mt-2">
                Before we begin, I need to let you know that <strong>this setup call is being recorded</strong> so we
                have a record of your permissions.
              </p>
              <p className="mt-2">
                DailyFriend is the service provider processing this information. If you ever want to stop the service
                or ask questions later, you can tell Eva during a call, tell{' '}
                <strong className="text-blue-700">{carer}</strong>, or contact us at{' '}
                <strong>Rick@dailyfriend.co.uk / +31643804438</strong>.
              </p>
              <p className="mt-2">Is it okay to record this setup call?&quot;</p>
            </div>

            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2 text-xs text-rose-800">
              Wait for a clear &quot;Yes&quot;. If &quot;No&quot; or unsure &rarr; terminate the call.
            </div>

            <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Explain the service</p>
              <p>&quot;Thank you.</p>
              <p className="mt-2">
                The service is a daily phone call from our friendly AI assistant, Eva. Eva will call you each day to
                check in, see how you are, and have a friendly chat.
              </p>
              <p className="mt-2">
                To help your family look after you, your calls with Eva will be{' '}
                <strong>recorded and transcribed</strong>. This means we will have a text version of the conversation.
              </p>
              <p className="mt-2">
                We use this information to create a summary for your family, which can include details about your
                health and wellbeing, such as your mood, if you are in any pain, and if you&apos;ve taken your
                medication.
              </p>
              <p className="mt-2">
                This can include <strong>health information</strong>, and we need your{' '}
                <strong>explicit permission</strong> to process it.
              </p>
              <p className="mt-3">The service involves:</p>
              <ol className="mt-1 list-decimal pl-5 space-y-1">
                <li>Daily recorded phone calls from our AI assistant, Eva.</li>
                <li>
                  Transcribing the conversation and processing it to understand your health and wellbeing.
                </li>
                <li>
                  Sharing a summary with your family member,{' '}
                  <strong className="text-blue-700">{carer}</strong>.
                </li>
                <li>Following any schedule or checklist your carer sets for these check-ins.</li>
                <li>
                  Storing helpful details you share (like preferences or routines) to make future calls more
                  personal.
                </li>
              </ol>
              <p className="mt-3">
                You can ask to stop the service at any time. To stop, you can say:{' '}
                <strong>&apos;Eva, stop the service&apos;</strong>.
              </p>
              <p className="mt-2">
                We store recordings and transcripts securely and only share summaries with{' '}
                <strong className="text-blue-700">{carer}</strong> (and any care team they authorise).&quot;
              </p>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Consent Part 1 &mdash; Recording &amp; transcription
              </p>
              <p>
                &quot;I&apos;m now going to ask for your consent in two parts.
              </p>
              <p className="mt-2">
                First: Do you agree to receive these calls and have the calls{' '}
                <strong>recorded and transcribed</strong>? Please say <strong>&apos;Yes, I agree&apos;</strong> or{' '}
                <strong>&apos;No, I do not agree&apos;</strong>.&quot;
              </p>
            </div>

            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2 text-xs text-rose-800">
              Must capture a clear, unambiguous &quot;Yes, I agree&quot;. Anything else (confusion, silence, &quot;No&quot;) = refusal.
            </div>

            <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Consent Part 2 &mdash; Health data processing &amp; sharing
              </p>
              <p>
                [If &quot;Yes, I agree&quot;]: &quot;Thank you.
              </p>
              <p className="mt-2">
                Second: Do you agree that DailyFriend can use those recordings and transcripts to{' '}
                <strong>process information about your health and wellbeing</strong> (like mood, pain, and
                medication), and <strong>share a summary</strong> with your family member,{' '}
                <strong className="text-blue-700">{carer}</strong>? Please say{' '}
                <strong>&apos;Yes, I agree&apos;</strong> or <strong>&apos;No, I do not agree&apos;</strong>.&quot;
              </p>
            </div>

            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2 text-xs text-rose-800">
              Must capture a clear, unambiguous &quot;Yes, I agree&quot;. Anything else = refusal.
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">If consent granted</p>
                <p>
                  &quot;Thank you for your consent. Your DailyFriend service is now active. Your first call will be
                  scheduled soon. If you ever want to stop, just say: <strong>&apos;Eva, stop the service&apos;</strong>.
                  Goodbye.&quot;
                </p>
              </div>
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-rose-700">If consent refused</p>
                <p>
                  &quot;That&apos;s no problem. Thank you for your time. We will not set up the service and will let{' '}
                  <strong className="text-blue-700">{carer}</strong> know. Goodbye.&quot;
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function InternalConsentPage() {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<ElderConsentRow[]>([])
  const [selectedElderId, setSelectedElderId] = useState<string | null>(null)
  const [decision, setDecision] = useState<'granted' | 'refused'>('granted')
  const [notes, setNotes] = useState('')
  const [recordingFile, setRecordingFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const selected = useMemo(
    () => results.find((elder) => elder.id === selectedElderId) ?? null,
    [results, selectedElderId],
  )

  const loadResults = async (nextQuery = query) => {
    setSearching(true)
    setMessage(null)

    try {
      const search = nextQuery.trim()
      const response = await fetch(`/api/internal/elders/consent?q=${encodeURIComponent(search)}&limit=25`, {
        method: 'GET',
        cache: 'no-store',
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to load elders')
      }

      const elders = ((data as { elders?: ElderConsentRow[] }).elders ?? []).sort((a, b) =>
        (a.updated_at ?? '') < (b.updated_at ?? '') ? 1 : -1,
      )
      setResults(elders)

      if (elders.length > 0 && !selectedElderId) {
        setSelectedElderId(elders[0].id)
      } else if (selectedElderId && !elders.some((elder) => elder.id === selectedElderId)) {
        setSelectedElderId(elders[0]?.id ?? null)
      }
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to load elders' })
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    void loadResults('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault()
    await loadResults()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected) {
      setMessage({ type: 'error', text: 'Select an elder first.' })
      return
    }

    if (decision === 'granted' && !recordingFile && !selected.consent_recording_storage_path) {
      setMessage({ type: 'error', text: 'A recording file is required to grant consent.' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('elderId', selected.id)
      formData.append('decision', decision)
      formData.append('notes', notes)
      if (recordingFile) {
        formData.append('recordingFile', recordingFile)
      }

      const response = await fetch('/api/internal/elders/consent', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to update consent')
      }

      const updated = (data as { elder: ElderConsentRow }).elder

      setResults((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)))
      setMessage({
        type: 'success',
        text:
          updated.consent_status === 'granted'
            ? 'Consent marked as granted. Pending calls are scheduled automatically by the database.'
            : 'Consent marked as refused. Pending scheduled calls were cleared automatically.',
      })
      setRecordingFile(null)
      setNotes(updated.consent_notes ?? '')
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to update consent' })
    } finally {
      setSaving(false)
    }
  }

  const statusBadge = (status: string | null) => {
    if (status === 'granted') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
    if (status === 'refused') return 'border-rose-200 bg-rose-50 text-rose-800'
    return 'border-amber-200 bg-amber-50 text-amber-800'
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Consent Operations</h1>
        <p className="mt-1 text-sm text-slate-600">
          Record manual consent call outcomes. When consent is granted, the database automatically schedules pending
          calls.
        </p>
      </div>

      {message && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm',
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900',
          )}
        >
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {message.text}
        </div>
      )}

      <ConsentCallScript
        elderFirstName={selected?.first_name ?? null}
        carerFirstName={selected?.carer_first_name ?? null}
      />

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Left panel: search + elder list */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <form onSubmit={handleSearch} className="space-y-2">
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
              <Search className="mr-2 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or phone..."
                className="w-full border-0 bg-transparent py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={searching}
                className="ml-1 shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50"
              >
                {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Go'}
              </button>
            </div>
          </form>

          <div className="mt-3 max-h-[calc(100vh-320px)] space-y-1.5 overflow-y-auto">
            {results.length === 0 && !searching && (
              <p className="rounded-xl bg-slate-50 px-3 py-3 text-center text-sm text-slate-500">
                No elders found.
              </p>
            )}

            {results.map((elder) => {
              const isSelected = elder.id === selectedElderId
              return (
                <button
                  key={elder.id}
                  type="button"
                  onClick={() => {
                    setSelectedElderId(elder.id)
                    setNotes(elder.consent_notes ?? '')
                    setDecision(elder.consent_status === 'refused' ? 'refused' : 'granted')
                    setMessage(null)
                  }}
                  className={cn(
                    'w-full rounded-xl border px-3 py-2.5 text-left transition',
                    isSelected
                      ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {elder.first_name} {elder.last_name}
                    </p>
                    <span
                      className={cn(
                        'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                        statusBadge(elder.consent_status),
                      )}
                    >
                      {elder.consent_status ?? 'pending'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{elder.phone}</p>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => void loadResults()}
            disabled={searching}
            className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {searching ? 'Refreshing...' : 'Refresh list'}
          </button>
        </section>

        {/* Right panel: consent form */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {!selected ? (
            <div className="flex h-40 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
              Select an elder from the list to record their consent call outcome.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {selected.first_name} {selected.last_name}
                  </h2>
                  <p className="text-sm text-slate-500">{selected.phone}</p>
                  {selected.carer_first_name && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      Carer: {selected.carer_first_name} {selected.carer_last_name}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-semibold',
                    statusBadge(selected.consent_status),
                  )}
                >
                  {selected.consent_status ?? 'pending'}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition',
                    decision === 'granted'
                      ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200'
                      : 'border-slate-200 bg-white hover:border-slate-300',
                  )}
                >
                  <input
                    type="radio"
                    name="decision"
                    checked={decision === 'granted'}
                    onChange={() => setDecision('granted')}
                    className="mt-0.5 h-4 w-4 accent-emerald-600"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">Grant consent</span>
                    <span className="block text-xs text-slate-500">
                      Marks consent as granted and triggers call scheduling.
                    </span>
                  </span>
                </label>
                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition',
                    decision === 'refused'
                      ? 'border-rose-300 bg-rose-50 ring-1 ring-rose-200'
                      : 'border-slate-200 bg-white hover:border-slate-300',
                  )}
                >
                  <input
                    type="radio"
                    name="decision"
                    checked={decision === 'refused'}
                    onChange={() => setDecision('refused')}
                    className="mt-0.5 h-4 w-4 accent-rose-600"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">Refuse consent</span>
                    <span className="block text-xs text-slate-500">
                      Keeps service inactive and clears pending calls.
                    </span>
                  </span>
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Recording file {decision === 'granted' ? '(recommended)' : '(optional)'}
                <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
                  <Upload className="mr-2 h-4 w-4 text-slate-400" />
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(event) => setRecordingFile(event.target.files?.[0] ?? null)}
                    className="w-full py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-2 file:py-1 file:text-xs file:font-semibold"
                  />
                </div>
                {recordingFile && (
                  <span className="mt-1 block text-xs text-slate-500">{recordingFile.name}</span>
                )}
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Notes (optional)
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Call summary, anything relevant for audit trail..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100"
                />
              </label>

              {selected.consent_recording_storage_path && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  <p className="font-semibold text-slate-700">Existing evidence</p>
                  <p className="mt-1 break-all font-mono">{selected.consent_recording_storage_path}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className={cn(
                  'inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition',
                  decision === 'granted'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700',
                  'disabled:opacity-50',
                )}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : decision === 'granted' ? (
                  'Save: Consent Granted'
                ) : (
                  'Save: Consent Refused'
                )}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
