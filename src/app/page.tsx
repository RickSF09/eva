'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { useOrganizations } from '@/hooks/useOrganizations'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { OrganizationSetup } from '@/components/onboarding/OrganizationSetup'
import { supabase } from '@/lib/supabase'

type AccountType = 'b2b' | 'b2c'

export default function Home() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { organizations, loading: orgLoading } = useOrganizations()
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [accountType, setAccountType] = useState<AccountType | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
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
  }, [user])

  useEffect(() => {
    if (!user || authLoading || profileLoading) {
      return
    }

    if (accountType === 'b2c') {
      router.replace('/app/home')
    } else if (accountType === 'b2b' && !orgLoading) {
      if (organizations.length > 0) {
        router.replace('/b2b/dashboard')
      }
    }
  }, [user, authLoading, profileLoading, accountType, orgLoading, organizations.length, router])

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

  if (authLoading || profileLoading || (accountType === 'b2b' && orgLoading)) {
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

