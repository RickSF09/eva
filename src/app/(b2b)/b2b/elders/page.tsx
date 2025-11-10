'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useOrganizations } from '@/hooks/useOrganizations'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ElderCard } from '@/components/elders/ElderCard'
import { ElderForm } from '@/components/elders/ElderForm'
import { supabase } from '@/lib/supabase'
import { Plus } from 'lucide-react'

export default function EldersPage() {
  const { user } = useAuth()
  const { currentOrg } = useOrganizations()
  const [elders, setElders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingElder, setEditingElder] = useState<any>(null)

  useEffect(() => {
    if (currentOrg) {
      fetchElders()
    }
  }, [currentOrg])

  const fetchElders = async () => {
    if (!currentOrg) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('elders')
        .select('*')
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching elders:', error)
      } else {
        setElders(data || [])
      }
    } catch (err) {
      console.error('Error fetching elders:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleElderAdded = () => {
    setShowAddForm(false)
    fetchElders()
  }

  const handleElderEdited = () => {
    setEditingElder(null)
    fetchElders()
  }

  const handleEditElder = (elder: any) => {
    setEditingElder(elder)
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600">Manage the clients in your care</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </button>
        </div>

        {showAddForm && (
          <div className="mb-8">
            <ElderForm
              onSave={handleElderAdded}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        )}

        {editingElder && (
          <div className="mb-8">
            <ElderForm
              elder={editingElder}
              onSave={handleElderEdited}
              onCancel={() => setEditingElder(null)}
            />
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading clients...</p>
          </div>
        ) : elders.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clients yet</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first client to care for.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Client
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {elders.map((elder) => (
              <ElderCard
                key={elder.id}
                elder={elder}
                onEdit={handleEditElder}
                onDeleted={fetchElders}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
