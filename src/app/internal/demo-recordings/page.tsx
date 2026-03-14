'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Copy, Download, ExternalLink, Headphones, Loader2 } from 'lucide-react'
import type {
  DemoCallEmailSentFilter,
  DemoCallHasAudioFilter,
  DemoCallRangeFilter,
  DemoCallReviewItem,
  DemoCallsResponse,
} from '@/types/internal-demo-calls'

const PAGE_SIZE = 25

export default function InternalDemoRecordingsPage() {
  const [hasAudio, setHasAudio] = useState<DemoCallHasAudioFilter>('yes')
  const [emailSent, setEmailSent] = useState<DemoCallEmailSentFilter>('all')
  const [range, setRange] = useState<DemoCallRangeFilter>('30d')
  const [items, setItems] = useState<DemoCallReviewItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const hasMore = items.length < total
  const showingText = useMemo(() => `Showing ${items.length} of ${total} calls`, [items.length, total])

  const fetchCalls = async (offset: number, append: boolean) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setError(null)
    }

    try {
      const params = new URLSearchParams({
        hasAudio,
        emailSent,
        range,
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })

      const response = await fetch(`/api/internal/demo-calls?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      })

      const data = (await response.json().catch(() => ({}))) as DemoCallsResponse & { error?: string }
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load demo calls')
      }

      setTotal(data.total)
      setItems((prev) => (append ? [...prev, ...data.items] : data.items))
    } catch (nextError) {
      console.error(nextError)
      setError(nextError instanceof Error ? nextError.message : 'Failed to load demo calls')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    void fetchCalls(0, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAudio, emailSent, range])

  const copySessionId = async (sessionId: string) => {
    try {
      await navigator.clipboard.writeText(sessionId)
      setCopyStatus(`Copied session ID ${sessionId}`)
      window.setTimeout(() => setCopyStatus(null), 2000)
    } catch {
      setCopyStatus('Failed to copy session ID')
      window.setTimeout(() => setCopyStatus(null), 2000)
    }
  }

  const downloadRecording = async (item: DemoCallReviewItem) => {
    if (!item.audioUrl) return

    try {
      setDownloadingId(item.id)
      const response = await fetch(item.audioUrl)
      if (!response.ok) throw new Error(`Download failed (${response.status})`)

      const blob = await response.blob()
      const objectUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `${item.sessionId}.webm`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(objectUrl)
    } catch (nextError) {
      console.error(nextError)
      setError('Failed to download recording.')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-blue-100 p-2">
            <Headphones className="h-5 w-5 text-blue-700" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-slate-900">Demo Recordings Review</h1>
            <p className="mt-1 text-sm text-slate-600">
              Internal read-only queue for website demo voice calls from <span className="font-semibold">demo_calls</span>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/internal"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Internal home
            </Link>
            <Link
              href="/app/home"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to app
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm font-medium text-slate-700">
            Has recording
            <select
              value={hasAudio}
              onChange={(event) => setHasAudio(event.target.value as DemoCallHasAudioFilter)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
            >
              <option value="yes">Yes (default)</option>
              <option value="no">No</option>
              <option value="all">All</option>
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Email status
            <select
              value={emailSent}
              onChange={(event) => setEmailSent(event.target.value as DemoCallEmailSentFilter)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
            >
              <option value="all">All (default)</option>
              <option value="sent">Sent</option>
              <option value="unsent">Unsent</option>
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Time range
            <select
              value={range}
              onChange={(event) => setRange(event.target.value as DemoCallRangeFilter)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
            >
              <option value="30d">Last 30 days (default)</option>
              <option value="7d">Last 7 days</option>
              <option value="all">All</option>
            </select>
          </label>

          <div className="flex items-end">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {showingText}
            </div>
          </div>
        </div>

        {copyStatus && (
          <p className="mt-3 text-sm text-slate-600">{copyStatus}</p>
        )}
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <section className="space-y-4">
        {loading && (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 text-sm text-slate-600 shadow-sm">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
            Loading demo calls...
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 text-sm text-slate-600 shadow-sm">
            No demo calls matched these filters.
          </div>
        )}

        {items.map((item) => (
          <article key={item.id} className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {item.leadEmail || item.leadName || 'Anonymous demo user'}
                </p>
                <p className="text-xs text-slate-500">
                  {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'No timestamp'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    item.hasAudio
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
                >
                  {item.hasAudio ? 'Recording available' : 'No recording'}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    item.emailSent
                      ? 'border-blue-200 bg-blue-50 text-blue-800'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  {item.emailSent ? 'Email sent' : 'Email not sent'}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
              <p>
                <span className="font-semibold text-slate-900">Session:</span> {item.sessionId}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Lead name:</span> {item.leadName || 'Unknown'}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Tokens:</span> {item.totalTokens ?? '—'}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Cost:</span>{' '}
                {typeof item.totalCostUsd === 'number' ? `$${item.totalCostUsd.toFixed(6)}` : '—'}
              </p>
            </div>

            {item.transcriptPreview && (
              <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">Transcript preview:</span> {item.transcriptPreview}
              </p>
            )}

            <div className="mt-4 space-y-3">
              {item.audioUrl ? (
                <div className="rounded-xl border border-slate-200 bg-white p-2">
                  <audio controls src={item.audioUrl} className="block h-14 w-full min-h-[3.5rem]">
                    Your browser does not support the audio element.
                  </audio>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  No audio URL saved for this demo call.
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {item.audioUrl && (
                  <button
                    type="button"
                    onClick={() => void downloadRecording(item)}
                    disabled={downloadingId === item.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {downloadingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Download
                  </button>
                )}
                {item.audioUrl && (
                  <a
                    href={item.audioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open recording
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => void copySessionId(item.sessionId)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                  Copy session ID
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      {!loading && hasMore && (
        <div className="pb-4">
          <button
            type="button"
            onClick={() => void fetchCalls(items.length, true)}
            disabled={loadingMore}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading more...
              </>
            ) : (
              'Load more'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
