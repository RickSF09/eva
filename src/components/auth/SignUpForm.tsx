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
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [directConsentEligibleConfirmed, setDirectConsentEligibleConfirmed] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    if (!termsAccepted) {
      setError('You must agree to the Terms of Service and Privacy Policy to continue.')
      setLoading(false)
      return
    }

    if (formData.accountType === 'b2c' && !directConsentEligibleConfirmed) {
      setError('Please confirm your family member can provide their own consent directly.')
      setLoading(false)
      return
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
            self_consent_capable_signup: formData.accountType === 'b2c' ? directConsentEligibleConfirmed : null,
          },
        },
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (data.user) {
        // Ensure user record exists/updates in our users table
        const { error: userError } = await supabase
          .from('users')
          .upsert(
            {
              auth_user_id: data.user.id,
              email: formData.email,
              first_name: formData.firstName,
              last_name: formData.lastName,
              account_type: formData.accountType,
              terms_privacy_consent: termsAccepted,
              terms_privacy_consent_timestamp: new Date().toISOString(),
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
    } catch {
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
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-blue-800 text-xs">
                  Enter <strong>your details</strong> here. You'll add your loved one next.
                </p>
              </div>
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
              <div className="flex items-start gap-3">
                <input
                  id="directConsentEligibleConfirmed"
                  type="checkbox"
                  checked={directConsentEligibleConfirmed}
                  onChange={(e) => setDirectConsentEligibleConfirmed(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="directConsentEligibleConfirmed" className="text-sm text-gray-600 cursor-pointer select-none">
                  I confirm the person receiving calls can provide their own consent during a recorded setup call.
                </label>
              </div>
            )}

            <div className="flex items-start gap-3">
              <input
                id="termsAccepted"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="termsAccepted" className="text-sm text-gray-600 cursor-pointer select-none">
                I agree to the EvaCares Terms of Service and Privacy Policy.
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
                loading || !termsAccepted || (formData.accountType === 'b2c' && !directConsentEligibleConfirmed)
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
