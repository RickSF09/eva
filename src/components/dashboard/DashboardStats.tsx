'use client'

import { Users, Phone, AlertTriangle, Calendar } from 'lucide-react'

interface DashboardStatsProps {
  stats: {
    totalClients: number
    activeCalls: number
    recentEscalations: number
    scheduledCalls: number
  }
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const statItems = [
    {
      name: 'Total Clients',
      value: stats.totalClients,
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      bgColor: 'bg-blue-600',
    },
    {
      name: 'Saved Visits',
      value: stats.activeCalls,
      icon: Phone,
      color: 'bg-green-50 text-green-600',
      bgColor: 'bg-green-600',
    },
    {
      name: 'Recent Escalations',
      value: stats.recentEscalations,
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-600',
      bgColor: 'bg-red-600',
    },
    {
      name: 'Scheduled Calls',
      value: stats.scheduledCalls,
      icon: Calendar,
      color: 'bg-purple-50 text-purple-600',
      bgColor: 'bg-purple-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((item) => (
        <div key={item.name} className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${item.color}`}>
              <item.icon className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{item.name}</p>
              <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

