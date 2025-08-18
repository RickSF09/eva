'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useOrganizations } from '@/hooks/useOrganizations'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { InviteMembers } from '@/components/organization/InviteMembers'
import { Settings, User, Building2, Bell, Shield } from 'lucide-react'

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { currentOrg } = useOrganizations()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchUserProfile()
    }
  }, [user])

  const fetchUserProfile = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
      } else {
        setUserProfile(data)
      }
    } catch (err) {
      console.error('Error fetching user profile:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your account and organization preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Profile */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <User className="w-5 h-5 text-gray-500 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">User Profile</h2>
            </div>

            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ) : userProfile ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <p className="text-gray-900">{userProfile.first_name} {userProfile.last_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{userProfile.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <p className="text-gray-900">{userProfile.phone || 'Not provided'}</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Edit Profile
                </button>
              </div>
            ) : (
              <p className="text-gray-600">Unable to load user profile</p>
            )}
          </div>

          {/* Organization Settings */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <Building2 className="w-5 h-5 text-gray-500 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Organization</h2>
            </div>

            {currentOrg ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                  <p className="text-gray-900">{currentOrg.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Plan</label>
                  <p className="text-gray-900 capitalize">{currentOrg.subscription_plan}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    currentOrg.subscription_status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {currentOrg.subscription_status}
                  </span>
                </div>
                <InviteMembers />
              </div>
            ) : (
              <p className="text-gray-600">No organization selected</p>
            )}
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <Bell className="w-5 h-5 text-gray-500 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-600">Receive updates via email</p>
                </div>
                <button className="bg-gray-200 w-12 h-6 rounded-full relative">
                  <div className="bg-white w-5 h-5 rounded-full absolute top-0.5 left-0.5 transition-transform"></div>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Escalation Alerts</p>
                  <p className="text-sm text-gray-600">Immediate alerts for emergencies</p>
                </div>
                <button className="bg-blue-600 w-12 h-6 rounded-full relative">
                  <div className="bg-white w-5 h-5 rounded-full absolute top-0.5 right-0.5 transition-transform"></div>
                </button>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <Shield className="w-5 h-5 text-gray-500 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Security</h2>
            </div>

            <div className="space-y-4">
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="font-medium text-gray-900">Change Password</div>
                <div className="text-sm text-gray-600">Update your account password</div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="font-medium text-gray-900">Two-Factor Authentication</div>
                <div className="text-sm text-gray-600">Add an extra layer of security</div>
              </button>
              <button 
                onClick={signOut}
                className="w-full text-left p-3 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
              >
                <div className="font-medium text-red-700">Sign Out</div>
                <div className="text-sm text-red-600">Sign out of your account</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
