'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useB2COnboardingSnapshot } from '@/hooks/useB2COnboarding'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { OrganizationSetup } from '@/components/onboarding/OrganizationSetup'
import { supabase } from '@/lib/supabase'

type AccountType = 'b2b' | 'b2c'

function isRecoveryFlow(searchParams: ReturnType<typeof useSearchParams>) {
  if (searchParams.get('type') === 'recovery') return true

  if (typeof window !== 'undefined') {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : ''
    if (hash) {
      const hashParams = new URLSearchParams(hash)
      return hashParams.get('type') === 'recovery'
    }
  }

  return false
}

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const { organizations, loading: orgLoading } = useOrganizations()
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [accountType, setAccountType] = useState<AccountType | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const {
    loading: b2cOnboardingLoading,
    isComplete: b2cOnboardingComplete,
  } = useB2COnboardingSnapshot({
    enabled: Boolean(user && accountType === 'b2c'),
  })

  // Check for password reset flow before any other logic
  useEffect(() => {
    const isRecovery = isRecoveryFlow(searchParams)

    if (isRecovery) {
       // Preserve query parameters so the reset page can handle the exchange
       const queryString = searchParams.toString()
       router.replace(`/reset-password?${queryString}`)
    }
  }, [searchParams, router])

  useEffect(() => {
    const isRecovery = isRecoveryFlow(searchParams)
    
    if (isRecovery) return

    if (!user) {
      setAccountType(null)
      return
    }

    let active = true
    setProfileLoading(true)

    const fetchProfile = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('account_type')
          .eq('auth_user_id', user.id)
          .maybeSingle()

        if (!active) return

        if (data?.account_type === 'b2b' || data?.account_type === 'b2c') {
          setAccountType(data.account_type)
        } else {
          setAccountType('b2b')
        }
      } finally {
        if (active) {
          setProfileLoading(false)
        }
      }
    }

    fetchProfile()

    return () => {
      active = false
    }
  }, [user, searchParams])

  useEffect(() => {
    const isRecovery = isRecoveryFlow(searchParams)
    
    if (isRecovery) return

    if (!user || authLoading || profileLoading) {
      return
    }

    if (accountType === 'b2c') {
      if (b2cOnboardingLoading) {
        return
      }
      router.replace(b2cOnboardingComplete ? '/app/home' : '/app/onboarding')
    } else if (accountType === 'b2b' && !orgLoading) {
      if (organizations.length > 0) {
        router.replace('/b2b/dashboard')
      }
    }
  }, [
    user,
    authLoading,
    profileLoading,
    accountType,
    b2cOnboardingLoading,
    b2cOnboardingComplete,
    orgLoading,
    organizations.length,
    router,
    searchParams,
  ])

  const showOrganizationSetup = useMemo(() => {
    return (
      !!user &&
      accountType === 'b2b' &&
      !authLoading &&
      !profileLoading &&
      !orgLoading &&
      organizations.length === 0
    )
  }, [user, accountType, authLoading, profileLoading, orgLoading, organizations.length])

  // If handling recovery flow, show spinner while redirecting
  const isRecovery = isRecoveryFlow(searchParams)
  
  if (isRecovery) {
     return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-4 text-slate-600">Redirecting to password reset...</p>
        </div>
      </div>
    )
  }

  if (
    authLoading ||
    profileLoading ||
    (accountType === 'b2b' && orgLoading) ||
    (accountType === 'b2c' && user && b2cOnboardingLoading)
  ) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your workspace…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        {authMode === 'login' ? (
          <LoginForm onToggleMode={() => setAuthMode('signup')} />
        ) : (
          <SignUpForm onToggleMode={() => setAuthMode('login')} />
        )}
      </div>
    )
  }

  if (showOrganizationSetup) {
    return (
      <OrganizationSetup onComplete={() => router.replace('/b2b/dashboard')} />
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
        <p className="mt-4 text-slate-600">Redirecting to your workspace…</p>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
