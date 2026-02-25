import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { isInternalAdminEmail } from '@/lib/internal-access'

interface InternalLayoutProps {
  children: ReactNode
}

export default async function InternalLayout({ children }: InternalLayoutProps) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error('Failed to load user for /internal access check', error)
    redirect('/login')
  }

  if (!user) {
    redirect('/login')
  }

  if (!isInternalAdminEmail(user.email)) {
    redirect('/')
  }

  return <>{children}</>
}
