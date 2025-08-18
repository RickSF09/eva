'use client'

import { useState, useEffect } from 'react'
import { X, Users, Calendar, Search, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganizations } from '@/hooks/useOrganizations'
import { calculateNextScheduledTime } from '@/lib/utils'

interface Elder {
  id: string
  first_name: string
  last_name: string
  phone: string
  active: boolean
}

interface Schedule {
  id: string
  name: string
  description?: string
  days_of_week: number[]
  call_times: string[]
}

interface ScheduleAssignmentProps {
  schedule: Schedule
  onCancel: () => void
  onSave: () => void
}

export function ScheduleAssignment({ schedule, onCancel, onSave }: ScheduleAssignmentProps) {
  const { currentOrg } = useOrganizations()
  const [elders, setElders] = useState<Elder[]>([])
  const [assignedElders, setAssignedElders] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (currentOrg) {
      fetchElders()
      fetchAssignments()
    }
  }, [currentOrg, schedule.id])

  const fetchElders = async () => {
    try {
      const { data, error } = await supabase
        .from('elders')
        .select('id, first_name, last_name, phone, active')
        .eq('org_id', currentOrg?.id)
        .eq('active', true)
        .order('first_name')

      if (error) throw error
      setElders(data || [])
    } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to fetch clients')
    }
  }

  const fetchAssignments = async () => {
    try {
      // Fetch schedule details to get timing info
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('call_schedules')
        .select('days_of_week, call_times')
        .eq('id', schedule.id)
        .single()

      if (scheduleError) throw scheduleError

      // Update schedule with timing data
      schedule.days_of_week = scheduleData.days_of_week || []
      schedule.call_times = scheduleData.call_times || []

      const { data, error } = await supabase
        .from('elder_call_schedules')
        .select('elder_id')
        .eq('schedule_id', schedule.id)
        .eq('active', true)

      if (error) throw error
      
      const assignedIds = new Set(data?.map(item => item.elder_id) || [])
      setAssignedElders(assignedIds)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assignments')
    } finally {
      setLoading(false)
    }
  }

  const toggleElderAssignment = (elderId: string) => {
    const newAssigned = new Set(assignedElders)
    if (newAssigned.has(elderId)) {
      newAssigned.delete(elderId)
    } else {
      newAssigned.add(elderId)
    }
    setAssignedElders(newAssigned)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      // Get current assignments
      const { data: currentAssignments, error: fetchError } = await supabase
        .from('elder_call_schedules')
        .select('id, elder_id')
        .eq('schedule_id', schedule.id)

      if (fetchError) throw fetchError

      const currentElderIds = new Set(currentAssignments?.map(a => a.elder_id) || [])
      
      // Find elders to add and remove
      const eldersToAdd = Array.from(assignedElders).filter(id => !currentElderIds.has(id))
      const eldersToRemove = Array.from(currentElderIds).filter(id => !assignedElders.has(id))

      // Add new assignments
      if (eldersToAdd.length > 0) {
        const newAssignments = eldersToAdd.map(elderId => ({
          elder_id: elderId,
          schedule_id: schedule.id,
          active: true,
        }))

        const { error: insertError } = await supabase
          .from('elder_call_schedules')
          .insert(newAssignments)

        if (insertError) throw insertError

        // Create call_executions for newly assigned elders
        const callExecutions = []
        for (const elderId of eldersToAdd) {
          const nextScheduledTime = calculateNextScheduledTime(
            schedule.days_of_week || [],
            schedule.call_times || []
          )
          
          if (nextScheduledTime) {
            callExecutions.push({
              elder_id: elderId,
              schedule_id: schedule.id,
              call_type: 'scheduled',
              status: 'pending',
              scheduled_for: nextScheduledTime.toISOString(),
            })
          }
        }

        if (callExecutions.length > 0) {
          const { error: executionError } = await supabase
            .from('call_executions')
            .insert(callExecutions)

          if (executionError) {
            console.error('Failed to create call executions:', executionError)
            // Don't throw here as the assignment was successful
          }
        }
      }

      // Remove old assignments
      if (eldersToRemove.length > 0) {
        const assignmentsToRemove = currentAssignments
          ?.filter(a => eldersToRemove.includes(a.elder_id))
          .map(a => a.id) || []

        const { error: deleteError } = await supabase
          .from('elder_call_schedules')
          .delete()
          .in('id', assignmentsToRemove)

        if (deleteError) throw deleteError

        // Clean up pending call_executions for removed elders
        const { error: cleanupError } = await supabase
          .from('call_executions')
          .delete()
          .in('elder_id', eldersToRemove)
          .eq('schedule_id', schedule.id)
          .eq('status', 'pending')
          .eq('call_type', 'scheduled')

        if (cleanupError) {
          console.error('Failed to cleanup call executions:', cleanupError)
          // Don't throw here as the assignment removal was successful
        }
      }

      onSave()
      onCancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save assignments')
    } finally {
      setSaving(false)
    }
  }

  const filteredElders = elders.filter(elder =>
    `${elder.first_name} ${elder.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    elder.phone.includes(searchTerm)
  )

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading clients...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Assign Clients to Schedule
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {schedule.name}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              placeholder="Search clients by name or phone..."
            />
          </div>
        </div>

        {/* Client List */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          {filteredElders.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'No clients found matching your search' : 'No active clients found'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredElders.map((elder) => (
                <div
                  key={elder.id}
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                    assignedElders.has(elder.id)
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => toggleElderAssignment(elder.id)}
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-medium text-sm">
                        {elder.first_name[0]}{elder.last_name[0]}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">
                        {elder.first_name} {elder.last_name}
                      </p>
                      <p className="text-sm text-gray-600">{elder.phone}</p>
                    </div>
                  </div>
                  
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    assignedElders.has(elder.id)
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300'
                  }`}>
                    {assignedElders.has(elder.id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {assignedElders.size} client{assignedElders.size !== 1 ? 's' : ''} selected
          </p>
          
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Assignments'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

