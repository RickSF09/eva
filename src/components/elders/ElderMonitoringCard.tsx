'use client'

import { useMemo } from 'react'
import { Activity, AlertTriangle, Clock, Phone } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { computeHealthStatus, healthColorClasses, formatPercent, WeeklyCallStats } from '@/lib/health'

interface ElderMonitoringCardProps {
  elder: {
    id: string
    first_name: string
    last_name: string
    phone: string
  }
  stats: WeeklyCallStats
  lastCall?: {
    call_started_at: string
    call_status: string
    summary?: string | null
    mood_assessment?: string | null
    call_executions?: {
      call_type: string
    } | null
  } | null
  onOpenDetail: (elderId: string) => void
}

export function ElderMonitoringCard({ elder, stats, lastCall, onOpenDetail }: ElderMonitoringCardProps) {
  const status = useMemo(() => computeHealthStatus(stats), [stats])
  const colors = healthColorClasses(status)

  const getCallTypeInfo = (callType: string) => {
    switch (callType) {
      case 'check_in':
        return {
          label: 'Check-in',
          color: 'bg-blue-50 text-blue-700 border-blue-200',
          bgColor: 'bg-blue-500'
        }
      case 'emergency':
        return {
          label: 'Emergency',
          color: 'bg-red-50 text-red-700 border-red-200',
          bgColor: 'bg-red-500'
        }
      case 'wellness':
        return {
          label: 'Wellness',
          color: 'bg-green-50 text-green-700 border-green-200',
          bgColor: 'bg-green-500'
        }
      case 'medication_reminder':
        return {
          label: 'Medication',
          color: 'bg-purple-50 text-purple-700 border-purple-200',
          bgColor: 'bg-purple-500'
        }
      case 'social':
        return {
          label: 'Social',
          color: 'bg-orange-50 text-orange-700 border-orange-200',
          bgColor: 'bg-orange-500'
        }
      case 'escalation_followup':
        return {
          label: 'Follow-up',
          color: 'bg-amber-50 text-amber-700 border-amber-200',
          bgColor: 'bg-amber-500'
        }
      case 'emergency_contact':
        return {
          label: 'Emergency Contact',
          color: 'bg-red-50 text-red-700 border-red-200',
          bgColor: 'bg-red-500'
        }
      case 'scheduled':
        return {
          label: 'Scheduled',
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          bgColor: 'bg-indigo-500'
        }
      case 'regular':
        return {
          label: 'Regular',
          color: 'bg-gray-50 text-gray-700 border-gray-200',
          bgColor: 'bg-gray-500'
        }
      default:
        return {
          label: callType || 'Unknown',
          color: 'bg-gray-50 text-gray-700 border-gray-200',
          bgColor: 'bg-gray-500'
        }
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition cursor-pointer" onClick={() => onOpenDetail(elder.id)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{elder.first_name} {elder.last_name}</h3>
          <p className="text-sm text-gray-500">{elder.phone}</p>
        </div>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
          <span className={`w-2 h-2 rounded-full mr-2 ${colors.dot}`} />
          {status.toUpperCase()}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center text-xs text-gray-500"><Activity className="w-3 h-3 mr-1" /> Completion</div>
          <div className="text-lg font-semibold text-gray-900">{formatPercent(stats.completionRate)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center text-xs text-gray-500"><AlertTriangle className="w-3 h-3 mr-1" /> Escalations</div>
          <div className="text-lg font-semibold text-gray-900">{stats.escalations}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center text-xs text-gray-500"><Phone className="w-3 h-3 mr-1" /> Calls (7d)</div>
          <div className="text-lg font-semibold text-gray-900">{stats.completedCount}/{stats.totalCount}</div>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600 flex items-center">
        <Clock className="w-4 h-4 mr-2 text-gray-400" />
        {lastCall ? (
          <div className="flex items-center space-x-2">
            <span>Last call {formatDateTime(lastCall.call_started_at)}</span>
            {lastCall.call_executions?.call_type && (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCallTypeInfo(lastCall.call_executions.call_type).color}`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${getCallTypeInfo(lastCall.call_executions.call_type).bgColor}`}></div>
                {getCallTypeInfo(lastCall.call_executions.call_type).label}
              </span>
            )}
            <span>• {lastCall.mood_assessment || 'No mood'} • {lastCall.call_status}</span>
          </div>
        ) : (
          <span>No recent calls</span>
        )}
      </div>
    </div>
  )
}


