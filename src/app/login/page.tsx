'use client'

import { FormEvent, Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { supabase } from '@/lib/supabase'

type TotpFactor = {
  id: string
  factor_type?: string
  status?: 'verified' | 'unverified'
}

function extractTotpFactor(raw: any): TotpFactor | null {
  if (!raw) return null
  const list = (raw.totp as TotpFactor[]) ?? (raw.factors as TotpFactor[]) ?? []
  const totpList = Array.isArray(list) ? list.filter((f) => f.factor_type === undefined || f.factor_type === 'totp') : []
  return totpList.find((f) => f.status === 'verified') ?? totpList[0] ?? null
}

function MfaChallenge({
  factorId,
  onSuccess,
  onCancel,
}: {
  factorId: string
  onSuccess: () => Promise<void> | void
  onCancel: () => Promise<void> | void
}) {
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setVerifying(true)
    setError('')

    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: code.trim(),
      })
      if (error) {
        setError('The code was incorrect. Please try again.')
        return
      }
      await onSuccess()
    } catch (err) {
      console.error('Failed to verify MFA code', err)
      setError('Unable to verify code right now. Try again.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Enter your 6-digit code</h1>
          <p className="text-gray-600 text-sm">Open your authenticator app to continue.</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Authenticator code
            </label>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="123456"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={verifying || code.trim().length < 6}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {verifying ? 'Verifying…' : 'Verify and continue'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            Use a different account
          </button>
          <button
            type="button"
            onClick={async () => {
              setCode('')
              setError('')
            }}
            className="text-blue-600 hover:text-blue-700"
          >
            Enter a new code
          </button>
        </div>
      </div>
    </div>
  )
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [needsMfa, setNeedsMfa] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [mfaSetupError, setMfaSetupError] = useState('')

  // Check if this is a password recovery flow
  const isRecoveryFlow = useCallback(() => {
    // Only recovery links should reach reset-password. Signup/magic links can also carry code/token params.
    if (searchParams.get('type') === 'recovery') {
      return true
    }
    
    // Also check URL hash (Supabase sometimes uses hash fragments).
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : ''
      const hashParams = new URLSearchParams(hash)
      if (hashParams.get('type') === 'recovery') {
        return true
      }
    }
    
    return false
  }, [searchParams])

  useEffect(() => {
    const checkAal = async () => {
      if (loading) return
      if (!user) {
        setNeedsMfa(false)
        setMfaFactorId(null)
        return
      }

      setMfaSetupError('')

      // Check if this is a password recovery flow - redirect to reset page
      if (isRecoveryFlow()) {
        const params = searchParams.toString()
        router.replace(`/reset-password?${params}`)
        return
      }

      try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (error) throw error

        if (data?.nextLevel === 'aal2' && data?.currentLevel !== 'aal2') {
          const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
          if (factorsError) throw factorsError

          const totpFactor = extractTotpFactor(factors)
          if (!totpFactor) {
            setMfaSetupError('Two-factor is required but no authenticator factor was found.')
            return
          }
          setMfaFactorId(totpFactor.id)
          setNeedsMfa(true)
        } else {
          router.replace('/')
        }
      } catch (err) {
        console.error('Failed to check MFA status', err)
        setMfaSetupError('Unable to complete sign in. Please try again.')
      }
    }

    void checkAal()
  }, [user, loading, router, searchParams, isRecoveryFlow])

  // If recovery flow detected, show loading while redirecting
  if (user && isRecoveryFlow()) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-4 text-slate-600">Redirecting to password reset...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {needsMfa && mfaFactorId ? (
        <MfaChallenge
          factorId={mfaFactorId}
          onSuccess={() => router.replace('/')}
          onCancel={async () => {
            await supabase.auth.signOut()
            setNeedsMfa(false)
            setMfaFactorId(null)
          }}
        />
      ) : (
        <>
          {mfaSetupError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 shadow-sm">
              {mfaSetupError}
            </div>
          )}
          {mode === 'login' ? (
            <LoginForm onToggleMode={() => setMode('signup')} />
          ) : (
            <SignUpForm onToggleMode={() => setMode('login')} />
          )}
        </>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}
