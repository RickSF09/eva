import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default async function B2BLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('account_type')
    .eq('auth_user_id', user.id)
    .single()

  if (error) {
    console.error('Failed to load user profile', error)
    redirect('/login')
  }

  if (profile?.account_type !== 'b2b') {
    redirect('/app')
  }

  return <DashboardLayout>{children}</DashboardLayout>
}


