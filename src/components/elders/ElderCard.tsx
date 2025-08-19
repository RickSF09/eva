'use client'

import { useState, useEffect } from 'react'
import { Phone, MapPin, Calendar, AlertTriangle, MessageSquare, MoreVertical, Clock, Trash2 } from 'lucide-react'
import { formatDate, getInitials } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface Elder {
  id: string
  first_name: string
  last_name: string
  phone: string
  address?: string
  medical_conditions?: string
  medications?: string
  active: boolean
  created_at: string
  // Computed fields that would come from joins/aggregations
  last_call_date?: string
  health_score?: number
  recent_escalations?: number
}

interface Schedule {
  id: string
  name: string
  frequency: string
  call_times: string[]
}

interface ElderCardProps {
  elder: Elder
  onEdit: (elder: Elder) => void
  onDeleted?: () => void
}

export function ElderCard({ elder, onEdit, onDeleted }: ElderCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loadingSchedules, setLoadingSchedules] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  const fullName = `${elder.first_name} ${elder.last_name}`
  const initials = getInitials(fullName)
  
  useEffect(() => {
    fetchSchedules()
  }, [elder.id])

  const fetchSchedules = async () => {
    try {
      setLoadingSchedules(true)
      const { data, error } = await supabase
        .from('elder_call_schedules')
        .select(`
          schedule_id,
          call_schedules (
            id,
            name,
            frequency,
            call_times
          )
        `)
        .eq('elder_id', elder.id)
        .eq('active', true)

      if (error) throw error

      const elderSchedules: Schedule[] = []
      if (data) {
        for (const item of data) {
          if (item.call_schedules && typeof item.call_schedules === 'object' && 'id' in item.call_schedules) {
            const s: any = item.call_schedules
            elderSchedules.push({
              id: s.id,
              name: s.name,
              frequency: s.frequency,
              call_times: s.call_times || []
            } as Schedule)
          }
        }
      }

      setSchedules(elderSchedules)
    } catch (err) {
      console.error('Error fetching schedules:', err)
    } finally {
      setLoadingSchedules(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this client? This will permanently remove the client and all associated data (call assignments, call history, notes, escalations). This action cannot be undone.'
    )
    if (!confirmed) return

    setDeleting(true)
    try {
      // Attempt hard delete first
      const { error: deleteError } = await supabase
        .from('elders')
        .delete()
        .eq('id', elder.id)

      if (deleteError) {
        // Fallback to soft delete
        const { error: updateError } = await supabase
          .from('elders')
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq('id', elder.id)

        if (updateError) {
          console.error('Error deleting elder:', deleteError, updateError)
          alert('Failed to delete client')
          return
        }
      }

      if (onDeleted) onDeleted()
    } catch (err) {
      console.error('Unexpected error deleting elder:', err)
      alert('Failed to delete client')
    } finally {
      setDeleting(false)
      setMenuOpen(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-700 font-semibold">{initials}</span>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-gray-900">{fullName}</h3>
            <div className="flex items-center text-sm text-gray-500">
              <Phone className="w-4 h-4 mr-1" />
              {elder.phone}
            </div>
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-500" />
          </button>
          
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
              <button
                onClick={() => {
                  onEdit(elder)
                  setMenuOpen(false)
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-lg"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center ${
                  deleting ? 'text-red-400 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'
                }`}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Info */}
      <div className="space-y-2 mb-4">
        {elder.address && (
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2 text-gray-400" />
            <span className="truncate">{elder.address}</span>
          </div>
        )}
        
        {elder.last_call_date && (
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
            <span>Last call: {formatDate(elder.last_call_date)}</span>
          </div>
        )}
        
        {elder.recent_escalations && elder.recent_escalations > 0 && (
          <div className="flex items-center text-sm text-red-600">
            <AlertTriangle className="w-4 h-4 mr-2" />
            <span>{elder.recent_escalations} recent escalation{elder.recent_escalations > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Schedules */}
      <div className="border-t border-gray-100 pt-3 mb-4">
        <div className="flex items-center text-xs text-gray-500 mb-2">
          <Clock className="w-3 h-3 mr-1" />
          Call Schedules
        </div>
        {loadingSchedules ? (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-xs text-gray-500">Loading...</span>
          </div>
        ) : schedules.length === 0 ? (
          <p className="text-xs text-gray-500">No schedules assigned</p>
        ) : (
          <div className="space-y-1">
            {schedules.slice(0, 3).map((schedule) => (
              <div key={schedule.id} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 font-medium">{schedule.name}</span>
                <span className="text-xs text-gray-500">
                  {schedule.call_times?.[0] || 'No time set'}
                </span>
              </div>
            ))}
            {schedules.length > 3 && (
              <p className="text-xs text-gray-500">
                +{schedules.length - 3} more schedule{schedules.length - 3 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Medical Info Preview */}
      {(elder.medical_conditions || elder.medications) && (
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center text-xs text-gray-500 mb-2">
            <MessageSquare className="w-3 h-3 mr-1" />
            Medical Information
          </div>
          {elder.medical_conditions && (
            <p className="text-sm text-gray-600 truncate mb-1">
              <span className="font-medium">Conditions:</span> {elder.medical_conditions}
            </p>
          )}
          {elder.medications && (
            <p className="text-sm text-gray-600 truncate">
              <span className="font-medium">Medications:</span> {elder.medications}
            </p>
          )}
        </div>
      )}

      {/* Status */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          elder.active 
            ? 'bg-green-50 text-green-700' 
            : 'bg-gray-50 text-gray-700'
        }`}>
          {elder.active ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  )
}

