'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { useOrganizations } from '@/hooks/useOrganizations'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { OrganizationSetup } from '@/components/onboarding/OrganizationSetup'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { organizations, currentOrg, loading: orgLoading } = useOrganizations()
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [userRecord, setUserRecord] = useState<any>(null)

  useEffect(() => {
    if (user) {
      fetchUserRecord()
    }
  }, [user])

  useEffect(() => {
    // If user is authenticated and has organizations, redirect to dashboard
    if (!authLoading && !orgLoading && user && organizations.length > 0) {
      router.push('/dashboard')
    }
  }, [user, organizations, authLoading, orgLoading, router])

  const fetchUserRecord = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user record:', error)
      } else {
        setUserRecord(data)
      }
    } catch (err) {
      console.error('Error fetching user record:', err)
    }
  }

  // Loading state
  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated - show auth forms
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        {authMode === 'login' ? (
          <LoginForm onToggleMode={() => setAuthMode('signup')} />
        ) : (
          <SignUpForm onToggleMode={() => setAuthMode('login')} />
        )}
      </div>
    )
  }

  // User exists but no organizations - show org setup
  if (!orgLoading && organizations.length === 0) {
    return (
      <OrganizationSetup 
        onComplete={() => window.location.reload()} 
      />
    )
  }

  // If we get here, user is authenticated and has organizations, but redirect hasn't happened yet
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}
