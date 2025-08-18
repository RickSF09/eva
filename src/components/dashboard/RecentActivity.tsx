'use client'

import { Phone, AlertTriangle, Calendar, CheckCircle, XCircle } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface ActivityItem {
  id: string
  type: 'call' | 'escalation' | 'schedule'
  title: string
  description: string
  timestamp: string
  status?: 'success' | 'failed' | 'pending'
  elderName?: string
}

interface RecentActivityProps {
  activities: ActivityItem[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const getActivityIcon = (type: string, status?: string) => {
    switch (type) {
      case 'call':
        if (status === 'success') return <CheckCircle className="w-5 h-5 text-green-600" />
        if (status === 'failed') return <XCircle className="w-5 h-5 text-red-600" />
        return <Phone className="w-5 h-5 text-blue-600" />
      case 'escalation':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'schedule':
        return <Calendar className="w-5 h-5 text-purple-600" />
      default:
        return <Phone className="w-5 h-5 text-gray-600" />
    }
  }

  const getActivityBgColor = (type: string, status?: string) => {
    switch (type) {
      case 'call':
        if (status === 'success') return 'bg-green-50'
        if (status === 'failed') return 'bg-red-50'
        return 'bg-blue-50'
      case 'escalation':
        return 'bg-red-50'
      case 'schedule':
        return 'bg-purple-50'
      default:
        return 'bg-gray-50'
    }
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="text-center py-8">
          <Phone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No recent activity</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg ${getActivityBgColor(activity.type, activity.status)}`}>
              {getActivityIcon(activity.type, activity.status)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {activity.title}
                </p>
                <p className="text-xs text-gray-500 ml-2">
                  {formatDateTime(activity.timestamp)}
                </p>
              </div>
              
              <p className="text-sm text-gray-600 mt-1">
                {activity.description}
              </p>
              
              {activity.elderName && (
                <p className="text-xs text-gray-500 mt-1">
                  Client: {activity.elderName}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100">
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View all activity →
        </button>
      </div>
    </div>
  )
}

