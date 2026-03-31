'use client'

import { FormEvent, useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusState = { type: 'error' | 'success'; text: string } | null

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
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">User Impersonation</h1>
        <p className="mt-1 text-sm text-slate-600">
          Start a one-time login session as a user by email. Use this only for support and monitoring.
        </p>
      </div>

      {status && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm',
            status.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900',
          )}
        >
          {status.type === 'error' && <AlertCircle className="h-4 w-4" />}
          {status.text}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            User email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
              autoComplete="off"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100"
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
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Default `/` sends the user to the right app area automatically.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
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
