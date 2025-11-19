'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react'
import {
  composeE164,
  detectCountryCodeFromE164,
  getNationalNumber,
  sanitizeDigits,
  validateE164,
  type SupportedCountryCode,
} from '@/lib/phone'

interface SignUpFormProps {
  onToggleMode: () => void
}

export function SignUpForm({ onToggleMode }: SignUpFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    accountType: 'b2c' as 'b2b' | 'b2c',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [countryCode, setCountryCode] = useState<SupportedCountryCode>('+44')
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = sanitizeDigits(e.target.value)
    const full = composeE164(countryCode, digits)
    setFormData({ ...formData, phone: full })
    setPhoneError(full ? validateE164(full, countryCode) : null)
    setError('') // Clear general error when user types
  }

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextCode = e.target.value as SupportedCountryCode
    setCountryCode(nextCode)
    const digits = sanitizeDigits(getNationalNumber(formData.phone, detectCountryCodeFromE164(formData.phone, nextCode)))
    const full = composeE164(nextCode, digits)
    setFormData({ ...formData, phone: full })
    setPhoneError(full ? validateE164(full, nextCode) : null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate phone number if provided
    if (formData.phone) {
      const validationError = validateE164(formData.phone, countryCode)
      if (validationError) {
        setPhoneError(validationError)
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
            phone: formData.phone,
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
              phone: formData.phone,
              account_type: formData.accountType,
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
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Create your account
          </h1>
          <p className="text-gray-600">
            Get started with Eva Cares today
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                Business (teams)
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
                Family (caregiver)
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Choose “Business” if you manage care for multiple elders or teams. Choose “Family” for a single loved one.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First name
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
                Last name
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
              Email address
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
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone number
            </label>
            <div className="flex">
              <select
                value={countryCode}
                onChange={handleCountryChange}
                className="px-3 py-3 border border-r-0 border-gray-200 rounded-l-xl bg-gray-50 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors appearance-none cursor-pointer"
                style={{ height: '48px' }}
              >
                <option value="+1">🇺🇸 +1</option>
                <option value="+31">🇳🇱 +31</option>
                <option value="+44">🇬🇧 +44</option>
              </select>
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="phone"
                  type="tel"
                  value={getNationalNumber(formData.phone, countryCode)}
                  onChange={handlePhoneChange}
                  className={`w-full pl-10 pr-4 py-3 border border-l-0 border-gray-200 rounded-r-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    phoneError ? 'border-red-300' : ''
                  }`}
                  style={{ height: '48px' }}
                  placeholder={countryCode === '+1' ? '5551234567' : countryCode === '+31' ? '612345678' : '7123456789'}
                />
              </div>
            </div>
            {phoneError && (
              <p className="mt-1 text-sm text-red-600">{phoneError}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Format: {countryCode === '+1' ? '+15551234567' : countryCode === '+31' ? '+31612345678' : '+447123456789'} (no spaces or special characters)
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
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

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
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

