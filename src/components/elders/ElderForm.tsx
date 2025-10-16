'use client'

import { useState } from 'react'
import { X, User, Phone, MapPin, FileText, Pill } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganizations } from '@/hooks/useOrganizations'

interface Elder {
  id?: string
  first_name: string
  last_name: string
  phone: string
  address?: string
  medical_conditions?: string
  medications?: string
  personal_info?: string
  active?: boolean
}

interface ElderFormProps {
  elder?: Elder
  onCancel: () => void
  onSave: () => void
}

export function ElderForm({ elder, onCancel, onSave }: ElderFormProps) {
  const { currentOrg } = useOrganizations()
  const [formData, setFormData] = useState<Elder>({
    first_name: elder?.first_name || '',
    last_name: elder?.last_name || '',
    phone: elder?.phone || '',
    address: elder?.address || '',
    medical_conditions: elder?.medical_conditions || '',
    medications: elder?.medications || '',
    personal_info: elder?.personal_info || '',
    active: elder?.active ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [countryCode, setCountryCode] = useState(() => {
    // Detect country code from existing phone number
    if (elder?.phone) {
      if (elder.phone.startsWith('+1')) return '+1'
      if (elder.phone.startsWith('+31')) return '+31'
      if (elder.phone.startsWith('+44')) return '+44'
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
        expectedLength = 13 // +44 + 10 digits
        expectedDigits = 10
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
      if (elder?.id) {
        // Update existing elder
        const { error: updateError } = await supabase
          .from('elders')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', elder.id)

        if (updateError) throw updateError
      } else {
        // Create new elder
        const { error: insertError } = await supabase
          .from('elders')
          .insert({
            ...formData,
            org_id: currentOrg.id,
          })

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
            {elder ? 'Edit Client' : 'Add New Client'}
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
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
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
                        defaultValue="+44"
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
                      placeholder={countryCode === '+1' ? '5551234567' : countryCode === '+31' ? '612345678' : '7123456789'}
                      required
                    />
                  </div>
                  {phoneError && (
                    <p className="mt-1 text-sm text-red-600">{phoneError}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Format: +447123456789 (no spaces or special characters)
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    placeholder="123 Main St, City, State 12345"
                  />
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Pill className="w-5 h-5 mr-2 text-gray-500" />
                Medical Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medical Conditions
                  </label>
                  <textarea
                    value={formData.medical_conditions}
                    onChange={(e) => setFormData({ ...formData, medical_conditions: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    rows={3}
                    placeholder="List any medical conditions, allergies, or health concerns..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Medications
                  </label>
                  <textarea
                    value={formData.medications}
                    onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    rows={3}
                    placeholder="List current medications and dosages..."
                  />
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-gray-500" />
                Personal Information
              </h3>
              
              <textarea
                value={formData.personal_info}
                onChange={(e) => setFormData({ ...formData, personal_info: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                rows={3}
                placeholder="Personal preferences, interests, family information..."
              />
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
                  Active (Client will receive calls)
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
              {loading ? 'Saving...' : elder ? 'Update Client' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

