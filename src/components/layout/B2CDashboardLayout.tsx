'use client'

import { B2CSidebar } from './B2CSidebar'
import { useAuth } from '@/components/auth/AuthProvider'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface B2CDashboardLayoutProps {
  children: React.ReactNode
}

export function B2CDashboardLayout({ children }: B2CDashboardLayoutProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <B2CSidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
