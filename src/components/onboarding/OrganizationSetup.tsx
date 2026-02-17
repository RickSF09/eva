'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Building2, Users, Plus } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useOrganizations } from '@/hooks/useOrganizations'

interface OrganizationSetupProps {
  onComplete: () => void
}

export function OrganizationSetup({ onComplete }: OrganizationSetupProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { refetch: fetchOrganizations } = useOrganizations()
  
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [orgName, setOrgName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [error, setError] = useState('')

  const handleExitSetup = async () => {
    setExiting(true)
    setError('')

    try {
      await supabase.auth.signOut()
      router.replace('/')
    } catch (error) {
      console.error('Error exiting setup:', error)
      setError(error instanceof Error ? error.message : 'Failed to exit setup')
    } finally {
      setExiting(false)
    }
  }

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgName.trim()) return

    setLoading(true)
    setError('')

    try {
      console.log('Starting organization creation process...')
      console.log('Current user:', user)

      // Test Supabase connection and authentication
      console.log('Testing Supabase connection...')
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Authentication error:', authError)
        throw new Error('Authentication failed. Please log in again.')
      }
      
      if (!authUser) {
        throw new Error('No authenticated user found. Please log in.')
      }
      
      console.log('Authentication successful:', authUser)

      // Step 1: Ensure user record exists in users table
      console.log('Step 1: Creating/updating user record...')
      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert({
          auth_user_id: user?.id,
          email: user?.email || '',
          first_name: user?.user_metadata?.first_name || '',
          last_name: user?.user_metadata?.last_name || ''
        }, {
          onConflict: 'auth_user_id'
        })
        .select()
        .single()

      if (userError) {
        console.error('User creation error:', userError)
        throw userError
      }

      console.log('User record created/updated:', userData)

      // Step 2: Create the organization
      console.log('Step 2: Creating organization...')
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName.trim(),
          subscription_plan: 'trial',
          subscription_status: 'active'
        })
        .select()
        .single()

      if (orgError) {
        console.error('Organization creation error:', orgError)
        console.error('Error details:', {
          message: orgError.message,
          details: orgError.details,
          hint: orgError.hint,
          code: orgError.code
        })
        
        // If it's a permissions error, provide helpful guidance
        if (orgError.code === '42501' || orgError.message.includes('permission')) {
          throw new Error('Permission denied. Please check your Supabase RLS policies or contact your administrator.')
        }
        
        throw orgError
      }

      console.log('Organization created:', orgData)

      // Step 3: Create user-organization link
      console.log('Step 3: Creating user-organization link...')
      const { data: userOrgData, error: userOrgError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: userData.id,
          org_id: orgData.id,
          role: 'admin',
          active: true
        })
        .select()
        .single()

      if (userOrgError) {
        console.error('User-organization link creation error:', userOrgError)
        throw userOrgError
      }

      console.log('User-organization link created:', userOrgData)
      
      // Refresh organizations list
      await fetchOrganizations()
      
      // Close the form
      setOrgName('')
      
      // Complete the setup
      onComplete()
      
    } catch (error) {
      console.error('Error creating organization:', error)
      setError(error instanceof Error ? error.message : 'Failed to create organization')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) return

    setLoading(true)
    setError('')

    try {
      // First ensure user record exists
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          auth_user_id: user?.id,
          email: user?.email || '',
          first_name: user?.user_metadata?.first_name || '',
          last_name: user?.user_metadata?.last_name || ''
        }, {
          onConflict: 'auth_user_id'
        })
        .select()
        .single()

      if (userError) {
        console.error('User creation error:', userError)
        throw userError
      }

      // Then try to join organization (this would need to be implemented based on your join logic)
      // For now, just show an error that this feature needs to be implemented
      setError('Join organization feature needs to be implemented')
      
    } catch (error) {
      console.error('Error joining organization:', error)
      setError(error instanceof Error ? error.message : 'Failed to join organization')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Set up your organization
            </h1>
            <p className="text-gray-600">
              Create a new organization or join an existing one
            </p>
          </div>

          <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
            <button
              onClick={() => setMode('create')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                mode === 'create'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Create new
            </button>
            <button
              onClick={() => setMode('join')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                mode === 'join'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Join existing
            </button>
          </div>

          {mode === 'create' ? (
            <form onSubmit={handleCreateOrganization} className="space-y-6">
              <div>
                <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-2">
                  Organization name
                </label>
                <input
                  id="orgName"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter organization name"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || exiting}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Create organization'}
              </button>

              <button
                type="button"
                onClick={handleExitSetup}
                disabled={loading || exiting}
                className="w-full border border-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-50 focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {exiting ? 'Exiting...' : 'Exit setup'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinOrganization} className="space-y-6">
              <div>
                <label htmlFor="joinCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Join code
                </label>
                <input
                  id="joinCode"
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter join code"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ask your administrator for the join code
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || exiting}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Joining...' : 'Join organization'}
              </button>

              <button
                type="button"
                onClick={handleExitSetup}
                disabled={loading || exiting}
                className="w-full border border-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-50 focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {exiting ? 'Exiting...' : 'Exit setup'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
