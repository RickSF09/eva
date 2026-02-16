'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { SubscriptionManager } from '@/components/billing/SubscriptionManager'
import { TwoFactorSettings } from '@/components/auth/TwoFactorSettings'

interface ProfileForm {
  first_name: string
  last_name: string
  phone: string
}

interface EmailPreferences {
  email_cadence: 'off' | 'per_call' | 'daily' | 'weekly'
  only_if_call: boolean
  send_time_local: string
  timezone: string
  weekly_day_of_week: number | null
  include_transcript: boolean
  include_recording: boolean
  to_emails: string[]
}

const emptyProfile: ProfileForm = {
  first_name: '',
  last_name: '',
  phone: '',
}

const defaultEmailPrefs: EmailPreferences = {
  email_cadence: 'per_call',
  only_if_call: true,
  send_time_local: '18:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  weekly_day_of_week: 0, // Sunday
  include_transcript: false,
  include_recording: false,
  to_emails: [],
}

export default function B2CSettingsPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  useEffect(() => {
    if (!user) {
      router.replace('/login')
    }
  }, [user, router])

  const [profile, setProfile] = useState<ProfileForm>(emptyProfile)
  const [emailPrefs, setEmailPrefs] = useState<EmailPreferences>(defaultEmailPrefs)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingEmailPrefs, setSavingEmailPrefs] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [emailPrefsMessage, setEmailPrefsMessage] = useState<string | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [newEmailInput, setNewEmailInput] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)
  const [resetPasswordStatus, setResetPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Close edit mode when profile is successfully saved
  useEffect(() => {
    if (message && message.includes('successfully') && isEditingProfile) {
      const timer = setTimeout(() => {
        setIsEditingProfile(false)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [message, isEditingProfile])

  useEffect(() => {
    if (!user) {
      return
    }

    let active = true
    setLoading(true)

    const load = async () => {
      try {
        const [{ data: userData }, { data: prefsData }] = await Promise.all([
          supabase
            .from('users')
            .select('id, first_name, last_name, phone')
            .eq('auth_user_id', user.id)
            .single(),
          supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', user.id)
            .single()
            .then(async (result) => {
              if (result.data) {
                const { data: prefs } = await supabase
                  .from('user_notification_prefs')
                  .select('*')
                  .eq('user_id', result.data.id)
                  .maybeSingle()
                return { data: prefs }
              }
              return { data: null }
            })
        ])

        if (!active) return

        if (userData) {
          setProfile({
            first_name: userData.first_name ?? '',
            last_name: userData.last_name ?? '',
            phone: userData.phone ?? '',
          })
        } else {
          setProfile(emptyProfile)
        }

        if (prefsData) {
          // If daily digest is set, reset to default (per_call) since it's not available yet
          const cadence = prefsData.email_cadence === 'daily' ? defaultEmailPrefs.email_cadence : (prefsData.email_cadence ?? defaultEmailPrefs.email_cadence)
          
          setEmailPrefs({
            email_cadence: cadence,
            only_if_call: prefsData.only_if_call ?? defaultEmailPrefs.only_if_call,
            send_time_local: prefsData.send_time_local ? prefsData.send_time_local.substring(0, 5) : defaultEmailPrefs.send_time_local,
            timezone: prefsData.timezone ?? defaultEmailPrefs.timezone,
            weekly_day_of_week: prefsData.weekly_day_of_week ?? defaultEmailPrefs.weekly_day_of_week,
            include_transcript: prefsData.include_transcript ?? defaultEmailPrefs.include_transcript,
            include_recording: prefsData.include_recording ?? defaultEmailPrefs.include_recording,
            to_emails: Array.isArray(prefsData.to_emails) ? prefsData.to_emails : (prefsData.to_emails ? [prefsData.to_emails] : defaultEmailPrefs.to_emails),
          })
        } else {
          // Ensure default is set even if no prefsData exists
          setEmailPrefs(defaultEmailPrefs)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [user])

  const handleChange = (field: keyof ProfileForm) =>
    (event: FormEvent<HTMLInputElement>) => {
      const target = event.target as HTMLInputElement
      setProfile((prev) => ({ ...prev, [field]: target.value }))
      setMessage(null)
    }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return

    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone || null,
        })
        .eq('auth_user_id', user.id)

      if (error) throw error
      setMessage('Profile updated successfully.')
    } catch (error) {
      console.error('Failed to update profile', error)
      setMessage('We could not update your details. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.replace('/login')
  }

  const handleEmailPrefsChange = (field: keyof EmailPreferences) => 
    (event: FormEvent<HTMLInputElement | HTMLSelectElement>) => {
      const target = event.target as HTMLInputElement | HTMLSelectElement
      const value = target.type === 'checkbox' 
        ? (target as HTMLInputElement).checked 
        : target.value
      
      setEmailPrefs((prev) => ({ ...prev, [field]: value }))
      setEmailPrefsMessage(null)
    }

  const handleEmailPrefsSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return

    // Prevent saving if daily digest is selected (coming soon)
    if (emailPrefs.email_cadence === 'daily') {
      setEmailPrefsMessage('Daily digest is not available yet. Please select another option.')
      return
    }

    setSavingEmailPrefs(true)
    setEmailPrefsMessage(null)

    try {
      // Get user ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (userError || !userData) throw userError || new Error('User not found')

      // Convert time to proper format (HH:MM:SS)
      const sendTime = emailPrefs.send_time_local.includes(':') 
        ? `${emailPrefs.send_time_local}:00` 
        : `${emailPrefs.send_time_local}:00:00`

      const { error } = await supabase
        .from('user_notification_prefs')
        .upsert({
          user_id: userData.id,
          email_cadence: emailPrefs.email_cadence,
          only_if_call: emailPrefs.only_if_call,
          send_time_local: sendTime,
          timezone: emailPrefs.timezone,
          weekly_day_of_week: emailPrefs.email_cadence === 'weekly' ? emailPrefs.weekly_day_of_week : null,
          include_transcript: emailPrefs.include_transcript,
          include_recording: emailPrefs.include_recording,
          to_emails: emailPrefs.to_emails || [],
        }, {
          onConflict: 'user_id'
        })

      if (error) throw error
      setEmailPrefsMessage('Email preferences updated successfully.')
    } catch (error) {
      console.error('Failed to update email preferences', error)
      setEmailPrefsMessage('We could not update your email preferences. Please try again.')
    } finally {
      setSavingEmailPrefs(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!user?.email) {
      setResetPasswordStatus({
        type: 'error',
        message: 'No email is associated with your account.',
      })
      return
    }

    setResettingPassword(true)
    setResetPasswordStatus(null)

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (typeof window !== 'undefined' ? window.location.origin : null)
      const redirectTo = baseUrl ? `${baseUrl}/reset-password` : undefined

      const response = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, redirectTo }),
      })

      const data = await response.json().catch(() => ({} as { error?: string; code?: string }))

      if (!response.ok) {
        const isRateLimited =
          response.status === 429 ||
          data.code === 'over_email_send_rate_limit'

        if (isRateLimited) {
          setResetPasswordStatus({
            type: 'error',
            message: 'Too many reset attempts. Please wait 60 seconds and try again.',
          })
          return
        }

        throw new Error(data.error || 'Failed to request password reset')
      }

      setResetPasswordStatus({
        type: 'success',
        message: 'We emailed you a password reset link. Check your junk/spam folder if you do not see it.',
      })
    } catch (error) {
      console.error('Failed to send password reset email', error)
      setResetPasswordStatus({
        type: 'error',
        message: 'Unable to send reset email. Please try again.',
      })
    } finally {
      setResettingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage your account and preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Billing - Top Left */}
        <SubscriptionManager />

        {/* User Profile - Top Left */}
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h2 className="text-lg font-semibold text-slate-900">User Profile</h2>
          </div>

          {!isEditingProfile ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-600">Name</p>
                <p className="text-sm font-medium text-slate-900">
                  {profile.first_name && profile.last_name
                    ? `${profile.first_name} ${profile.last_name}`
                    : 'Not provided'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Email</p>
                <p className="text-sm font-medium text-slate-900">{user?.email || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Phone</p>
                <p className="text-sm font-medium text-slate-900">{profile.phone || 'Not provided'}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Edit Profile
              </button>
              {message && (
                <p className="text-sm text-green-600">{message}</p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <fieldset disabled={loading} className="space-y-4">
                <label className="flex flex-col gap-1 text-sm text-slate-600">
                  First name
                  <input
                    required
                    value={profile.first_name}
                    onInput={handleChange('first_name')}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-600">
                  Last name
                  <input
                    required
                    value={profile.last_name}
                    onInput={handleChange('last_name')}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-600">
                  Phone number
                  <input
                    value={profile.phone}
                    onInput={handleChange('phone')}
                    type="tel"
                    placeholder="(555) 123-4567"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                  />
                </label>
              </fieldset>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
              {message && (
                <p className="text-sm text-slate-600">{message}</p>
              )}
            </form>
          )}
        </div>

        {/* Notifications - Bottom Left */}
        <form onSubmit={handleEmailPrefsSubmit} className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
          </div>

          <div className="space-y-6">
            <fieldset disabled={loading || savingEmailPrefs} className="space-y-4">
              <label className="flex flex-col gap-1 text-sm text-slate-600">
                Email Addresses
                <p className="text-xs text-slate-500 mb-2">Add email addresses to receive notifications</p>
                <div className="space-y-2">
                  {emailPrefs.to_emails && Array.isArray(emailPrefs.to_emails) && emailPrefs.to_emails.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {emailPrefs.to_emails.map((email, index) => (
                        <div 
                          key={index} 
                          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                          onClick={(e) => {
                            // Prevent any clicks on the container from doing anything
                            // Only the button should handle removal
                            const target = e.target as HTMLElement
                            const button = target.closest('button[type="button"]')
                            // If click is NOT on the button, prevent and stop
                            if (!button) {
                              e.preventDefault()
                              e.stopPropagation()
                            }
                          }}
                        >
                          <span className="flex-1 text-sm text-slate-900 select-none">{email}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setEmailPrefs(prev => ({
                                ...prev,
                                to_emails: (prev.to_emails || []).filter((_, i) => i !== index)
                              }))
                              setEmailPrefsMessage(null)
                            }}
                            className="text-red-600 hover:text-red-700 flex-shrink-0 cursor-pointer"
                            disabled={loading || savingEmailPrefs}
                            aria-label={`Remove ${email}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={newEmailInput}
                      onChange={(e) => setNewEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const email = newEmailInput.trim()
                          const currentEmails = emailPrefs.to_emails || []
                          if (email && !currentEmails.includes(email)) {
                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                            if (emailRegex.test(email)) {
                              setEmailPrefs(prev => ({
                                ...prev,
                                to_emails: [...(prev.to_emails || []), email]
                              }))
                              setNewEmailInput('')
                              setEmailPrefsMessage(null)
                            }
                          }
                        }
                      }}
                      placeholder="person@example.com"
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                      disabled={loading || savingEmailPrefs}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const email = newEmailInput.trim()
                        const currentEmails = emailPrefs.to_emails || []
                        if (email && !currentEmails.includes(email)) {
                          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                          if (emailRegex.test(email)) {
                            setEmailPrefs(prev => ({
                              ...prev,
                              to_emails: [...(prev.to_emails || []), email]
                            }))
                            setNewEmailInput('')
                            setEmailPrefsMessage(null)
                          }
                        }
                      }}
                      disabled={loading || savingEmailPrefs || !newEmailInput.trim()}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600">
                Email Frequency
                <select
                  value={emailPrefs.email_cadence}
                  onChange={handleEmailPrefsChange('email_cadence')}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                >
                  <option value="off">Off</option>
                  <option value="per_call">After every call</option>
                  <option value="daily" disabled>Daily digest (Coming soon)</option>
                  <option value="weekly">Weekly digest</option>
                </select>
                {emailPrefs.email_cadence === 'daily' && (
                  <p className="text-xs text-slate-500 mt-1">Daily digest is coming soon. Please select another option.</p>
                )}
              </label>

              {emailPrefs.email_cadence !== 'off' && emailPrefs.email_cadence !== 'per_call' && (
                <>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={emailPrefs.only_if_call}
                      onChange={handleEmailPrefsChange('only_if_call')}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-200"
                    />
                    <span>Only send if a call was made</span>
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-slate-600">
                    Send Time
                    <input
                      type="time"
                      value={emailPrefs.send_time_local}
                      onChange={handleEmailPrefsChange('send_time_local')}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-slate-600">
                    Timezone
                    <select
                      value={emailPrefs.timezone}
                      onChange={handleEmailPrefsChange('timezone')}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                    >
                      {Intl.supportedValuesOf('timeZone').map((tz) => (
                        <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              {emailPrefs.email_cadence === 'weekly' && (
                <label className="flex flex-col gap-1 text-sm text-slate-600">
                  Day of Week
                  <select
                    value={emailPrefs.weekly_day_of_week ?? 0}
                    onChange={(e) => setEmailPrefs(prev => ({ ...prev, weekly_day_of_week: parseInt(e.target.value) }))}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </label>
              )}

              {emailPrefs.email_cadence === 'per_call' && (
                <>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={emailPrefs.include_transcript}
                      onChange={handleEmailPrefsChange('include_transcript')}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-200"
                    />
                    <span>Include transcript in email</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={emailPrefs.include_recording}
                      onChange={handleEmailPrefsChange('include_recording')}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-200"
                    />
                    <span>Include recording link in email</span>
                  </label>
                </>
              )}
            </fieldset>

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={savingEmailPrefs}
                className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {savingEmailPrefs ? 'Saving…' : 'Save preferences'}
              </button>
            </div>

            {emailPrefsMessage && (
              <p className="text-sm text-slate-600">{emailPrefsMessage}</p>
            )}
          </div>
        </form>

        {/* Security - Bottom Right */}
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h2 className="text-lg font-semibold text-slate-900">Security</h2>
          </div>

          <div className="space-y-5">
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 px-0 py-0">
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={resettingPassword}
                className="flex w-full items-center justify-between gap-3 rounded-xl border-none bg-transparent px-4 py-4 text-left transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">Change Password</p>
                  <p className="text-xs text-slate-600">Update your account password.</p>
                </div>
              </button>
              {resetPasswordStatus && (
                <p
                  className={`mx-4 mb-3 text-sm rounded-lg border px-3 py-2 ${
                    resetPasswordStatus.type === 'success'
                      ? 'border-green-100 bg-green-50 text-green-700'
                      : 'border-red-100 bg-red-50 text-red-700'
                  }`}
                >
                  {resetPasswordStatus.message}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <TwoFactorSettings />
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:bg-slate-100"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">Sign Out</p>
                <p className="text-xs text-slate-600">End your session securely.</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
