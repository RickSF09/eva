'use client'

import { useState, useEffect } from 'react'
import { User, X, Plus, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganizations } from '@/hooks/useOrganizations'

interface Elder {
  id: string
  first_name: string
  last_name: string
  phone: string
}

interface ElderAssignment {
  id: string
  elder_id: string
  emergency_contact_id: string
  "priority order": number
  relation: string
  elder: Elder
}

interface ElderAssignmentProps {
  emergencyContactId: string
  onCancel: () => void
  onSave: () => void
}

export function ElderAssignment({ emergencyContactId, onCancel, onSave }: ElderAssignmentProps) {
  const { currentOrg } = useOrganizations()
  const [elders, setElders] = useState<Elder[]>([])
  const [assignments, setAssignments] = useState<ElderAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selectedElderId, setSelectedElderId] = useState('')
  const [relation, setRelation] = useState('')
  const [priorityOrder, setPriorityOrder] = useState(1)

  // Update priority order when assignments change
  useEffect(() => {
    // For emergency contacts, we can have multiple elders at the same priority
    // So we just use the next sequential number
    setPriorityOrder(assignments.length + 1)
  }, [assignments.length])

  // Function to get available priorities for a specific elder
  const getAvailablePrioritiesForElder = async (elderId: string, excludeAssignmentId?: string) => {
    try {
      const { data: existingAssignments, error } = await supabase
        .from('elder_emergency_contact')
        .select('id, "priority order"')
        .eq('elder_id', elderId)
        .neq('id', excludeAssignmentId || '')

      if (error) throw error

      const usedPriorities = (existingAssignments || []).map(a => a["priority order"])
      const availablePriorities = []
      
      // Find the first available priority (starting from 1)
      for (let i = 1; i <= Math.max(...usedPriorities, 0) + 1; i++) {
        if (!usedPriorities.includes(i)) {
          availablePriorities.push(i)
        }
      }

      return availablePriorities
    } catch (err) {
      console.error('Error getting available priorities:', err)
      return [1, 2, 3, 4, 5] // Fallback
    }
  }

  useEffect(() => {
    if (currentOrg) {
      fetchElders()
      fetchAssignments()
    }
  }, [currentOrg, emergencyContactId])

  const fetchElders = async () => {
    if (!currentOrg) return

    try {
      const { data, error } = await supabase
        .from('elders')
        .select('id, first_name, last_name, phone')
        .eq('org_id', currentOrg.id)
        .order('first_name')

      if (error) throw error
      setElders(data || [])
    } catch (err) {
      console.error('Error fetching elders:', err)
      setError('Failed to load elders')
    }
  }

  const fetchAssignments = async () => {
    if (!emergencyContactId) return

    try {
      const { data, error } = await supabase
        .from('elder_emergency_contact')
        .select(`
          id,
          elder_id,
          emergency_contact_id,
          "priority order",
          relation,
          elder:elders(id, first_name, last_name, phone)
        `)
        .eq('emergency_contact_id', emergencyContactId)
        .order('"priority order"')

      if (error) throw error
      // Transform the data to handle the nested elder object correctly
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        elder: Array.isArray(item.elder) ? item.elder[0] : item.elder
      }))
      setAssignments(transformedData)
    } catch (err) {
      console.error('Error fetching assignments:', err)
      setError('Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }

  const handleAddAssignment = async () => {
    if (!selectedElderId || !relation.trim()) {
      setError('Please select an elder and enter a relation')
      return
    }

    // Check if this elder is already assigned
    const existingAssignment = assignments.find(a => a.elder_id === selectedElderId)
    if (existingAssignment) {
      setError('This elder is already assigned to this emergency contact')
      return
    }

    // Check if this elder already has this priority with another emergency contact
    try {
      const { data: existingPriorities, error: priorityError } = await supabase
        .from('elder_emergency_contact')
        .select('id, "priority order"')
        .eq('elder_id', selectedElderId)
        .eq('"priority order"', priorityOrder)

      if (priorityError) throw priorityError

      if (existingPriorities && existingPriorities.length > 0) {
        setError(`This client already has an emergency contact at Priority ${priorityOrder}. Please choose a different priority.`)
        return
      }
    } catch (err) {
      setError('Failed to check priority conflicts')
      return
    }



    setSaving(true)
    setError('')

    try {
      const { error } = await supabase
        .from('elder_emergency_contact')
        .insert({
          elder_id: selectedElderId,
          emergency_contact_id: emergencyContactId,
          "priority order": priorityOrder,
          relation: relation.trim()
        })

      if (error) throw error

      // Reset form
      setSelectedElderId('')
      setRelation('')
      setError('')

      // Refresh assignments
      fetchAssignments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add assignment')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    setSaving(true)
    setError('')

    try {
      const { error } = await supabase
        .from('elder_emergency_contact')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error

      // Refresh assignments
      fetchAssignments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove assignment')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePriority = async (assignmentId: string, newPriority: number) => {
    setSaving(true)
    setError('')

    try {
      // Get the current assignment to find the elder_id
      const currentAssignment = assignments.find(a => a.id === assignmentId)
      if (!currentAssignment) {
        setError('Assignment not found')
        return
      }

      // Check if this elder already has this priority with another emergency contact
      const { data: existingPriorities, error: priorityError } = await supabase
        .from('elder_emergency_contact')
        .select('id, "priority order"')
        .eq('elder_id', currentAssignment.elder_id)
        .eq('"priority order"', newPriority)
        .neq('id', assignmentId) // Exclude the current assignment

      if (priorityError) throw priorityError

      if (existingPriorities && existingPriorities.length > 0) {
        setError(`This client already has an emergency contact at Priority ${newPriority}. Please choose a different priority.`)
        return
      }

      const { error } = await supabase
        .from('elder_emergency_contact')
        .update({ "priority order": newPriority })
        .eq('id', assignmentId)

      if (error) throw error

      // Refresh assignments
      fetchAssignments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update priority')
    } finally {
      setSaving(false)
    }
  }

  const availableElders = elders.filter(elder => 
    !assignments.some(assignment => assignment.elder_id === elder.id)
  )

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2 text-gray-500" />
            Assign Clients
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading assignments...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current Assignments */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Current Assignments</h3>
                {assignments.length === 0 ? (
                  <p className="text-gray-500 text-sm">No elders assigned yet.</p>
                ) : (
                  <div className="space-y-3">
                    {assignments.map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{assignment.elder.first_name} {assignment.elder.last_name}</p>
                            <p className="text-sm text-gray-500">{assignment.relation}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-500">Priority:</span>
                            <select
                              value={assignment["priority order"]}
                              onChange={(e) => handleUpdatePriority(assignment.id, parseInt(e.target.value))}
                              className="text-sm border border-gray-200 rounded px-2 py-1 w-12"
                              disabled={saving}
                            >
                              {Array.from({ length: assignments.length }, (_, i) => (
                                <option key={i + 1} value={i + 1}>
                                  {i + 1}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={() => handleRemoveAssignment(assignment.id)}
                            disabled={saving}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Assignment */}
              {availableElders.length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Add Client Assignment</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Client
                      </label>
                      <select
                        value={selectedElderId}
                        onChange={(e) => setSelectedElderId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="">Choose an elder...</option>
                        {availableElders.map((elder) => (
                          <option key={elder.id} value={elder.id}>
                            {elder.first_name} {elder.last_name} ({elder.phone})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Relation
                      </label>
                      <input
                        type="text"
                        value={relation}
                        onChange={(e) => setRelation(e.target.value)}
                        placeholder="e.g., Daughter, Son, Neighbor, Friend"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priority Order
                      </label>
                      <div className="flex items-center space-x-2">
                        <select
                          value={priorityOrder}
                          onChange={(e) => setPriorityOrder(parseInt(e.target.value))}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        >
                          {(() => {
                            // For new assignments, we'll show a reasonable range
                            // The actual validation will happen when adding
                            const maxPriority = Math.max(assignments.length + 1, 5)
                            return Array.from({ length: maxPriority }, (_, i) => (
                              <option key={i + 1} value={i + 1}>
                                Priority {i + 1}
                              </option>
                            ))
                          })()}
                        </select>
                        <span className="text-sm text-gray-500">
                          (Sequential priority)
                        </span>
                      </div>
                                              <p className="mt-1 text-xs text-gray-500">
                          Priority determines the order in which this emergency contact will be called for this elder during emergencies.
                        </p>
                    </div>

                    <button
                      onClick={handleAddAssignment}
                      disabled={saving || !selectedElderId || !relation.trim()}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {saving ? 'Adding...' : 'Add Assignment'}
                    </button>
                  </div>
                </div>
              )}

              {availableElders.length === 0 && assignments.length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <p className="text-gray-500 text-sm text-center">
                    All clients are already assigned to this contact.
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
