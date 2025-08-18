'use client'

import { useState } from 'react'
import { X, Calendar, Clock, Users, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganizations } from '@/hooks/useOrganizations'

interface Schedule {
  id?: string
  name: string
  description?: string
  frequency: string
  days_of_week: number[]
  call_times: string[]
  checklist: string[]
  retry_after_minutes: number
  max_retries: number
  active?: boolean
}

interface ScheduleFormProps {
  schedule?: Schedule
  onCancel: () => void
  onSave: () => void
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom Days' },
]

export function ScheduleForm({ schedule, onCancel, onSave }: ScheduleFormProps) {
  const { currentOrg } = useOrganizations()
  const [formData, setFormData] = useState<Schedule>({
    name: schedule?.name || '',
    description: schedule?.description || '',
    frequency: schedule?.frequency || 'daily',
    days_of_week: schedule?.days_of_week || [1, 2, 3, 4, 5], // Weekdays by default
    call_times: schedule?.call_times || ['09:00'],
    checklist: schedule?.checklist || [''],
    retry_after_minutes: schedule?.retry_after_minutes || 30,
    max_retries: schedule?.max_retries || 2,
    active: schedule?.active ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentOrg) return

    setLoading(true)
    setError('')

    try {
      // Filter out empty checklist items
      const cleanedChecklist = formData.checklist.filter(item => item.trim() !== '')
      
      const scheduleData = {
        ...formData,
        checklist: cleanedChecklist,
        org_id: currentOrg.id,
        updated_at: new Date().toISOString(),
      }

      if (schedule?.id) {
        // Update existing schedule
        const { error: updateError } = await supabase
          .from('call_schedules')
          .update(scheduleData)
          .eq('id', schedule.id)

        if (updateError) throw updateError
      } else {
        // Create new schedule
        const { error: insertError } = await supabase
          .from('call_schedules')
          .insert(scheduleData)

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

  const addCallTime = () => {
    setFormData({
      ...formData,
      call_times: [...formData.call_times, '09:00']
    })
  }

  const removeCallTime = (index: number) => {
    setFormData({
      ...formData,
      call_times: formData.call_times.filter((_, i) => i !== index)
    })
  }

  const updateCallTime = (index: number, time: string) => {
    const newTimes = [...formData.call_times]
    newTimes[index] = time
    setFormData({ ...formData, call_times: newTimes })
  }

  const addChecklistItem = () => {
    setFormData({
      ...formData,
      checklist: [...formData.checklist, '']
    })
  }

  const removeChecklistItem = (index: number) => {
    setFormData({
      ...formData,
      checklist: formData.checklist.filter((_, i) => i !== index)
    })
  }

  const updateChecklistItem = (index: number, item: string) => {
    const newChecklist = [...formData.checklist]
    newChecklist[index] = item
    setFormData({ ...formData, checklist: newChecklist })
  }

  const toggleDayOfWeek = (day: number) => {
    const newDays = formData.days_of_week.includes(day)
      ? formData.days_of_week.filter(d => d !== day)
      : [...formData.days_of_week, day].sort()
    
    setFormData({ ...formData, days_of_week: newDays })
  }

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {schedule ? 'Edit Schedule' : 'Create New Schedule'}
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
                <Calendar className="w-5 h-5 mr-2 text-gray-500" />
                Basic Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    placeholder="e.g., Morning Check-in"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    rows={2}
                    placeholder="Brief description of this schedule..."
                  />
                </div>
              </div>
            </div>

            {/* Frequency & Days */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Frequency & Days
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    {FREQUENCY_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.frequency !== 'daily' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Days of Week
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map(day => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDayOfWeek(day.value)}
                          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                            formData.days_of_week.includes(day.value)
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Call Times */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-gray-500" />
                Call Times
              </h3>
              
              <div className="space-y-3">
                {formData.call_times.map((time, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => updateCallTime(index, e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                    {formData.call_times.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCallTime(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addCallTime}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add another time
                </button>
              </div>
            </div>

            {/* Checklist */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-gray-500" />
                Conversation Checklist
              </h3>
              
              <p className="text-sm text-gray-600 mb-4">
                Add conversation topics and questions for the AI to cover during calls. Each item should be a specific topic or question.
              </p>
              
              <div className="space-y-3">
                {formData.checklist.map((item, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateChecklistItem(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                      placeholder="e.g., Ask about medication taken today"
                    />
                    {formData.checklist.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addChecklistItem}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add checklist item
                </button>
              </div>
            </div>

            {/* Retry Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Retry Settings
              </h3>
              
              <p className="text-sm text-gray-600 mb-4">
                Configure how the system should handle missed calls when the client doesn't answer.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Retry After (minutes)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    How long to wait before trying again if no answer
                  </p>
                  <input
                    type="number"
                    value={formData.retry_after_minutes}
                    onChange={(e) => setFormData({ ...formData, retry_after_minutes: parseInt(e.target.value) || 30 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="5"
                    max="120"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Retries
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Maximum number of retry attempts per call time
                  </p>
                  <input
                    type="number"
                    value={formData.max_retries}
                    onChange={(e) => setFormData({ ...formData, max_retries: parseInt(e.target.value) || 2 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    max="5"
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
                  Active (Schedule will be used for calls)
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
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : schedule ? 'Update Schedule' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

