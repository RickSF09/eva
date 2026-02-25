'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Search, ShieldCheck, Upload } from 'lucide-react'

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
  updated_at: string
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

      setResults((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
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
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-blue-100 p-2">
            <ShieldCheck className="h-5 w-5 text-blue-700" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-slate-900">Internal Consent Operations</h1>
            <p className="mt-1 text-sm text-slate-600">
              Record manual consent call outcomes. When consent is granted, the database automatically schedules pending calls.
            </p>
          </div>
          <a
            href="/app/home"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to app
          </a>
        </div>
      </section>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <form onSubmit={handleSearch} className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Search elder
              <div className="mt-1 flex items-center rounded-2xl border border-slate-200 px-3">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Name or phone"
                  className="w-full border-0 py-2 text-sm text-slate-900 focus:outline-none"
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={searching}
              className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {searching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching…
                </>
              ) : (
                'Search'
              )}
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {results.length === 0 && !searching && (
              <p className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                No elders found.
              </p>
            )}

            {results.map((elder) => {
              const selectedRow = elder.id === selectedElderId
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
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                    selectedRow
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {elder.first_name} {elder.last_name}
                    </p>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusBadge(elder.consent_status)}`}>
                      {elder.consent_status ?? 'pending'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{elder.phone}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Updated {new Date(elder.updated_at).toLocaleString()}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          {!selected ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              Select an elder from the left to record the consent call outcome.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {selected.first_name} {selected.last_name}
                  </h2>
                  <p className="text-sm text-slate-600">{selected.phone}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge(selected.consent_status)}`}>
                  Current: {selected.consent_status ?? 'pending'}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 ${decision === 'granted' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                  <input
                    type="radio"
                    name="decision"
                    checked={decision === 'granted'}
                    onChange={() => setDecision('granted')}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">Grant consent</span>
                    <span className="block text-xs text-slate-600">Marks consent as granted and triggers automatic call scheduling.</span>
                  </span>
                </label>
                <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 ${decision === 'refused' ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white'}`}>
                  <input
                    type="radio"
                    name="decision"
                    checked={decision === 'refused'}
                    onChange={() => setDecision('refused')}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">Refuse consent</span>
                    <span className="block text-xs text-slate-600">Keeps the service inactive and clears pending scheduled calls.</span>
                  </span>
                </label>
              </div>

              <div className="grid gap-4">
                <label className="text-sm font-medium text-slate-700">
                  Recording file {decision === 'granted' ? '(recommended)' : '(optional)'}
                  <div className="mt-1 flex items-center rounded-2xl border border-slate-200 px-3">
                    <Upload className="mr-2 h-4 w-4 text-slate-400" />
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(event) => setRecordingFile(event.target.files?.[0] ?? null)}
                      className="w-full py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-semibold"
                    />
                  </div>
                  {recordingFile && <span className="mt-1 block text-xs text-slate-500">{recordingFile.name}</span>}
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Notes (optional)
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Call summary, exact phrasing used, anything relevant for audit trail..."
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                />
              </label>

              {selected.consent_recording_storage_path && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">Existing evidence</p>
                  {selected.consent_recording_storage_path && (
                    <p className="mt-1 break-all">Storage path: {selected.consent_recording_storage_path}</p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Save consent outcome'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void loadResults()}
                  disabled={searching}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Refresh list
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
