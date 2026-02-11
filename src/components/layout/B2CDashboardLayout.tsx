'use client'

import { B2CSidebar } from './B2CSidebar'
import { useAuth } from '@/components/auth/AuthProvider'
import { useB2COnboardingSnapshot } from '@/hooks/useB2COnboarding'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface B2CDashboardLayoutProps {
  children: React.ReactNode
}

export function B2CDashboardLayout({ children }: B2CDashboardLayoutProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const {
    loading: onboardingLoading,
    isComplete: onboardingComplete,
    error: onboardingError,
    refresh: refreshOnboardingSnapshot,
  } = useB2COnboardingSnapshot({ enabled: Boolean(user) })
  const [redirecting, setRedirecting] = useState(false)
  const [mfaChecking, setMfaChecking] = useState(false)
  const [recheckingOnboarding, setRecheckingOnboarding] = useState(false)
  const [hasRecheckedForPath, setHasRecheckedForPath] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, user, router])

  // Enforce AAL2 if a factor is enabled (Supabase exposes desired level via nextLevel)
  useEffect(() => {
    if (loading || onboardingLoading) return
    if (!user) return

    let active = true
    const checkAal = async () => {
      setMfaChecking(true)
      try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (!active) return
        if (error) {
          console.error('Failed to check MFA assurance level', error)
          return
        }
        if (data?.nextLevel === 'aal2' && data?.currentLevel !== 'aal2') {
          router.replace('/login?mfa=1')
        }
      } catch (err) {
        if (active) {
          console.error('Error enforcing MFA assurance level', err)
        }
      } finally {
        if (active) setMfaChecking(false)
      }
    }

    void checkAal()

    return () => {
      active = false
    }
  }, [user, loading, onboardingLoading, router])

  useEffect(() => {
    setHasRecheckedForPath(false)
  }, [pathname])

  useEffect(() => {
    let active = true

    if (!user) {
      setRedirecting(false)
      return () => {
        active = false
      }
    }

    if (onboardingLoading || onboardingError || recheckingOnboarding) {
      setRedirecting(false)
      return () => {
        active = false
      }
    }

    const onOnboardingPage = pathname?.startsWith('/app/onboarding')
    if (onOnboardingPage || onboardingComplete) {
      setRedirecting(false)
      return () => {
        active = false
      }
    }

    if (!hasRecheckedForPath) {
      setHasRecheckedForPath(true)
      setRedirecting(false)
      setRecheckingOnboarding(true)

      void refreshOnboardingSnapshot().finally(() => {
        if (active) {
          setRecheckingOnboarding(false)
        }
      })

      return () => {
        active = false
      }
    }

    setRedirecting(true)
    router.replace('/app/onboarding')

    return () => {
      active = false
    }
  }, [
    user,
    pathname,
    onboardingLoading,
    onboardingError,
    recheckingOnboarding,
    onboardingComplete,
    hasRecheckedForPath,
    refreshOnboardingSnapshot,
    router,
  ])

  if (loading || mfaChecking || (user && (onboardingLoading || recheckingOnboarding))) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Preparing your workspace...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (redirecting) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Taking you to onboarding...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <B2CSidebar />
      <main className="flex-1 overflow-auto px-8 py-8">
        {children}
      </main>
    </div>
  )
}
