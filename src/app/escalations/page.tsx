'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useOrganizations } from '@/hooks/useOrganizations'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { EscalationCard } from '@/components/escalations/EscalationCard'
import { supabase } from '@/lib/supabase'
import { AlertTriangle } from 'lucide-react'

export default function EscalationsPage() {
  const { user } = useAuth()
  const { currentOrg } = useOrganizations()
  const [escalations, setEscalations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentOrg) {
      fetchEscalations()
    }
  }, [currentOrg])

  const fetchEscalations = async () => {
    if (!currentOrg) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('escalation_incidents')
        .select(`
          *,
          elders (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching escalations:', error)
      } else {
        setEscalations(data || [])
      }
    } catch (err) {
      console.error('Error fetching escalations:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Escalations</h1>
          <p className="text-gray-600">View and manage emergency escalation incidents</p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading escalations...</p>
          </div>
        ) : escalations.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No escalations</h3>
            <p className="text-gray-600">Great! No emergency escalations have been triggered yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {escalations.map((escalation) => (
              <EscalationCard
                key={escalation.id}
                escalation={escalation}
                elderName={`${escalation.elders?.first_name || ''} ${escalation.elders?.last_name || ''}`.trim()}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
