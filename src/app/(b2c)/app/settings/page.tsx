'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

interface ProfileForm {
  first_name: string
  last_name: string
  phone: string
}

const emptyProfile: ProfileForm = {
  first_name: '',
  last_name: '',
  phone: '',
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      return
    }

    let active = true
    setLoading(true)

    const load = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('first_name, last_name, phone')
          .eq('auth_user_id', user.id)
          .single()

        if (!active) return

        if (data) {
          setProfile({
            first_name: data.first_name ?? '',
            last_name: data.last_name ?? '',
            phone: data.phone ?? '',
          })
        } else {
          setProfile(emptyProfile)
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Account settings</h1>
        <p className="mt-2 text-sm text-slate-600">
          Update how we contact you and manage your account access.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <fieldset disabled={loading} className="grid gap-4 sm:grid-cols-2">
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

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Sign out
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        {message && (
          <p className="text-sm text-slate-600">{message}</p>
        )}
      </form>
    </div>
  )
}


