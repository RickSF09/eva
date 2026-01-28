'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type TotpFactor = {
  id: string
  factor_type?: string
  friendly_name?: string | null
  status?: 'verified' | 'unverified'
  created_at?: string
}

type EnrollData = {
  id: string
  type: string
  totp?: {
    qr_code: string
    secret: string
    uri: string
  }
}

function extractTotpFactors(raw: any): TotpFactor[] {
  if (!raw) return []
  if (Array.isArray(raw.totp)) return raw.totp as TotpFactor[]
  if (Array.isArray(raw.factors)) {
    return (raw.factors as TotpFactor[]).filter((f) => f.factor_type === 'totp')
  }
  return []
}

export function TwoFactorSettings() {
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [totpFactor, setTotpFactor] = useState<TotpFactor | null>(null)
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [qrOpen, setQrOpen] = useState(false)

  const statusLabel = useMemo(() => {
    if (loading) return 'Checking…'
    if (totpFactor?.status === 'verified') return 'Enabled'
    if (enrollData) return 'Enrolling'
    return 'Disabled'
  }, [loading, totpFactor, enrollData])

  useEffect(() => {
    void loadFactors()
  }, [])

  const loadFactors = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error
      const totpFactors = extractTotpFactors(data)
      const verified = totpFactors.find((f) => f.status === 'verified')
      setTotpFactor(verified ?? null)
      setEnrollData(null)
      setCode('')
    } catch (err) {
      console.error('Failed to load MFA factors', err)
      setError('Unable to load two-factor status right now.')
    } finally {
      setLoading(false)
    }
  }

  const startEnrollment = async () => {
    setWorking(true)
    setError(null)
    setMessage(null)
    setCode('')
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator app',
      })
      if (error) throw error
      if (!data?.id || !data?.totp) {
        throw new Error('Missing enrollment data')
      }
      setEnrollData(data as EnrollData)
      setTotpFactor(null)
    } catch (err: any) {
      const errorMessage = typeof err?.message === 'string' ? err.message : ''
      const status = err?.status ?? err?.code

      if (status === 422 || errorMessage.toLowerCase().includes('already exists')) {
        try {
          const { data, error } = await supabase.auth.mfa.listFactors()
          if (error) throw error
          const totpFactors = extractTotpFactors(data)
          const verified = totpFactors.find((f) => f.status === 'verified')
          if (verified) {
            setTotpFactor(verified)
            setEnrollData(null)
            setMessage('Two-factor is already enabled for your account.')
            return
          }

          const unverified = totpFactors.find((f) => f.status !== 'verified')
          if (unverified?.id) {
            await supabase.auth.mfa.unenroll({ factorId: unverified.id })
            const retry = await supabase.auth.mfa.enroll({
              factorType: 'totp',
              friendlyName: 'Authenticator app',
            })
            if (retry.error) throw retry.error
            if (!retry.data?.id || !retry.data?.totp) {
              throw new Error('Missing enrollment data')
            }
            setEnrollData(retry.data as EnrollData)
            setTotpFactor(null)
            setMessage('Previous setup was reset. Scan the new QR code to continue.')
            return
          }
        } catch (innerErr) {
          console.error('Failed to recover from existing 2FA factor', innerErr)
        }
      }

      console.error('Failed to start 2FA enrollment', err)
      setError('Could not start two-factor setup. Please try again.')
    } finally {
      setWorking(false)
    }
  }

  const cancelEnrollment = async () => {
    if (!enrollData?.id) {
      setEnrollData(null)
      setCode('')
      return
    }
    setWorking(true)
    setError(null)
    try {
      await supabase.auth.mfa.unenroll({ factorId: enrollData.id })
    } catch (err) {
      console.error('Failed to cancel enrollment', err)
    } finally {
      setEnrollData(null)
      setCode('')
      setWorking(false)
      void loadFactors()
    }
  }

  const verifyEnrollment = async (event: FormEvent) => {
    event.preventDefault()
    if (!enrollData?.id || !code.trim()) return
    setWorking(true)
    setError(null)
    setMessage(null)
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollData.id,
        code: code.trim(),
      })
      if (error) throw error
      setMessage('Authenticator app added. Next sign-in will require a 6-digit code.')
      setEnrollData(null)
      setCode('')
      await loadFactors()
    } catch (err) {
      console.error('Failed to verify TOTP code', err)
      setError('The code was incorrect or expired. Please try a new code.')
    } finally {
      setWorking(false)
    }
  }

  const disableTotp = async () => {
    if (!totpFactor?.id) return
    setWorking(true)
    setError(null)
    setMessage(null)
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id })
      if (error) throw error
      setMessage('Two-factor authentication turned off.')
      await loadFactors()
    } catch (err) {
      console.error('Failed to disable TOTP', err)
      setError('Could not disable two-factor right now.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="space-y-3">
      {!enrollData && (
          <button
            type="button"
            onClick={async () => {
            if (totpFactor) {
              const confirmed = window.confirm('Turn off two-factor authentication?')
              if (!confirmed) return
              await disableTotp()
              return
            }
            await startEnrollment()
          }}
          disabled={working || loading}
          className="flex w-full flex-col gap-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">Authenticator app (2FA)</p>
                <p className="text-xs text-slate-600">Use a 6-digit code from an authenticator app at sign in.</p>
              </div>
            <span className="inline-flex items-center self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {statusLabel}
            </span>
          </div>
          {totpFactor && (
            <span className="text-sm text-slate-700">
              Two-factor is turned on. You’ll be asked for a code when signing in.
            </span>
          )}
        </button>
      )}

      {enrollData && (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">Authenticator app (2FA)</p>
            <p className="text-xs text-slate-600">Use a 6-digit code from an authenticator app at sign in.</p>
          </div>
          <span className="inline-flex items-center self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {statusLabel}
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </div>
      )}

      {/* Enrollment view */}
      {enrollData && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-blue-100 p-2 text-blue-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c1.38 0 2.5-1.12 2.5-2.5S13.38 6 12 6s-2.5 1.12-2.5 2.5S10.62 11 12 11zM12 13c-2.33 0-7 1.17-7 3.5V19h14v-2.5C19 14.17 14.33 13 12 13z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Scan & verify</p>
              <p className="text-xs text-slate-500">Scan the QR code with Google Authenticator, 1Password, etc., then enter the 6-digit code.</p>
            </div>
          </div>

          {enrollData.totp?.qr_code && (
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-6">
              <button
                type="button"
                onClick={() => setQrOpen(true)}
                className="group relative h-32 w-32 rounded-lg border border-slate-200 bg-white p-2 transition hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Enlarge QR code"
              >
                <img
                  src={enrollData.totp.qr_code}
                  alt="Authenticator QR code"
                  className="h-full w-full rounded-md object-contain transition-transform group-hover:scale-105"
                />
                <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 shadow">
                  Click
                </span>
              </button>
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Can’t scan? Enter this key manually:</p>
                <code className="block w-full rounded-lg bg-white px-3 py-2 text-sm font-mono text-slate-800 border border-slate-200">
                  {enrollData.totp.secret}
                </code>
              </div>
            </div>
          )}

          <form onSubmit={verifyEnrollment} className="space-y-3">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              6-digit code
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="123456"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={working || code.trim().length < 6}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {working ? 'Verifying…' : 'Verify & enable'}
              </button>
              <button
                type="button"
                onClick={cancelEnrollment}
                disabled={working}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {qrOpen && enrollData?.totp?.qr_code && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            aria-label="Close QR code preview"
            onClick={() => setQrOpen(false)}
          />
          <div className="relative z-10 rounded-2xl bg-white p-4 shadow-xl">
            <button
              type="button"
              onClick={() => setQrOpen(false)}
              className="absolute right-3 top-3 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
            <img
              src={enrollData.totp.qr_code}
              alt="Authenticator QR code enlarged"
              className="h-72 w-72 rounded-lg bg-white object-contain p-2"
            />
          </div>
        </div>
      )}

    </div>
  )
}
