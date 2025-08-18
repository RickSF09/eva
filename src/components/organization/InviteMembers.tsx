'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrganizations } from '@/hooks/useOrganizations'

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  token: string
  created_at: string
}

export function InviteMembers() {
  const { currentOrg } = useOrganizations()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'member' | 'admin'>('member')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [pendingInvites, setPendingInvites] = useState<Invitation[]>([])

  const isAdmin = useMemo(() => currentOrg?.role === 'admin', [currentOrg])

  useEffect(() => {
    if (currentOrg) {
      fetchInvites()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrg?.id])

  const fetchInvites = async () => {
    if (!currentOrg) return
    setError('')
    try {
      const { data, error } = await supabase
        .from('organization_invitations')
        .select('id,email,role,status,token,created_at')
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPendingInvites((data || []) as Invitation[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitations')
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentOrg) return
    if (!isAdmin) {
      setError('Only organization admins can invite members')
      return
    }
    if (!email.trim()) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: { org_id: currentOrg.id, email: email.trim(), role },
      })
      if (error) throw new Error((error as any).message || 'Failed to send invite')

      setSuccess(`Invitation email sent to ${email.trim()}.`)
      setEmail('')
      setRole('member')
      await fetchInvites()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite')
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async (inviteId: string) => {
    if (!isAdmin) return
    try {
      const { error } = await supabase
        .from('organization_invitations')
        .update({ status: 'revoked' })
        .eq('id', inviteId)

      if (error) throw error
      await fetchInvites()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invite')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-md font-semibold text-gray-900">Invite Members</h3>
        <p className="text-sm text-gray-600">Send an invitation link to add people to your organization.</p>
      </div>

      {!isAdmin && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          You must be an admin to invite members.
        </div>
      )}

      <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="person@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!isAdmin || loading}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={role}
            onChange={(e) => setRole(e.target.value as 'member' | 'admin')}
            disabled={!isAdmin || loading}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <button
            type="submit"
            disabled={!isAdmin || loading}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {loading ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 break-all">{success}</div>
      )}

      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Pending Invitations</h4>
        <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
          {pendingInvites.length === 0 && (
            <div className="p-4 text-sm text-gray-600">No invitations yet.</div>
          )}
          {pendingInvites.map((inv) => (
            <div key={inv.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">{inv.email}</div>
                <div className="text-xs text-gray-600">Role: {inv.role} • Status: {inv.status}</div>
              </div>
              <div className="flex items-center gap-2">
                {inv.status === 'pending' && isAdmin && (
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


