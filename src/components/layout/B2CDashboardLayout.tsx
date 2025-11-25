'use client'

import { B2CSidebar } from './B2CSidebar'
import { useAuth } from '@/components/auth/AuthProvider'
import { useB2COnboardingSnapshot } from '@/hooks/useB2COnboarding'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

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
  } = useB2COnboardingSnapshot({ enabled: Boolean(user) })
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, user, router])

  useEffect(() => {
    if (!user) {
      setRedirecting(false)
      return
    }

    const onOnboardingPage = pathname?.startsWith('/app/onboarding')

    if (!onboardingLoading && !onboardingComplete && !onOnboardingPage) {
      setRedirecting(true)
      router.replace('/app/onboarding')
    } else {
      setRedirecting(false)
    }
  }, [user, pathname, onboardingLoading, onboardingComplete, router])

  if (loading || (user && onboardingLoading)) {
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
