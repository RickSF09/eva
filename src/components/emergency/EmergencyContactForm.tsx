'use client'

import { useState } from 'react'
import { X, User, Phone, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganizations } from '@/hooks/useOrganizations'

interface EmergencyContact {
  id?: string
  name: string
  phone: string
  email?: string
  active?: boolean
}

interface EmergencyContactFormProps {
  contact?: EmergencyContact
  onCancel: () => void
  onSave: () => void
  onAssignElders?: () => void
}

export function EmergencyContactForm({ contact, onCancel, onSave, onAssignElders }: EmergencyContactFormProps) {
  const { currentOrg } = useOrganizations()
  const [formData, setFormData] = useState<EmergencyContact>({
    name: contact?.name || '',
    phone: contact?.phone || '',
    email: contact?.email || '',
    active: contact?.active ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [countryCode, setCountryCode] = useState(() => {
    // Detect country code from existing phone number
    if (contact?.phone) {
      if (contact.phone.startsWith('+1')) return '+1'
      if (contact.phone.startsWith('+31')) return '+31'
      if (contact.phone.startsWith('+44')) return '+44'
    }
    return '+44' // default
  })

  const validatePhoneNumber = (phone: string) => {
    // Remove any non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '')
    
    // Check if it starts with the selected country code
    if (!cleaned.startsWith(countryCode)) {
      return `Phone number must start with ${countryCode}`
    }
    
    // Validate length based on country code
    let expectedLength: number
    let expectedDigits: number
    
    switch (countryCode) {
      case '+1':
        expectedLength = 12 // +1 + 10 digits
        expectedDigits = 10
        break
      case '+31':
        expectedLength = 12 // +31 + 9 digits
        expectedDigits = 9
        break
      case '+44':
        expectedLength = 13 // +44 + 9 digits
        expectedDigits = 9
        break
      default:
        return 'Invalid country code'
    }
    
    if (cleaned.length !== expectedLength) {
      return `Phone number must be exactly ${expectedLength} characters (${countryCode} followed by ${expectedDigits} digits)`
    }
    
    // Check if the part after country code has the correct number of digits
    const afterCountryCode = cleaned.substring(countryCode.length)
    if (!new RegExp(`^\\d{${expectedDigits}}$`).test(afterCountryCode)) {
      return `Phone number must be in format ${countryCode} followed by ${expectedDigits} digits`
    }
    
    return ''
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Combine country code with phone number
    const fullPhone = countryCode + value
    setFormData({ ...formData, phone: fullPhone })
    
    if (value) {
      const error = validatePhoneNumber(fullPhone)
      setPhoneError(error)
    } else {
      setPhoneError('')
    }
  }

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountryCode = e.target.value
    setCountryCode(newCountryCode)
    
    // Update phone number with new country code
    const currentDigits = formData.phone.replace(/^\+(\d{1,2})/, '')
    const newPhone = newCountryCode + currentDigits
    setFormData({ ...formData, phone: newPhone })
    
    // Re-validate
    if (currentDigits) {
      const error = validatePhoneNumber(newPhone)
      setPhoneError(error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentOrg) return

    // Validate phone number before submission
    if (formData.phone) {
      const phoneValidationError = validatePhoneNumber(formData.phone)
      if (phoneValidationError) {
        setPhoneError(phoneValidationError)
        return
      }
    }

    setLoading(true)
    setError('')

    try {
      const contactData = {
        ...formData,
        org_id: currentOrg.id,
        updated_at: new Date().toISOString(),
      }

      if (contact?.id) {
        // Update existing contact
        const { error: updateError } = await supabase
          .from('emergency_contacts')
          .update(contactData)
          .eq('id', contact.id)

        if (updateError) throw updateError
      } else {
        // Create new contact
        const { error: insertError } = await supabase
          .from('emergency_contacts')
          .insert(contactData)

        if (insertError) throw insertError
      }

      onSave()
      onCancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {contact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-gray-500" />
                Basic Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Phone className="w-5 h-5 mr-2 text-gray-500" />
                Contact Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <select 
                        className="px-3 py-2 border border-gray-200 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-gray-50"
                        value={countryCode}
                        onChange={handleCountryChange}
                      >
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+31">🇳🇱 +31</option>
                        <option value="+44">🇬🇧 +44</option>
                      </select>
                    </div>
                    <input
                      type="tel"
                      value={formData.phone.replace(new RegExp(`^\\${countryCode}`), '')}
                      onChange={handlePhoneChange}
                      className="flex-1 px-3 py-2 border border-gray-200 border-l-0 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                      placeholder={countryCode === '+1' ? '5551234567' : countryCode === '+31' ? '612345678' : '729959925'}
                      required
                    />
                  </div>
                  {phoneError && (
                    <p className="mt-1 text-sm text-red-600">{phoneError}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Format: {countryCode === '+1' ? '+15551234567' : countryCode === '+31' ? '+31612345678' : '+44729959925'} (no spaces or special characters)
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    placeholder="john.doe@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Active (Contact will be notified in emergencies)
                </span>
              </label>
            </div>
          </div>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            {contact && onAssignElders && (
              <button
                type="button"
                onClick={onAssignElders}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Assign Clients
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !!phoneError}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : contact ? 'Update Contact' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

