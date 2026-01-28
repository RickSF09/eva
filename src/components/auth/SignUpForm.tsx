'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import Link from 'next/link'

interface SignUpFormProps {
  onToggleMode: () => void
}

export function SignUpForm({ onToggleMode }: SignUpFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    accountType: 'b2c' as 'b2b' | 'b2c',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  // Consent checkboxes
  const [familyConsent, setFamilyConsent] = useState(false)
  const [callRecordingNotified, setCallRecordingNotified] = useState(false)
  const [healthDataConsent, setHealthDataConsent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    // Validate consents
    if (!healthDataConsent) {
      setError('You must consent to health data processing to continue.')
      setLoading(false)
      return
    }

    if (formData.accountType === 'b2c') {
      if (!familyConsent) {
        setError('You must confirm family member consent to continue.')
        setLoading(false)
        return
      }
      if (!callRecordingNotified) {
        setError('You must confirm the family member has been notified about call recording.')
        setLoading(false)
        return
      }
    }

    try {
      // Sign up with Supabase Auth
      const siteUrl = typeof window !== 'undefined' ? window.location.origin : undefined
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: siteUrl,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            account_type: formData.accountType,
          },
        },
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (data.user) {
        // Ensure user record exists/updates in our users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .upsert(
            {
              auth_user_id: data.user.id,
              email: formData.email,
              first_name: formData.firstName,
              last_name: formData.lastName,
              account_type: formData.accountType,
              terms_privacy_consent: true,
              terms_privacy_consent_timestamp: new Date().toISOString(),
              family_consent_given: familyConsent,
              family_consent_given_timestamp: familyConsent ? new Date().toISOString() : null,
              call_recording_notified: callRecordingNotified,
              call_recording_notified_timestamp: callRecordingNotified ? new Date().toISOString() : null,
              health_data_processing_consent: healthDataConsent,
              health_data_processing_consent_timestamp: healthDataConsent ? new Date().toISOString() : null,
            },
            { onConflict: 'auth_user_id' }
          )
          .select()
          .single()

        if (userError) {
          console.error('Error creating or updating user record:', userError)
        }

        setSuccess(true)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Check your email
          </h2>
          <p className="text-gray-600 mb-6">
            We've sent you a confirmation link at {formData.email}
          </p>
          <button
            onClick={onToggleMode}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-gray-900">
            Create your account
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I am signing up as
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, accountType: 'b2b' })}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                  formData.accountType === 'b2b'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                Business
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, accountType: 'b2c' })}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                  formData.accountType === 'b2c'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                Family
              </button>
            </div>
            <p className="mt-2 text-[11px] text-gray-500">
              Business for teams. Family for individual care.
            </p>
          </div>

          {formData.accountType === 'b2c' && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-blue-800 text-xs">
                Enter <strong>your details</strong> here. You'll add your loved one next.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                Your first name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="First name"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Your last name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Last name"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Your email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" title="At least 6 characters" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Create a password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {formData.accountType === 'b2c' && (
              <>
                <div className="flex items-start gap-3">
                  <input
                    id="familyConsent"
                    type="checkbox"
                    checked={familyConsent}
                    onChange={(e) => setFamilyConsent(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="familyConsent" className="text-sm text-gray-600 cursor-pointer select-none">
                    I confirm my family member is aware of EvaCares and has agreed to receive calls from Eva
                  </label>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    id="callRecordingNotified"
                    type="checkbox"
                    checked={callRecordingNotified}
                    onChange={(e) => setCallRecordingNotified(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="callRecordingNotified" className="text-sm text-gray-600 cursor-pointer select-none">
                    I have informed them that calls will be recorded for safety and family updates
                  </label>
                </div>
              </>
            )}

            <div className="flex items-start gap-3">
              <input
                id="healthDataConsent"
                type="checkbox"
                checked={healthDataConsent}
                onChange={(e) => setHealthDataConsent(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="healthDataConsent" className="text-sm text-gray-600 cursor-pointer select-none">
                I consent to processing health information (mood, pain, medication) for wellness monitoring
              </label>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <p className="text-[11px] text-gray-500 text-center px-4 leading-relaxed">
              By joining, you agree to our{' '}
              <Link href="/terms" target="_blank" className="text-blue-600 hover:underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>.
            </p>
            
            <button
              type="submit"
              disabled={
                loading ||
                !healthDataConsent ||
                (formData.accountType === 'b2c' && (!familyConsent || !callRecordingNotified))
              }
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <button
              onClick={onToggleMode}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
