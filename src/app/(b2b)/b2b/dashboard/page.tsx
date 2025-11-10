'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { useOrganizations } from '@/hooks/useOrganizations'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { CallsKanban } from '@/components/dashboard/CallsKanban'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { currentOrg } = useOrganizations()
  const [stats, setStats] = useState({
            totalClients: 0,
    activeCalls: 0,
    recentEscalations: 0,
    scheduledCalls: 0,
  })
  const [activities, setActivities] = useState<any[]>([])

  useEffect(() => {
    if (currentOrg) {
      fetchDashboardData()
    }
  }, [currentOrg])

  const fetchDashboardData = async () => {
    if (!currentOrg) return

    try {
      // Fetch elders count
      const { count: eldersCount } = await supabase
        .from('elders')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', currentOrg.id)
        .eq('active', true)

      // Fetch today's calls
      const today = new Date().toISOString().split('T')[0]
      const { count: callsCount } = await supabase
        .from('call_executions')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_for', today)
        .lt('scheduled_for', `${today}T23:59:59`)

      // Fetch recent escalations
      const { count: escalationsCount } = await supabase
        .from('escalation_incidents')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      // Fetch scheduled calls
      const { count: scheduledCount } = await supabase
        .from('call_executions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      setStats({
        totalClients: eldersCount || 0,
        activeCalls: callsCount || 0,
        recentEscalations: escalationsCount || 0,
        scheduledCalls: scheduledCount || 0,
      })

      // Mock activities for now
      setActivities([
        {
          id: '1',
          type: 'call',
          title: 'Call completed',
          description: 'Daily check-in with John Doe',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          elderName: 'John Doe',
        },
        {
          id: '2',
          type: 'escalation',
          title: 'Escalation triggered',
          description: 'Client mentioned feeling unwell',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          elderName: 'Jane Smith',
        },
      ])
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    }
  }

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add-client':
        router.push('/b2b/elders')
        break
      case 'create-schedule':
        router.push('/b2b/schedules')
        break
      case 'add-emergency-contact':
        router.push('/b2b/emergency-contacts')
        break
      default:
        break
    }
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your elders.</p>
        </div>

        <div className="space-y-8">
          <DashboardStats stats={stats} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <RecentActivity activities={activities} />
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => handleQuickAction('add-client')}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">Add New Client</div>
                  <div className="text-sm text-gray-600">Set up care for a new family member</div>
                </button>
                <button 
                  onClick={() => handleQuickAction('create-schedule')}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">Create Schedule</div>
                  <div className="text-sm text-gray-600">Set up regular check-in calls</div>
                </button>
                <button 
                  onClick={() => handleQuickAction('add-emergency-contact')}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">Add Emergency Contact</div>
                  <div className="text-sm text-gray-600">Add someone to contact in emergencies</div>
                </button>
              </div>
            </div>
          </div>

          {currentOrg && (
            <CallsKanban orgId={currentOrg.id} />
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
