'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useOrganizations } from '@/hooks/useOrganizations'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ScheduleForm } from '@/components/schedules/ScheduleForm'
import { ScheduleAssignment } from '@/components/schedules/ScheduleAssignment'
import { supabase } from '@/lib/supabase'
import { Plus, Calendar, ChevronDown, ChevronUp, Users, Trash2 } from 'lucide-react'

interface Elder {
  id: string
  first_name: string
  last_name: string
  phone: string
}

interface ScheduleWithAssignments {
  id: string
  name: string
  description?: string
  frequency: string
  call_times: string[]
  max_retries: number
  active: boolean
  assigned_elders?: Elder[]
}

function AssignedEldersDropdown({ scheduleId }: { scheduleId: string }) {
  const [elders, setElders] = useState<Elder[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const { currentOrg } = useOrganizations()

  const fetchAssignedElders = async () => {
    if (!currentOrg || !expanded) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('elder_call_schedules')
        .select(`
          elder_id,
          elders (
            id,
            first_name,
            last_name,
            phone
          )
        `)
        .eq('schedule_id', scheduleId)
        .eq('active', true)

      if (error) throw error

      const assignedElders: Elder[] = []
      if (data) {
        for (const item of data) {
          if (item.elders && typeof item.elders === 'object' && 'id' in item.elders) {
            const elder = item.elders as any
            if (elder.first_name && elder.last_name && elder.phone) {
              assignedElders.push({
                id: elder.id,
                first_name: elder.first_name,
                last_name: elder.last_name,
                phone: elder.phone
              })
            }
          }
        }
      }

      setElders(assignedElders || [])
    } catch (err) {
      console.error('Error fetching assigned elders:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (expanded) {
      fetchAssignedElders()
    }
  }, [expanded, scheduleId, currentOrg])

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Users className="w-4 h-4 mr-2" />
        {expanded ? (
          <>
            <ChevronUp className="w-4 h-4 mr-1" />
            Hide Assigned Clients
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4 mr-1" />
            Show Assigned Clients
          </>
        )}
      </button>

      {expanded && (
        <div className="bg-gray-50 rounded-lg p-3">
          {loading ? (
            <div className="flex items-center justify-center py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">Loading...</span>
            </div>
          ) : elders.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">
              No clients assigned to this schedule
            </p>
          ) : (
            <div className="space-y-2">
              {elders.map((elder) => (
                <div key={elder.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                      <span className="text-blue-600 font-medium text-xs">
                        {elder.first_name[0]}{elder.last_name[0]}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {elder.first_name} {elder.last_name}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{elder.phone}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SchedulesPage() {
  const { user } = useAuth()
  const { currentOrg } = useOrganizations()
  const [schedules, setSchedules] = useState<ScheduleWithAssignments[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (currentOrg) {
      fetchSchedules()
    }
  }, [currentOrg])

  const fetchSchedules = async () => {
    if (!currentOrg) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('call_schedules')
        .select('*')
        .eq('org_id', currentOrg.id)
        .eq('active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching schedules:', error)
      } else {
        setSchedules(data || [])
      }
    } catch (err) {
      console.error('Error fetching schedules:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleScheduleSaved = () => {
    setShowAddForm(false)
    setShowEditForm(false)
    setSelectedSchedule(null)
    fetchSchedules()
  }

  const handleAssignmentSave = () => {
    setShowAssignmentModal(false)
    setSelectedSchedule(null)
    fetchSchedules()
  }

  const openAssignmentModal = (schedule: any) => {
    setSelectedSchedule(schedule)
    setShowAssignmentModal(true)
  }

  const openEditForm = (schedule: any) => {
    setSelectedSchedule(schedule)
    setShowEditForm(true)
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    const confirmed = window.confirm('Delete this schedule? Assigned clients will no longer receive calls for it.')
    if (!confirmed) return

    setDeletingId(scheduleId)
    try {
      // Try hard delete first
      const { error: deleteError } = await supabase
        .from('call_schedules')
        .delete()
        .eq('id', scheduleId)

      if (deleteError) {
        // Fallback: soft delete by deactivating
        const { error: updateError } = await supabase
          .from('call_schedules')
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq('id', scheduleId)

        if (updateError) {
          console.error('Error deleting schedule:', deleteError, updateError)
          alert('Failed to delete schedule')
          return
        }
      }

      fetchSchedules()
    } catch (err) {
      console.error('Unexpected error deleting schedule:', err)
      alert('Failed to delete schedule')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Call Schedules</h1>
            <p className="text-gray-600">Manage automated check-in calls for your clients</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Schedule
          </button>
        </div>

        {(showAddForm || showEditForm) && (
          <div className="mb-8">
            <ScheduleForm
              schedule={showEditForm ? selectedSchedule : undefined}
              onSave={handleScheduleSaved}
              onCancel={() => {
                setShowAddForm(false)
                setShowEditForm(false)
                setSelectedSchedule(null)
              }}
            />
          </div>
        )}

        {showAssignmentModal && selectedSchedule && (
          <ScheduleAssignment
            schedule={selectedSchedule}
            onSave={handleAssignmentSave}
            onCancel={() => {
              setShowAssignmentModal(false)
              setSelectedSchedule(null)
            }}
          />
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading schedules...</p>
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No schedules yet</h3>
            <p className="text-gray-600 mb-4">Create your first call schedule to start automated check-ins.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Schedule
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{schedule.name}</h3>
                    <p className="text-gray-600">{schedule.description}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => openEditForm(schedule)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      disabled={deletingId === schedule.id}
                      className={`flex items-center text-sm font-medium ${
                        deletingId === schedule.id
                          ? 'text-red-400 cursor-not-allowed'
                          : 'text-red-600 hover:text-red-700'
                      }`}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {deletingId === schedule.id ? 'Deleting…' : 'Delete'}
                    </button>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      schedule.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {schedule.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Schedule Details</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><strong>Frequency:</strong> {schedule.frequency}</p>
                      <p><strong>Call Times:</strong> {schedule.call_times?.join(', ') || 'Not set'}</p>
                      <p><strong>Retry Attempts:</strong> {schedule.max_retries}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Assigned Clients</h4>
                    <AssignedEldersDropdown scheduleId={schedule.id} />
                    <div className="mt-3">
                      <button
                        onClick={() => openAssignmentModal(schedule)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Manage Assignments
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
