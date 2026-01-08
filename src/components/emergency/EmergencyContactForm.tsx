'use client'

import { useState } from 'react'
import { X, User, Phone } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganizations } from '@/hooks/useOrganizations'
import { validateE164, type SupportedCountryCode } from '@/lib/phone'

const RELATION_OPTIONS = [
  'Spouse',
  'Partner',
  'Child',
  'Parent',
  'Sibling',
  'Grandparent',
  'Grandchild',
  'Aunt',
  'Uncle',
  'Niece',
  'Nephew',
  'Cousin',
  'Neighbor',
  'Friend',
  'Caregiver',
  'Doctor',
  'Custom'
]

interface EmergencyContact {
  id?: string
  name: string
  phone: string
  active?: boolean
  relation?: string
}

interface EmergencyContactFormProps {
  contact?: EmergencyContact
  onCancel: () => void
  onSave: () => void
  onAssignElders?: () => void
  isB2C?: boolean
  elderId?: string | null
  variant?: 'modal' | 'inline'
}

export function EmergencyContactForm({
  contact,
  onCancel,
  onSave,
  onAssignElders,
  isB2C = false,
  elderId = null,
  variant = 'modal',
}: EmergencyContactFormProps) {
  const { currentOrg } = useOrganizations()
  const [formData, setFormData] = useState<EmergencyContact>({
    name: contact?.name || '',
    phone: contact?.phone || '',
    active: contact?.active ?? true,
  })
  const [relation, setRelation] = useState(() => {
    const contactRelation = contact?.relation || ''
    // If the relation is not in our predefined list, treat it as custom
    return RELATION_OPTIONS.includes(contactRelation) ? contactRelation : 'Custom'
  })
  const [customRelation, setCustomRelation] = useState(() => {
    const contactRelation = contact?.relation || ''
    // If the relation is not in our predefined list, put it in custom field
    return RELATION_OPTIONS.includes(contactRelation) ? '' : contactRelation
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [countryCode, setCountryCode] = useState<SupportedCountryCode>(() => {
    // Detect country code from existing phone number
    if (contact?.phone) {
      if (contact.phone.startsWith('+1')) return '+1'
      if (contact.phone.startsWith('+31')) return '+31'
      if (contact.phone.startsWith('+44')) return '+44'
    }
    return '+44' // default
  })

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Combine country code with phone number
    const fullPhone = countryCode + value
    setFormData({ ...formData, phone: fullPhone })
    
    if (value) {
      const error = validateE164(fullPhone, countryCode)
      setPhoneError(error || '')
    } else {
      setPhoneError('')
    }
  }

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountryCode = e.target.value as SupportedCountryCode
    setCountryCode(newCountryCode)
    
    // Update phone number with new country code
    const currentDigits = formData.phone.replace(/^\+(\d{1,2})/, '')
    const newPhone = newCountryCode + currentDigits
    setFormData({ ...formData, phone: newPhone })
    
    // Re-validate
    if (currentDigits) {
      const error = validateE164(newPhone, newCountryCode)
      setPhoneError(error || '')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // For B2B, require org. For B2C, require elder
    if (!isB2C && !currentOrg) return
    if (isB2C && !elderId) {
      setError('Please create an elder profile first before adding emergency contacts.')
      return
    }

    // For B2C, validate relation is provided
    if (isB2C) {
      const finalRelation = relation === 'Custom' ? customRelation.trim() : relation
      if (!finalRelation) {
        setError('Please select or enter a relationship type.')
        return
      }
    }

    // Validate phone number before submission
    if (formData.phone) {
      const phoneValidationError = validateE164(formData.phone, countryCode)
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
        org_id: isB2C ? null : currentOrg?.id,
        updated_at: new Date().toISOString(),
      }

      if (contact?.id) {
        // Update existing contact
        const { error: updateError } = await supabase
          .from('emergency_contacts')
          .update(contactData)
          .eq('id', contact.id)

        if (updateError) throw updateError

        // For B2C, also update the relation in the elder_emergency_contact table
        if (isB2C && elderId) {
          const finalRelation = relation === 'Custom' ? customRelation.trim() : relation
          if (finalRelation !== contact.relation) {
            const { error: relationUpdateError } = await supabase
              .from('elder_emergency_contact')
              .update({ relation: finalRelation })
              .eq('emergency_contact_id', contact.id)
              .eq('elder_id', elderId)

            if (relationUpdateError) throw relationUpdateError
          }
        }
      } else {
        // Create new contact
        const { data: newContact, error: insertError } = await supabase
          .from('emergency_contacts')
          .insert(contactData)
          .select()
          .single()

        if (insertError) throw insertError

          // For B2C, automatically link to elder
        if (isB2C && newContact && elderId) {
          // Get the next priority order
          const { data: existingAssignments } = await supabase
            .from('elder_emergency_contact')
            .select('"priority order"')
            .eq('elder_id', elderId)
            .order('"priority order"', { ascending: false })
            .limit(1)

          const nextPriority = existingAssignments && existingAssignments.length > 0
            ? (existingAssignments[0]["priority order"] || 0) + 1
            : 1

          const finalRelation = relation === 'Custom' ? customRelation.trim() : relation || 'Family/Friend'

          const { error: assignmentError } = await supabase
            .from('elder_emergency_contact')
            .insert({
              elder_id: elderId,
              emergency_contact_id: newContact.id,
              "priority order": nextPriority,
              relation: finalRelation,
            })

          if (assignmentError) throw assignmentError
        }
      }

      onSave()
      onCancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const headerClass = isB2C ? 'border-slate-200' : 'border-gray-200'
  const textClass = isB2C ? 'text-slate-900' : 'text-gray-900'
  const borderClass = isB2C ? 'border-slate-200' : 'border-gray-200'
  const hoverClass = isB2C ? 'hover:bg-slate-100' : 'hover:bg-gray-100'
  const buttonClass = isB2C ? 'bg-slate-900 hover:bg-slate-700' : 'bg-blue-600 hover:bg-blue-700'
  const inputClass = isB2C ? 'border-slate-200 focus:ring-slate-200 focus:border-slate-400' : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
  const isInline = variant === 'inline'
  const containerClass = isInline
    ? `rounded-xl border ${isB2C ? 'border-slate-200 bg-slate-50' : 'border-gray-200 bg-white'}`
    : 'bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden'
  const headerPadding = isInline ? 'px-4 py-3' : 'p-6'
  const formClassName = isInline ? 'px-4 py-4' : 'p-6 overflow-y-auto max-h-[calc(90vh-140px)]'

  const header = (
    <div className={`flex items-center justify-between ${headerPadding} border-b ${headerClass}`}>
      <h2 className={`${isInline ? 'text-lg' : 'text-xl'} font-semibold ${textClass}`}>
        {contact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
      </h2>
      {isInline ? (
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 transition"
        >
          <X className="h-3 w-3" />
          Cancel
        </button>
      ) : (
        <button
          onClick={onCancel}
          className={`p-2 ${hoverClass} rounded-lg transition-colors`}
        >
          <X className={`w-5 h-5 ${isB2C ? 'text-slate-500' : 'text-gray-500'}`} />
        </button>
      )}
    </div>
  )

  const form = (
    <form onSubmit={handleSubmit} className={formClassName}>
      <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className={`text-lg font-medium ${textClass} mb-4 flex items-center`}>
                <User className={`w-5 h-5 mr-2 ${isB2C ? 'text-slate-500' : 'text-gray-500'}`} />
                Basic Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${isB2C ? 'text-slate-700' : 'text-gray-700'} mb-2`}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${inputClass} ${textClass} ${isB2C ? 'placeholder-slate-500' : 'placeholder-gray-500'}`}
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className={`text-lg font-medium ${textClass} mb-4 flex items-center`}>
                <Phone className={`w-5 h-5 mr-2 ${isB2C ? 'text-slate-500' : 'text-gray-500'}`} />
                Contact Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${isB2C ? 'text-slate-700' : 'text-gray-700'} mb-2`}>
                    Phone Number *
                  </label>
                  <div className={`flex rounded-lg border ${isB2C ? 'border-slate-200 focus-within:ring-2 focus-within:ring-slate-200' : 'border-gray-200 focus-within:ring-2 focus-within:ring-blue-500'}`}>
                    <select 
                      value={countryCode}
                      onChange={handleCountryChange}
                      className={`rounded-l-lg border-0 border-r ${isB2C ? 'border-slate-200 bg-slate-50 text-slate-900 focus:border-slate-300' : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-gray-300'} px-3 py-2 text-sm focus:outline-none`}
                    >
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+31">🇳🇱 +31</option>
                      <option value="+44">🇬🇧 +44</option>
                    </select>
                    <input
                      type="tel"
                      value={formData.phone.startsWith(countryCode) ? formData.phone.slice(countryCode.length) : formData.phone}
                      onChange={handlePhoneChange}
                      className={`flex-1 rounded-r-lg border-0 px-3 py-2 ${textClass} focus:outline-none ${isB2C ? 'placeholder-slate-500' : 'placeholder-gray-500'}`}
                      placeholder={countryCode === '+1' ? '5551234567' : countryCode === '+31' ? '612345678' : '7123456789'}
                      required
                    />
                  </div>
                  {phoneError && (
                    <p className="mt-1 text-sm text-red-600">{phoneError}</p>
                  )}
                  <p className={`mt-1 text-xs ${isB2C ? 'text-slate-500' : 'text-gray-500'}`}>
                    Format: {countryCode === '+1' ? '+15551234567' : countryCode === '+31' ? '+31612345678' : '+447123456789'} (no spaces or special characters)
                  </p>
                </div>
              </div>
            </div>

            {/* Relation (B2C only) */}
            {isB2C && (
              <div>
                <h3 className={`text-lg font-medium ${textClass} mb-4 flex items-center`}>
                  <svg className={`w-5 h-5 mr-2 ${isB2C ? 'text-slate-500' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Relation to Elder
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium ${isB2C ? 'text-slate-700' : 'text-gray-700'} mb-2`}>
                      Relationship *
                    </label>
                    <select
                      value={relation}
                      onChange={(e) => {
                        setRelation(e.target.value)
                        if (e.target.value !== 'Custom') {
                          setCustomRelation('')
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${inputClass} ${textClass} ${isB2C ? 'placeholder-slate-500' : 'placeholder-gray-500'}`}
                      required
                    >
                      <option value="">Select a relationship...</option>
                      {RELATION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>

                    {relation === 'Custom' && (
                      <input
                        type="text"
                        value={customRelation}
                        onChange={(e) => setCustomRelation(e.target.value)}
                        placeholder="Enter custom relationship..."
                        className={`mt-2 w-full px-3 py-2 border rounded-lg focus:ring-2 ${inputClass} ${textClass} ${isB2C ? 'placeholder-slate-500' : 'placeholder-gray-500'}`}
                        required
                      />
                    )}

                    <p className={`mt-1 text-xs ${isB2C ? 'text-slate-500' : 'text-gray-500'}`}>
                      How is this person related to the elder?
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Status */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className={`rounded ${isB2C ? 'border-slate-300 text-slate-600 focus:ring-slate-500' : 'border-gray-300 text-blue-600 focus:ring-blue-500'}`}
                />
                <span className={`ml-2 text-sm font-medium ${isB2C ? 'text-slate-700' : 'text-gray-700'}`}>
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
        <div className={`flex justify-end space-x-3 mt-8 pt-6 border-t ${borderClass}`}>
          {contact && onAssignElders && !isB2C && (
            <button
              type="button"
              onClick={onAssignElders}
              className={`px-4 py-2 ${isB2C ? 'text-slate-700 bg-slate-100 hover:bg-slate-200' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors flex items-center`}
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
            className={`px-4 py-2 ${isB2C ? 'text-slate-700 bg-slate-100 hover:bg-slate-200' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !!phoneError}
            className={`px-4 py-2 ${buttonClass} text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          >
            {loading ? 'Saving...' : contact ? 'Update Contact' : 'Add Contact'}
          </button>
        </div>
    </form>
  )

  if (isInline) {
    return (
      <div className={containerClass}>
        {header}
        {form}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={containerClass}>
        {header}
        {form}
      </div>
    </div>
  )
}

