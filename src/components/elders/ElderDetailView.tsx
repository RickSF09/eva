'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateTime, formatDuration } from '@/lib/utils'
import { computeHealthStatus, healthColorClasses, WeeklyCallStats } from '@/lib/health'
import { CallReportModal } from '@/components/calls/CallReportModal'
import { Clock, ChevronRight, AlertTriangle } from 'lucide-react'

interface ElderDetailViewProps {
  elderId: string
  onClose: () => void
}

export function ElderDetailView({ elderId, onClose }: ElderDetailViewProps) {

  const [elder, setElder] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])

  const [stats, setStats] = useState<WeeklyCallStats | null>(null)
  const [selectedReport, setSelectedReport] = useState<any | null>(null)
  const [callTypeFilter, setCallTypeFilter] = useState<string>('all')

  useEffect(() => {
    fetchElder()
    fetchReports()
  }, [elderId])

  const fetchElder = async () => {
    const { data } = await supabase.from('elders').select('*').eq('id', elderId).single()
    setElder(data)
  }

  const fetchReports = async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('post_call_reports')
      .select(`
        *,
        call_executions!inner(
          call_type
        )
      `)
      .eq('elder_id', elderId)
      .gte('call_started_at', sevenDaysAgo)
      .order('call_started_at', { ascending: false })
    setReports(data || [])

    // compute weekly stats
    const totalCount = data?.length || 0
    const completed = (data || []).filter((r: any) => {
      const status = (r.call_status || '').toLowerCase()
      const isCompletedStatus = ['completed', 'success', 'succeeded', 'completed_successfully'].includes(status)
      return isCompletedStatus || !!r.call_ended_at
    }).length
    const completionRate = totalCount > 0 ? completed / totalCount : 0
    const sentiments = (data || []).map(r => r.sentiment_score).filter((v:any) => typeof v === 'number') as number[]
    const averageSentiment = sentiments.length ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length : null
    setStats({ completedCount: completed, totalCount, completionRate, averageSentiment, escalations: 0 })
  }



  const status = stats ? computeHealthStatus(stats) : 'green'
  const colors = healthColorClasses(status)

  const getCallTypeInfo = (callType: string) => {
    switch (callType) {
      case 'scheduled':
        return {
          label: 'Scheduled',
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          bgColor: 'bg-indigo-500'
        }
      case 'retry':
        return {
          label: 'Retry',
          color: 'bg-orange-50 text-orange-700 border-orange-200',
          bgColor: 'bg-orange-500'
        }
      case 'emergency_contact':
        return {
          label: 'Emergency Contact',
          color: 'bg-red-50 text-red-700 border-red-200',
          bgColor: 'bg-red-500'
        }
      case 'escalation_followup':
        return {
          label: 'Escalation Follow-up',
          color: 'bg-amber-50 text-amber-700 border-amber-200',
          bgColor: 'bg-amber-500'
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
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{elder?.first_name} {elder?.last_name}</h2>
            {stats && (
              <span className={`inline-flex items-center mt-2 px-2 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
                <span className={`w-2 h-2 rounded-full mr-2 ${colors.dot}`} />
                {status.toUpperCase()}
              </span>
            )}
          </div>
          <button onClick={onClose} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">Close</button>
        </div>

        <div className="px-6 pt-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <button className="px-3 py-2 rounded-t-lg text-sm font-medium bg-white border border-b-0 border-gray-200 text-gray-900">
              Call History
            </button>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Filter by type:</label>
              <select 
                value={callTypeFilter} 
                onChange={(e) => setCallTypeFilter(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All calls</option>
                <option value="scheduled">Scheduled</option>
                <option value="retry">Retry</option>
                <option value="emergency_contact">Emergency Contact</option>
                <option value="escalation_followup">Escalation Follow-up</option>
              </select>
            </div>
          </div>
        </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          <div className="space-y-3">
            {(reports || [])
              .filter(r => callTypeFilter === 'all' || r.call_executions?.call_type === callTypeFilter)
              .map((r) => {
                const callTypeInfo = getCallTypeInfo(r.call_executions?.call_type)
                return (
                  <button key={r.id} className="text-left w-full border border-gray-200 rounded-lg p-4 hover:bg-gray-50 group" onClick={() => setSelectedReport(r)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm text-gray-600 flex items-center">
                            <Clock className="w-4 h-4 mr-2" /> 
                            {formatDateTime(r.call_started_at)}
                            {r.call_ended_at ? ` - ${formatDateTime(r.call_ended_at)}` : ''}
                          </div>
                          <div className="flex items-center space-x-2">
                            {r.escalation_triggered && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                ESCALATED
                              </span>
                            )}
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${callTypeInfo.color}`}>
                              <div className={`w-2 h-2 rounded-full mr-2 ${callTypeInfo.bgColor}`}></div>
                              {callTypeInfo.label}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">Duration: {r.duration_seconds ? formatDuration(r.duration_seconds) : 'N/A'}</div>
                        <div className="text-sm text-gray-900 line-clamp-2">{r.summary || 'No summary available'}</div>
                      </div>
                      <div className="flex items-center text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                        View details <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  </button>
                )
              })}
          </div>
        </div>
      </div>
      {selectedReport && (
        <CallReportModal 
          report={selectedReport} 
          onClose={() => setSelectedReport(null)}
          onOpenReport={(r) => setSelectedReport(r)}
        />
      )}
    </div>
  )
}


