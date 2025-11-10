'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useOrganizations } from '@/hooks/useOrganizations'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { EmergencyContactForm } from '@/components/emergency/EmergencyContactForm'
import { ElderAssignment } from '@/components/emergency/ElderAssignment'
import { supabase } from '@/lib/supabase'
import { Plus, Phone, User, AlertTriangle, Users } from 'lucide-react'

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

interface EmergencyContact {
  id: string
  name: string
  phone: string
  email?: string
  active: boolean
  created_at: string
  updated_at: string
  elder_assignments?: ElderAssignment[]
}

export default function EmergencyContactsPage() {
  const { user } = useAuth()
  const { currentOrg } = useOrganizations()
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null)
  const [assigningElders, setAssigningElders] = useState<EmergencyContact | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (currentOrg) {
      fetchContacts()
    }
  }, [currentOrg])

  const fetchContacts = async () => {
    if (!currentOrg) return

    try {
      setLoading(true)
      console.log('Fetching emergency contacts for org:', currentOrg.id)
      
      let { data, error } = await supabase
        .from('emergency_contacts')
        .select(`
          *,
          elder_assignments:elder_emergency_contact(
            id,
            elder_id,
            emergency_contact_id,
            "priority order",
            relation,
            elder:elders(id, first_name, last_name, phone)
          )
        `)
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false })

      console.log('Emergency contacts response (scoped):', { count: data?.length, error })

      if (!error && (data?.length ?? 0) === 0) {
        // Fallback: show all to help diagnose missing org_id
        const fallback = await supabase
          .from('emergency_contacts')
          .select(`
            *,
            elder_assignments:elder_emergency_contact(
              id,
              elder_id,
              emergency_contact_id,
              "priority order",
              relation,
              elder:elders(id, first_name, last_name, phone)
            )
          `)
          .order('created_at', { ascending: false })

        console.log('Emergency contacts fallback (all):', { count: fallback.data?.length, error: fallback.error })
        if (!fallback.error && (fallback.data?.length ?? 0) > 0) {
          // Transform the fallback data as well
          data = (fallback.data || []).map((contact: any) => ({
            ...contact,
            elder_assignments: contact.elder_assignments?.map((assignment: any) => ({
              ...assignment,
              elder: Array.isArray(assignment.elder) ? assignment.elder[0] : assignment.elder
            })) || []
          }))
        }
      }

      if (error) {
        console.error('Error fetching emergency contacts:', error)
        setError(error.message)
      } else {
        // Transform the data to handle the nested elder object correctly
        const transformedData = (data || []).map((contact: any) => ({
          ...contact,
          elder_assignments: contact.elder_assignments?.map((assignment: any) => ({
            ...assignment,
            elder: Array.isArray(assignment.elder) ? assignment.elder[0] : assignment.elder
          })) || []
        }))
        setContacts(transformedData)
      }
    } catch (err) {
      console.error('Error fetching emergency contacts:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleContactAdded = () => {
    setShowAddForm(false)
    fetchContacts()
  }

  const handleContactEdited = () => {
    setEditingContact(null)
    fetchContacts()
  }

  const handleEditContact = (contact: EmergencyContact) => {
    setEditingContact(contact)
  }

  const handleAssignElders = (contact: EmergencyContact) => {
    setAssigningElders(contact)
  }

  const handleEldersAssigned = () => {
    setAssigningElders(null)
    fetchContacts()
  }

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this emergency contact?')) return

    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', contactId)

      if (error) throw error
      fetchContacts()
    } catch (err) {
      console.error('Error deleting emergency contact:', err)
    }
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Emergency Contacts</h1>
            <p className="text-gray-600">Manage emergency contacts for your organization</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </button>
        </div>

        {showAddForm && (
          <div className="mb-8">
            <EmergencyContactForm
              onSave={handleContactAdded}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        )}

        {editingContact && (
          <div className="mb-8">
            <EmergencyContactForm
              contact={editingContact}
              onSave={handleContactEdited}
              onCancel={() => setEditingContact(null)}
              onAssignElders={() => handleAssignElders(editingContact)}
            />
          </div>
        )}

        {assigningElders && (
          <ElderAssignment
            emergencyContactId={assigningElders.id}
            onSave={handleEldersAssigned}
            onCancel={() => setAssigningElders(null)}
          />
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading emergency contacts...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading contacts</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchContacts}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No emergency contacts yet</h3>
            <p className="text-gray-600 mb-4">Add emergency contacts to ensure quick response in urgent situations.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Contact
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contacts.map((contact) => (
              <div key={contact.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900">{contact.name}</h3>
                      {contact.email && (
                        <p className="text-sm text-gray-500">{contact.email}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAssignElders(contact)}
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Assign Clients"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditContact(contact)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Contact"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Contact"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{contact.phone}</span>
                  </div>
                  
                  {contact.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{contact.email}</span>
                    </div>
                  )}

                  {/* Assigned Elders */}
                  {contact.elder_assignments && contact.elder_assignments.length > 0 && (
                    <div className="border-t border-gray-100 pt-3">
                      <div className="flex items-center text-xs text-gray-500 mb-2">
                        <Users className="w-3 h-3 mr-1" />
                        Assigned Clients
                      </div>
                      <div className="space-y-1">
                        {contact.elder_assignments.slice(0, 3).map((assignment) => (
                          <div key={assignment.id} className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 font-medium">{assignment.elder.first_name} {assignment.elder.last_name}</span>
                            <span className="text-xs text-gray-500">
                              {assignment.relation} • Priority {assignment["priority order"]}
                            </span>
                          </div>
                        ))}
                        {contact.elder_assignments.length > 3 && (
                          <p className="text-xs text-gray-500">
                            +{contact.elder_assignments.length - 3} more client{contact.elder_assignments.length - 3 > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    contact.active 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-gray-50 text-gray-700'
                  }`}>
                    {contact.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
