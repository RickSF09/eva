'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react'

type StatusState =
  | { type: 'error'; text: string }
  | { type: 'success'; text: string }
  | null

export default function InternalImpersonatePage() {
  const [email, setEmail] = useState('')
  const [nextPath, setNextPath] = useState('/')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<StatusState>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setStatus({ type: 'error', text: 'Enter a user email first.' })
      return
    }

    setLoading(true)
    setStatus(null)

    try {
      const response = await fetch('/api/internal/auth/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          next: nextPath,
        }),
      })

      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        url?: string
        target?: { email?: string; name?: string }
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create impersonation session.')
      }

      if (!data.url) {
        throw new Error('Missing login URL from server response.')
      }

      const displayTarget = data.target?.name?.trim() || data.target?.email || normalizedEmail
      setStatus({ type: 'success', text: `Opening session for ${displayTarget}...` })
      window.location.assign(data.url)
    } catch (error) {
      console.error(error)
      setStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to impersonate user.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-blue-100 p-2">
            <ShieldCheck className="h-5 w-5 text-blue-700" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-slate-900">Internal User Impersonation</h1>
            <p className="mt-1 text-sm text-slate-600">
              Start a one-time login session as a user by email. Use this only for support and monitoring.
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

      {status && (
        <div
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
            status.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          {status.type === 'error' && <AlertCircle className="h-4 w-4" />}
          {status.text}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            User email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
              autoComplete="off"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
              required
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Redirect path after login
            <input
              type="text"
              value={nextPath}
              onChange={(event) => setNextPath(event.target.value)}
              placeholder="/"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Default `/` is recommended and sends the user to the right app area automatically.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating session...
              </>
            ) : (
              'Log in as user'
            )}
          </button>
        </form>
      </section>
    </div>
  )
}
