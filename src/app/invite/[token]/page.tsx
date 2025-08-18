'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'

interface Invitation {
  id: string
  org_id: string
  email: string
  role: string
  status: string
  token: string
  expires_at: string | null
}

export default function AcceptInvitePage({ params }: { params: { token: string } }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [invite, setInvite] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!params?.token) return
    if (!user) {
      setLoading(false)
      return
    }
    fetchInvite()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.token, user?.id])

  const fetchInvite = async () => {
    try {
      setLoading(true)
      setError('')
      await ensureUserProfile()
      const { data, error } = await supabase
        .from('organization_invitations')
        .select('id, org_id, email, role, status, token, expires_at')
        .eq('token', params.token)
        .single()

      if (error) throw error
      setInvite(data as Invitation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invite')
    } finally {
      setLoading(false)
    }
  }

  const ensureUserProfile = async () => {
    if (!user) return
    await supabase
      .from('users')
      .upsert({
        auth_user_id: user.id,
        email: user.email ?? '',
        first_name: user.user_metadata?.first_name ?? '',
        last_name: user.user_metadata?.last_name ?? '',
      }, { onConflict: 'auth_user_id' })
  }

  const handleAccept = async () => {
    if (!invite || !user) return

    try {
      setLoading(true)
      setError('')

      if (invite.status !== 'pending') {
        setError('This invite is no longer valid')
        return
      }

      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        setError('This invite has expired')
        return
      }

      await ensureUserProfile()

      // Get internal user id
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      if (userError) throw userError

      // Create membership
      const { error: memberError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: userRecord?.id,
          org_id: invite.org_id,
          role: invite.role,
          active: true,
        })
      if (memberError) throw memberError

      // Mark invite accepted
      const { error: updateError } = await supabase
        .from('organization_invitations')
        .update({ status: 'accepted' })
        .eq('id', invite.id)
      if (updateError) throw updateError

      setSuccess('Invitation accepted! Redirecting…')
      // After accepting, ensure the user sets password & profile
      setTimeout(() => router.push('/onboarding/profile?next=/dashboard'), 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite')
    } finally {
      setLoading(false)
    }
  }

  // If user arrives already authenticated (via magic link redirect), auto-accept
  useEffect(() => {
    if (!user || !invite) return
    if (!emailMatches()) return
    // Auto-accept without extra click
    handleAccept()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, invite?.id])

  const handleSignIn = async () => {
    // Use root page for sign in/up flow
    router.push('/')
  }

  const emailMatches = () => {
    if (!user || !invite) return true // cannot verify until logged in
    return (user.email || '').toLowerCase() === invite.email.toLowerCase()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">Join Organization</h1>

        {loading && <p className="text-gray-600">Loading…</p>}
        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-3">{error}</div>}
        {success && <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 mb-3">{success}</div>}

        {!loading && user && invite && (
          <div className="space-y-4">
            <div className="text-gray-700">
              You have been invited to join this organization as <span className="font-medium">{invite.role}</span>.
            </div>

            {user && !emailMatches() && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                You are signed in as {user.email}. This invite was sent to {invite.email}. Please sign in with the invited email.
              </div>
            )}

            {user && emailMatches() && (
              <button
                onClick={handleAccept}
                disabled={authLoading || loading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                Accept Invitation
              </button>
            )}
          </div>
        )}

        {!loading && !user && (
          <div className="space-y-3">
            <div className="text-sm text-gray-700">Please sign in or create an account to accept this invitation.</div>
            <button onClick={handleSignIn} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Sign in / Sign up
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


