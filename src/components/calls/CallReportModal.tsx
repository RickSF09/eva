'use client'

import { formatDateTime, formatDuration } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Phone,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  XCircle,
  User,
  ChevronDown,
  Play,
  Loader2,
} from 'lucide-react'
import { Tables } from '@/types/database'

const RECORDING_URL_TTL_SECONDS = 60 * 60 * 2 // 2 hours

type CallRequest = Tables<'call_requests'>

interface CallReportModalProps {
  report: {
    id: string
    execution_id: string
    elder_id: string
    summary: string | null
    transcript: any
    escalation_triggered: boolean | null
    escalation_data: any
    recording_url?: string | null
    recording_storage_path?: string | null
    conversation_quality: any
    loneliness_indicators: any
    physical_health: any
    mental_health: any
    social_environment: any
    checklist_completion: any
    callback_analysis: any
    health_indicators?: any
    call_executions?: {
      id: string
      attempted_at: string | null
      completed_at: string | null
      duration: number | null
      status: string
      picked_up: boolean | null
      call_type: string | null
      onboarding_call: boolean | null
      scheduled_for: string | null
    } | null
  }
  onClose: () => void
  onOpenReport?: Function
}

export function CallReportModal({ report, onClose, onOpenReport }: CallReportModalProps) {
  const [flow, setFlow] = useState<{
    incident?: any
    attempts?: any[]
    followups?: any[]
  }>({})
  const [elderName, setElderName] = useState<string>('User')
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [recordingLoading, setRecordingLoading] = useState(false)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [requests, setRequests] = useState<CallRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [showDetailedInsights, setShowDetailedInsights] = useState(false)

  const exec = report.call_executions
  const cq = report.conversation_quality || {}
  const li = report.loneliness_indicators || {}
  const ph = report.physical_health || {}
  const mh = report.mental_health || {}
  const se = report.social_environment || {}
  const cl = report.checklist_completion || {}
  const cb = report.callback_analysis || {}

  // ---------------------------------------------------------------------------
  // Connection Outcome helpers
  // ---------------------------------------------------------------------------
  const connectionOutcome = (() => {
    if (!exec) return { label: 'Unknown', color: 'bg-slate-100 text-slate-700' }
    if (exec.status === 'completed' && exec.picked_up) {
      return { label: 'Successful', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' }
    }
    if (exec.status === 'completed' && !exec.picked_up) {
      return { label: 'No response', color: 'bg-rose-50 text-rose-700 border border-rose-200' }
    }
    if (exec.status === 'completed') {
      return { label: 'Partial', color: 'bg-amber-50 text-amber-700 border border-amber-200' }
    }
    return { label: exec.status, color: 'bg-slate-100 text-slate-700' }
  })()

  const engagementRating = typeof cq.engagement_rating === 'number' ? cq.engagement_rating : null

  const formatInsightLabel = (label: string) =>
    label
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase())

  const isDeprecatedMoodMetric = (key: string) => key.toLowerCase().includes('mood')

  const isInsightValuePresent = (value: any, key = ''): boolean => {
    if (key && isDeprecatedMoodMetric(key)) return false
    if (value === null || value === undefined) return false
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const trimmed = value.trim()
      return trimmed.length > 0 && trimmed.toLowerCase() !== 'no'
    }
    if (Array.isArray(value)) return value.some((item) => isInsightValuePresent(item, key))
    if (typeof value === 'object') {
      return Object.entries(value).some(([nestedKey, nestedValue]) => isInsightValuePresent(nestedValue, nestedKey))
    }
    return true
  }

  const formatInsightPrimitive = (key: string, value: string | number | boolean) => {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'number') {
      const keyLower = key.toLowerCase()
      const shouldShowPercent = value >= 0 && value <= 1 && /score|rating|ratio|rate|level/.test(keyLower)
      return shouldShowPercent ? `${Math.round(value * 100)}%` : String(value)
    }
    return value
  }

  const isPercentLikeMetric = (key: string, value: number, path: string) => {
    const keyLower = key.toLowerCase()
    if (value < 0 || value > 1) return false
    if (path.startsWith('mental_health.')) return true
    return /score|rating|ratio|rate|level/.test(keyLower)
  }

  const renderMetricValue = (key: string, value: number, path: string) => {
    if (!isPercentLikeMetric(key, value, path)) return <span>{formatInsightPrimitive(key, value)}</span>
    const percent = Math.round(value * 100)
    return (
      <div className="group/metric space-y-1.5" title={`${percent}%`}>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="text-xs font-medium text-slate-600 opacity-0 transition-opacity group-hover/metric:opacity-100">
          {percent}%
        </div>
      </div>
    )
  }

  const renderInsightValue = (key: string, value: any, path: string): any => {
    if (!isInsightValuePresent(value, key)) return null

    if (typeof value === 'number') {
      return renderMetricValue(key, value, path)
    }

    if (typeof value === 'string' || typeof value === 'boolean') {
      return <span>{formatInsightPrimitive(key, value)}</span>
    }

    if (Array.isArray(value)) {
      const filteredItems = value.filter((item) => isInsightValuePresent(item, key))
      if (filteredItems.length === 0) return null

      const allPrimitive = filteredItems.every(
        (item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean',
      )

      if (allPrimitive) {
        return (
          <div className="flex flex-wrap gap-1.5">
            {filteredItems.map((item, index) => (
              <span key={`${path}-item-${index}`} className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                {formatInsightPrimitive(key, item)}
              </span>
            ))}
          </div>
        )
      }

      return (
        <div className="space-y-2">
          {filteredItems.map((item, index) => (
            <div key={`${path}-item-${index}`} className="rounded-md border border-slate-200 bg-white p-2">
              {renderInsightValue(`${key}_${index}`, item, `${path}.${index}`)}
            </div>
          ))}
        </div>
      )
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value).filter(([nestedKey, nestedValue]) => isInsightValuePresent(nestedValue, nestedKey))
      if (entries.length === 0) return null

      return (
        <div className="space-y-2">
          {entries.map(([nestedKey, nestedValue]) => (
            <div key={`${path}.${nestedKey}`} className="rounded-md border border-slate-200 bg-white p-2">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                {formatInsightLabel(nestedKey)}
              </div>
              <div className="text-sm text-slate-800">
                {renderInsightValue(nestedKey, nestedValue, `${path}.${nestedKey}`)}
              </div>
            </div>
          ))}
        </div>
      )
    }

    return null
  }

  const insightSections = [
    { key: 'conversation_quality', title: 'Conversation Quality', data: cq },
    { key: 'loneliness_indicators', title: 'Loneliness Indicators', data: li },
    { key: 'physical_health', title: 'Physical Health', data: ph },
    { key: 'mental_health', title: 'Mental Health', data: mh },
    { key: 'social_environment', title: 'Social Environment', data: se },
  ].filter((section) => isInsightValuePresent(section.data, section.key))

  const insightTheme: Record<string, { shell: string; title: string; dot: string }> = {
    conversation_quality: { shell: 'border-blue-200 bg-blue-50/70', title: 'text-blue-900', dot: 'bg-blue-500' },
    loneliness_indicators: { shell: 'border-rose-200 bg-rose-50/70', title: 'text-rose-900', dot: 'bg-rose-500' },
    physical_health: { shell: 'border-emerald-200 bg-emerald-50/70', title: 'text-emerald-900', dot: 'bg-emerald-500' },
    mental_health: { shell: 'border-amber-200 bg-amber-50/70', title: 'text-amber-900', dot: 'bg-amber-500' },
    social_environment: { shell: 'border-cyan-200 bg-cyan-50/70', title: 'text-cyan-900', dot: 'bg-cyan-500' },
  }

  const checklistTopics = cl?.topics && typeof cl.topics === 'object'
    ? Object.entries(cl.topics as Record<string, boolean | null>).filter(([topic]) => !isDeprecatedMoodMetric(topic))
    : []

  const checklistMetaEntries = Object.entries(cl || {}).filter(([key, value]) => {
    if (key === 'topics' || isDeprecatedMoodMetric(key)) return false
    if (typeof value === 'boolean' || value === null) return true
    return isInsightValuePresent(value, key)
  })

  const hasChecklistData = checklistTopics.length > 0 || checklistMetaEntries.length > 0

  const renderChecklistStatus = (value: boolean | null) => {
    if (value === true) {
      return <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Confirmed</span>
    }
    if (value === false) {
      return <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">Not confirmed</span>
    }
    return <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">No data</span>
  }

  const getCallTypeInfo = (callType?: string | null) => {
    switch (callType) {
      case 'scheduled': return { label: 'Scheduled', badge: 'bg-indigo-50 text-indigo-700 border border-indigo-200', dot: 'bg-indigo-500' }
      case 'retry': return { label: 'Retry', badge: 'bg-orange-50 text-orange-700 border border-orange-200', dot: 'bg-orange-500' }
      case 'emergency_contact': return { label: 'Emergency contact', badge: 'bg-rose-50 text-rose-700 border border-rose-200', dot: 'bg-rose-500' }
      case 'escalation_followup': return { label: 'Escalation follow-up', badge: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500' }
      default: return { label: callType || 'Call', badge: 'bg-slate-50 text-slate-700 border border-slate-200', dot: 'bg-slate-400' }
    }
  }

  const callTypeInfo = exec?.call_type ? getCallTypeInfo(exec.call_type) : null

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (report.escalation_triggered) void loadEscalationFlow()
  }, [report.id])

  useEffect(() => {
    setRecordingUrl(null)
    setRecordingError(null)
    setRecordingLoading(false)
  }, [report.id])

  useEffect(() => {
    if (!recordingUrl) return
    const audio = audioRef.current
    if (!audio) return
    const play = async () => { try { await audio.play() } catch { /* blocked */ } }
    play()
  }, [recordingUrl])

  // Fetch requests for this report
  useEffect(() => {
    if (!report.id) { setRequests([]); return }
    const fetchRequests = async () => {
      setRequestsLoading(true)
      try {
        const { data, error } = await supabase
          .from('call_requests')
          .select('*')
          .eq('call_id', report.id)
          .order('created_at', { ascending: true })
        if (error) throw error
        setRequests(data || [])
      } catch (err) {
        console.error('Failed to fetch call requests', err)
      } finally {
        setRequestsLoading(false)
      }
    }
    fetchRequests()
  }, [report.id])

  useEffect(() => {
    if (report.elder_id) void fetchElderName()
  }, [report.elder_id])

  // ---------------------------------------------------------------------------
  // Data fetchers
  // ---------------------------------------------------------------------------
  const fetchElderName = async () => {
    if (!report.elder_id) return
    const { data } = await supabase
      .from('elders')
      .select('first_name, last_name')
      .eq('id', report.elder_id)
      .single()
    if (data) setElderName(data.first_name)
  }

  const handleResolveRequest = async (requestId: string) => {
    try {
      setResolvingId(requestId)
      const { error } = await supabase
        .from('call_requests')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', requestId)
      if (error) throw error
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, resolved: true, resolved_at: new Date().toISOString() } : r)),
      )
    } catch {
      alert('Failed to update request status')
    } finally {
      setResolvingId(null)
    }
  }

  const handleLoadRecording = async () => {
    if (recordingLoading) return
    if (recordingUrl) {
      const audio = audioRef.current
      if (audio?.paused) { try { await audio.play() } catch { /* blocked */ } }
      return
    }
    const hasStoragePath = !!report.recording_storage_path
    const hasLegacyUrl = !!report.recording_url
    if (!hasStoragePath && !hasLegacyUrl) { setRecordingError('No recording available for this call.'); return }

    try {
      setRecordingLoading(true)
      setRecordingError(null)
      let url: string | null = null

      if (hasStoragePath) {
        let storagePath = report.recording_storage_path!
        if (storagePath.startsWith('recordings/')) storagePath = storagePath.substring('recordings/'.length)
        const { data, error } = await supabase.storage.from('recordings').createSignedUrl(storagePath, RECORDING_URL_TTL_SECONDS)
        if (error) throw error
        url = data?.signedUrl ?? null
      } else {
        url = report.recording_url ?? null
      }
      if (!url) throw new Error('Missing recording URL')
      setRecordingUrl(url)
    } catch (error) {
      console.error('Failed to load recording', error)
      setRecordingError('Unable to load recording right now. Please try again.')
    } finally {
      setRecordingLoading(false)
    }
  }

  const loadEscalationFlow = async () => {
    const { data: incidents } = await supabase
      .from('escalation_incidents')
      .select('*')
      .or(`original_post_call_report_id.eq.${report.id},original_call_execution_id.eq.${report.execution_id ?? ''}`)
      .order('created_at', { ascending: true })
      .limit(1)

    const incident = incidents?.[0]
    if (!incident) { setFlow({}); return }

    const [{ data: attempts }, { data: followups }] = await Promise.all([
      supabase
        .from('escalation_contact_attempts')
        .select('*, emergency_contacts(name), call_executions(id)')
        .eq('escalation_incident_id', incident.id)
        .order('attempt_order', { ascending: true }),
      supabase
        .from('escalation_followups')
        .select('*')
        .eq('escalation_incident_id', incident.id)
        .order('scheduled_for', { ascending: true }),
    ])

    setFlow({ incident, attempts: attempts || [], followups: followups || [] })
  }

  const openReportByExecutionId = async (executionId?: string | null) => {
    if (!executionId) return
    const { data } = await supabase
      .from('post_call_reports')
      .select('*, call_executions(id, attempted_at, completed_at, duration, status, picked_up, call_type, onboarding_call, scheduled_for)')
      .eq('execution_id', executionId)
      .order('created_at', { ascending: false })
      .limit(1)
    if (data && data[0]) {
      const formatted = {
        ...data[0],
        call_executions: Array.isArray(data[0].call_executions) ? data[0].call_executions[0] || null : data[0].call_executions || null,
      }
      onOpenReport?.(formatted)
    }
  }

  const openReportByReportId = async (reportId?: string | null) => {
    if (!reportId) return
    const { data } = await supabase
      .from('post_call_reports')
      .select('*, call_executions(id, attempted_at, completed_at, duration, status, picked_up, call_type, onboarding_call, scheduled_for)')
      .eq('id', reportId)
      .single()
    if (data) {
      const formatted = {
        ...data,
        call_executions: Array.isArray(data.call_executions) ? data.call_executions[0] || null : data.call_executions || null,
      }
      onOpenReport?.(formatted)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-900">Call Report</h2>
              {callTypeInfo && (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${callTypeInfo.badge}`}>
                  <span className={`w-2 h-2 rounded-full mr-1.5 ${callTypeInfo.dot}`} />
                  {callTypeInfo.label}
                </span>
              )}
              {report.escalation_triggered && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border border-red-300 text-red-700 bg-red-50">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" /> ESCALATED
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {exec?.attempted_at ? formatDateTime(exec.attempted_at) : 'Unknown date'}
              {' \u2022 '}
              {connectionOutcome.label}
              {' \u2022 Duration '}
              {exec?.duration ? formatDuration(exec.duration) : 'N/A'}
            </p>
          </div>
          <button onClick={onClose} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">Close</button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
          {/* ============================================================= */}
          {/* 1. Connection Outcome (top summary)                           */}
          {/* ============================================================= */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`rounded-xl p-4 text-center ${connectionOutcome.color}`}>
              <div className="text-xs font-medium opacity-70 mb-1">Outcome</div>
              <div className="text-lg font-bold">{connectionOutcome.label}</div>
            </div>
            <div className="rounded-xl p-4 text-center bg-slate-50 border border-slate-100">
              <div className="text-xs font-medium text-slate-500 mb-1">Duration</div>
              <div className="text-lg font-bold text-slate-900">{exec?.duration ? formatDuration(exec.duration) : 'N/A'}</div>
            </div>
            <div className="rounded-xl p-4 text-center bg-slate-50 border border-slate-100">
              <div className="text-xs font-medium text-slate-500 mb-1">Engagement</div>
              <div className="text-lg font-bold text-slate-900">
                {engagementRating !== null ? `${Math.round(engagementRating * 100)}%` : 'N/A'}
              </div>
            </div>
          </section>

          {/* AI Summary */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">AI Summary</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{report.summary || 'No summary available'}</p>
          </section>

          {/* ============================================================= */}
          {/* Requests & Needs (kept from old design)                       */}
          {/* ============================================================= */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Requests & Needs</h3>
            {requestsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading requests...
              </div>
            ) : requests.length > 0 ? (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div key={req.id} className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">📝</span>
                          <span className="text-sm font-medium text-gray-900">{req.description}</span>
                          {req.urgency && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              req.urgency.toLowerCase().includes('high') ? 'bg-red-100 text-red-700'
                              : req.urgency.toLowerCase().includes('medium') ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                            }`}>{req.urgency}</span>
                          )}
                        </div>
                        {req.quote && (
                          <div className="text-sm text-gray-600 italic pl-7">&ldquo;{req.quote}&rdquo;</div>
                        )}
                      </div>
                      {req.resolved ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                          <CheckCircle className="w-3 h-3" /> Resolved
                        </span>
                      ) : (
                        <button
                          onClick={() => handleResolveRequest(req.id)}
                          disabled={resolvingId === req.id}
                          className="flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
                        >
                          {resolvingId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Mark as Resolved
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No requests mentioned during this call.</p>
            )}
          </section>

          {/* ============================================================= */}
          {/* 5. Risks & Next Actions                                       */}
          {/* ============================================================= */}
          {(report.escalation_triggered || cb.requested_callback) && (
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Risks & Next Actions
              </h3>

              {/* Escalation flow */}
              {report.escalation_triggered && (
                <div className="space-y-3 mb-3">
                  {!flow.incident ? (
                    <p className="text-sm text-gray-600">No escalation details found.</p>
                  ) : (
                    <>
                      <div className="flex items-center text-sm text-gray-800">
                        <Phone className="w-4 h-4 mr-2 text-indigo-600" />
                        Call escalated at {formatDateTime(flow.incident.created_at)} &bull; Reason: {flow.incident.escalation_reason}
                      </div>
                      {flow.attempts && flow.attempts.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-gray-600 mb-2">Contact Attempts</div>
                          <div className="space-y-2">
                            {flow.attempts.map((a: any, idx: number) => (
                              <button key={idx} className="w-full text-left flex items-center justify-between text-sm hover:bg-gray-50 p-1 rounded" onClick={() => openReportByExecutionId(a.call_execution_id)}>
                                <div className="flex items-center">
                                  <User className="w-4 h-4 text-gray-400 mr-2" />
                                  <span className="text-gray-800">{a.emergency_contacts?.name || 'Unknown contact'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Attempt {a.attempt_order}</span>
                                  {a.status === 'answered' ? (
                                    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                      <CheckCircle className="w-3 h-3 mr-1" /> Answered
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                      <XCircle className="w-3 h-3 mr-1" /> No answer
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {flow.followups && flow.followups.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-gray-600 mb-2">Follow-ups</div>
                          <div className="space-y-2">
                            {flow.followups.map((f: any, idx: number) => (
                              <button key={idx} className="w-full text-left flex items-center justify-between text-sm hover:bg-gray-50 p-1 rounded" onClick={() => openReportByReportId(f.post_call_report_id)}>
                                <div className="flex items-center">
                                  <ArrowRight className="w-4 h-4 text-amber-600 mr-2" />
                                  <span className="text-gray-800">{f.followup_type}</span>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${f.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {f.status}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Callback analysis */}
              {cb.requested_callback && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <div className="text-sm text-blue-800">
                    Callback requested
                    {cb.callback_time && <span className="font-medium"> at {cb.callback_time}</span>}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ============================================================= */}
          {/* Recording                                                     */}
          {/* ============================================================= */}
          {(report.recording_storage_path || report.recording_url) && (
            <section className="border border-gray-200 rounded-2xl p-4 bg-white">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Recording</h3>
              <div className="space-y-3">
                {recordingUrl ? (
                  <div className="rounded-xl border border-gray-200 overflow-hidden bg-white p-2">
                    <audio ref={audioRef} controls src={recordingUrl} className="block w-full h-16 min-h-[4rem]">
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleLoadRecording}
                    disabled={recordingLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-500 disabled:cursor-not-allowed shadow-sm"
                  >
                    {recordingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4" /> Play recording</>}
                  </button>
                )}
                {recordingError && <p className="text-sm text-red-600">{recordingError}</p>}
              </div>
            </section>
          )}

          {/* ============================================================= */}
          {/* Transcript                                                    */}
          {/* ============================================================= */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Transcript</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(() => {
                if (!report.transcript) return <div className="text-sm text-gray-600">No transcript recorded</div>

                try {
                  const transcriptData = typeof report.transcript === 'string'
                    ? JSON.parse(report.transcript)
                    : report.transcript

                  // Handle the { items: [...] } shape from the new schema
                  const items = Array.isArray(transcriptData) ? transcriptData : transcriptData?.items

                  if (Array.isArray(items) && items.length > 0) {
                    return items.map((item: any, idx: number) => {
                      const isAI = item.speaker === 'AI' || item.speaker === 'ai'
                      const isUser = item.speaker === 'User' || item.speaker === 'user'
                      const text = (item?.text && typeof item.text === 'string') ? item.text : String(item?.text || item || '')

                      return (
                        <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-lg px-4 py-2 text-sm ${isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                            <div className="text-xs font-medium mb-1 opacity-70">
                              {isAI ? 'EVA' : elderName}
                            </div>
                            <div className="whitespace-pre-wrap">{text}</div>
                          </div>
                        </div>
                      )
                    })
                  }
                } catch {
                  // fallback
                }

                return <div className="text-sm text-gray-600">No transcript recorded</div>
              })()}
            </div>
          </section>

          {/* ============================================================= */}
          {/* Detailed Insights (bottom)                                    */}
          {/* ============================================================= */}
          {(insightSections.length > 0 || hasChecklistData) && (
            <section className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm">
              <button
                type="button"
                className="w-full flex items-center justify-between gap-3 text-left"
                onClick={() => setShowDetailedInsights((value) => !value)}
              >
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Detailed Analysis</h3>
                  <p className="text-xs text-slate-600">Expanded model signals from this call.</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-700 transition-transform ${showDetailedInsights ? 'rotate-180' : ''}`} />
              </button>

              {showDetailedInsights && (
                <div className="mt-4 space-y-4">
                  {insightSections.map((section) => {
                    const entries = Object.entries(section.data || {}).filter(([key, value]) => isInsightValuePresent(value, key))
                    if (entries.length === 0) return null
                    const theme = insightTheme[section.key] || { shell: 'border-slate-200 bg-slate-50', title: 'text-slate-900', dot: 'bg-slate-500' }

                    return (
                      <div key={section.key} className={`rounded-xl border p-3 ${theme.shell}`}>
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className={`text-sm font-semibold ${theme.title}`}>{section.title}</h4>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200">
                            <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
                            {entries.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {entries.map(([key, value]) => (
                            <div key={`${section.key}.${key}`} className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                                {formatInsightLabel(key)}
                              </div>
                              <div className="text-sm text-slate-800">
                                {renderInsightValue(key, value, `${section.key}.${key}`)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}

                  {hasChecklistData && (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3">
                      <h4 className="text-sm font-semibold text-indigo-900 mb-2">Checklist Completion</h4>

                      {checklistTopics.length > 0 && (
                        <div className="space-y-2">
                          {checklistTopics.map(([topic, status]) => (
                            <div key={topic} className="flex items-center justify-between rounded-lg border border-indigo-100 bg-white px-3 py-2">
                              <span className="text-sm text-slate-800">{topic}</span>
                              {renderChecklistStatus(status)}
                            </div>
                          ))}
                        </div>
                      )}

                      {checklistMetaEntries.length > 0 && (
                        <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${checklistTopics.length > 0 ? 'mt-3' : ''}`}>
                          {checklistMetaEntries.map(([key, value]) => (
                            <div key={`checklist.${key}`} className="rounded-lg border border-indigo-100 bg-white p-2.5 shadow-sm">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                                {formatInsightLabel(key)}
                              </div>
                              <div className="text-sm text-slate-800">
                                {typeof value === 'boolean' || value === null
                                  ? renderChecklistStatus(value as boolean | null)
                                  : renderInsightValue(key, value, `checklist.${key}`)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
