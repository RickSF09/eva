'use client'

import { formatDateTime, formatDuration } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Phone, AlertTriangle, ArrowRight, CheckCircle, XCircle, User, ChevronDown, Play, Loader2 } from 'lucide-react'
import { Tables } from '@/types/database'

const RECORDING_URL_TTL_SECONDS = 60 * 60 * 2 // 2 hours

type CallRequest = Tables<'call_requests'>

interface CallReportModalProps {
  report: {
    id: string
    call_started_at: string
    call_ended_at: string | null
    duration_seconds: number | null
    call_status: string
    summary: string | null
    transcript: string | null
    mood_assessment: string | null
    tone_analysis: string | null
    escalation_triggered: boolean | null
    escalation_data: any
    sentiment_score: number | null
    agenda_completion?: any
    recording_url?: string | null
    recording_storage_path?: string | null
    execution_id?: string
    health_indicators?: any
    elder_id?: string
    call_executions?: {
      call_type?: string | null
      onboarding_call?: boolean | null
    } | null
  }
  onClose: () => void
  onOpenReport?: (report: any) => void
}

export function CallReportModal({ report, onClose, onOpenReport }: CallReportModalProps) {
  const [flow, setFlow] = useState<{
    incident?: any
    attempts?: any[]
    followups?: any[]
  }>({})
  const [healthOpen, setHealthOpen] = useState(false)
  const [elderName, setElderName] = useState<string>('User')
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [recordingLoading, setRecordingLoading] = useState(false)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [requests, setRequests] = useState<CallRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const healthIndicators =
    report.health_indicators && typeof report.health_indicators === 'object'
      ? report.health_indicators
      : undefined

  const hasIndicatorSection = (section?: Record<string, unknown> | null) => {
    if (!section || typeof section !== 'object') return false
    return Object.values(section).some(value => value !== null && value !== undefined)
  }

  // Normalize mood value in 0..1 for consistent display
  const moodValue = (() => {
    // Try sentiment_score first, then mood_assessment
    if (typeof report.sentiment_score === 'number') return Math.max(0, Math.min(1, report.sentiment_score))
    const moodParsed = parseFloat(String(report.mood_assessment ?? ''))
    return Number.isFinite(moodParsed) ? Math.max(0, Math.min(1, moodParsed)) : null
  })()

  const moodColor = (() => {
    const v = moodValue ?? 0.5
    if (v < 0.33) return { bar: 'bg-red-500', chip: 'bg-red-100 text-red-700' }
    if (v < 0.66) return { bar: 'bg-yellow-500', chip: 'bg-yellow-100 text-yellow-700' }
    return { bar: 'bg-green-500', chip: 'bg-green-100 text-green-700' }
  })()

  // Tone value from tone_analysis if numeric, else fallback neutral 0.5
  const toneValue = (() => {
    const toneParsed = parseFloat(String(report.tone_analysis ?? ''))
    return Number.isFinite(toneParsed) ? Math.max(0, Math.min(1, toneParsed)) : null
  })()

  const toneColor = (() => {
    const v = toneValue ?? 0.5
    if (v < 0.33) return { bar: 'bg-red-500', chip: 'bg-red-100 text-red-700' }
    if (v < 0.66) return { bar: 'bg-yellow-500', chip: 'bg-yellow-100 text-yellow-700' }
    return { bar: 'bg-green-500', chip: 'bg-green-100 text-green-700' }
  })()

  const getCallTypeInfo = (callType?: string | null) => {
    switch (callType) {
      case 'scheduled':
        return { label: 'Scheduled', badge: 'bg-indigo-50 text-indigo-700 border border-indigo-200', dot: 'bg-indigo-500' }
      case 'retry':
        return { label: 'Retry', badge: 'bg-orange-50 text-orange-700 border border-orange-200', dot: 'bg-orange-500' }
      case 'emergency_contact':
        return { label: 'Emergency contact', badge: 'bg-rose-50 text-rose-700 border border-rose-200', dot: 'bg-rose-500' }
      case 'escalation_followup':
        return { label: 'Escalation follow-up', badge: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500' }
      case 'check_in':
        return { label: 'Check-in', badge: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-500' }
      case 'emergency':
        return { label: 'Emergency', badge: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-500' }
      case 'wellness':
        return { label: 'Wellness', badge: 'bg-green-50 text-green-700 border border-green-200', dot: 'bg-green-500' }
      case 'medication_reminder':
        return { label: 'Medication', badge: 'bg-purple-50 text-purple-700 border border-purple-200', dot: 'bg-purple-500' }
      case 'social':
        return { label: 'Social', badge: 'bg-pink-50 text-pink-700 border border-pink-200', dot: 'bg-pink-500' }
      case 'regular':
        return { label: 'Regular', badge: 'bg-slate-50 text-slate-700 border border-slate-200', dot: 'bg-slate-500' }
      default:
        return { label: callType || 'Unknown', badge: 'bg-slate-50 text-slate-700 border border-slate-200', dot: 'bg-slate-400' }
    }
  }

  const callTypeInfo = report.call_executions?.call_type ? getCallTypeInfo(report.call_executions.call_type) : null

  useEffect(() => {
    if (report.escalation_triggered) {
      void loadEscalationFlow()
    }
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

    const play = async () => {
      try {
        await audio.play()
      } catch {
        // Autoplay might be blocked; user can press play manually.
      }
    }

    play()
  }, [recordingUrl])

  // Fetch Requests
  useEffect(() => {
    if (!report.id) {
      setRequests([])
      return
    }

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

  const handleResolveRequest = async (requestId: string) => {
    try {
      setResolvingId(requestId)
      const { error } = await supabase
        .from('call_requests')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (error) throw error

      // Update local state
      setRequests(prev => prev.map(r =>
        r.id === requestId
          ? { ...r, resolved: true, resolved_at: new Date().toISOString() }
          : r
      ))
    } catch (err) {
      console.error('Failed to resolve request', err)
      alert('Failed to update request status')
    } finally {
      setResolvingId(null)
    }
  }

  const handleLoadRecording = async () => {
    if (recordingLoading) return

    if (recordingUrl) {
      const audio = audioRef.current
      if (audio?.paused) {
        try {
          await audio.play()
        } catch {
          // Autoplay might be blocked.
        }
      }
      return
    }

    const hasStoragePath = !!report.recording_storage_path
    const hasLegacyUrl = !!report.recording_url

    if (!hasStoragePath && !hasLegacyUrl) {
      setRecordingError('No recording available for this call.')
      return
    }

    try {
      setRecordingLoading(true)
      setRecordingError(null)

      let url: string | null = null

      if (hasStoragePath) {
        // Remove 'recordings/' prefix if present, since .from('recordings') already specifies the bucket
        let storagePath = report.recording_storage_path!

        if (storagePath.startsWith('recordings/')) {
          storagePath = storagePath.substring('recordings/'.length)
        }

        const { data, error } = await supabase.storage
          .from('recordings')
          .createSignedUrl(storagePath, RECORDING_URL_TTL_SECONDS)

        if (error) throw error

        url = data?.signedUrl ?? null
      } else {
        url = report.recording_url ?? null
      }

      if (!url) {
        throw new Error('Missing recording URL')
      }

      setRecordingUrl(url)
    } catch (error) {
      console.error('Failed to load recording', error)
      setRecordingError('Unable to load recording right now. Please try again.')
    } finally {
      setRecordingLoading(false)
    }
  }

  useEffect(() => {
    if (report.elder_id) {
      void fetchElderName()
    }
  }, [report.elder_id])

  const fetchElderName = async () => {
    if (!report.elder_id) return
    const { data } = await supabase
      .from('elders')
      .select('first_name, last_name')
      .eq('id', report.elder_id)
      .single()
    
    if (data) {
      setElderName(`${data.first_name} ${data.last_name}`)
    }
  }

  const loadEscalationFlow = async () => {
    // Find escalation incident linked to this report or execution
    const { data: incidents } = await supabase
      .from('escalation_incidents')
      .select('*')
      .or(`original_post_call_report_id.eq.${report.id},original_call_execution_id.eq.${report.execution_id ?? ''}`)
      .order('created_at', { ascending: true })
      .limit(1)

    const incident = incidents?.[0]
    if (!incident) {
      setFlow({})
      return
    }

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
      .select('*')
      .eq('execution_id', executionId)
      .order('created_at', { ascending: false })
      .limit(1)
    if (data && data[0]) {
      onOpenReport?.(data[0])
    }
  }

  const openReportByReportId = async (reportId?: string | null) => {
    if (!reportId) return
    const { data } = await supabase
      .from('post_call_reports')
      .select('*')
      .eq('id', reportId)
      .single()
    if (data) {
      onOpenReport?.(data)
    }
  }
  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
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
            <p className="text-sm text-gray-600">{formatDateTime(report.call_started_at)} • {report.call_status} • Duration {report.duration_seconds ? formatDuration(report.duration_seconds) : 'N/A'}</p>
          </div>
          <button onClick={onClose} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">Close</button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">AI Summary</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{report.summary || 'No summary available'}</p>
          </section>

          {/* Requests & Needs Section */}
          <section>
             <h3 className="text-sm font-semibold text-gray-900 mb-2">Requests & Needs</h3>
             {requestsLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading requests...
                </div>
             ) : requests.length > 0 ? (
                <div className="space-y-3">
                  {requests.map((req) => (
                    <div key={req.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start gap-3">
                         <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                               {req.description.toLowerCase().includes('milk') || req.description.toLowerCase().includes('food') || req.description.toLowerCase().includes('grocer') ? (
                                  <span className="text-xl">🏠</span>
                               ) : req.description.toLowerCase().includes('grandkid') || req.description.toLowerCase().includes('family') || req.description.toLowerCase().includes('visit') ? (
                                  <span className="text-xl">👨‍👩‍👧</span>
                               ) : (
                                  <span className="text-xl">📝</span>
                               )}
                               <span className="text-sm font-medium text-gray-900">{req.description}</span>
                               {req.urgency && (
                                 <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    req.urgency.toLowerCase().includes('high') ? 'bg-red-100 text-red-700' :
                                    req.urgency.toLowerCase().includes('medium') ? 'bg-amber-100 text-amber-700' :
                                    'bg-slate-100 text-slate-700'
                                 }`}>
                                    {req.urgency}
                                 </span>
                               )}
                            </div>
                            {req.quote && (
                               <div className="text-sm text-gray-600 italic pl-7">"{req.quote}"</div>
                            )}
                         </div>
                         {req.resolved ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                               <CheckCircle className="w-3 h-3" />
                               Resolved
                            </span>
                         ) : (
                            <button
                               onClick={() => handleResolveRequest(req.id)}
                               disabled={resolvingId === req.id}
                               className="flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
                            >
                               {resolvingId === req.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                               ) : (
                                  <CheckCircle className="w-3 h-3" />
                               )}
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

          {(moodValue !== null || toneValue !== null) && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {moodValue !== null && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-xs text-gray-500 font-medium">Mood</div>
                  <div className="mt-2">
                    <div className="h-2 rounded bg-gray-200 overflow-hidden">
                      <div className={`h-full ${moodColor.bar}`} style={{ width: `${moodValue * 100}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>
                  {report.mood_assessment && typeof moodValue !== 'number' && (
                    <div className="mt-2 text-sm text-gray-900">{report.mood_assessment}</div>
                  )}
                </div>
              )}

              {toneValue !== null && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-xs text-gray-500 font-medium">Tone</div>
                  <div className="mt-2">
                    <div className="h-2 rounded bg-gray-200 overflow-hidden">
                      <div className={`h-full ${toneColor.bar}`} style={{ width: `${toneValue * 100}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>
                  {report.tone_analysis && typeof toneValue !== 'number' && (
                    <div className="mt-2 text-sm text-gray-900">{report.tone_analysis}</div>
                  )}
                </div>
              )}
            </section>
          )}

          

          {report.escalation_triggered && (
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Escalation Flow</h3>
              {!flow.incident ? (
                <p className="text-sm text-gray-600">No escalation details found.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-800">
                    <Phone className="w-4 h-4 mr-2 text-indigo-600" />
                    Call escalated at {formatDateTime(flow.incident.created_at)} • Reason: {flow.incident.escalation_reason}
                  </div>
                  {flow.attempts && flow.attempts.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="text-xs font-medium text-gray-600 mb-2">Contact Attempts</div>
                      <div className="space-y-2">
                        {flow.attempts.map((a, idx) => (
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
                        {flow.followups.map((f, idx) => (
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
                </div>
              )}
            </section>
          )}

          {report.agenda_completion && (
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Agenda Completion</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(report.agenda_completion as any).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                    <span className="text-sm text-gray-700">{key}</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{value ? 'Confirmed' : 'Not confirmed'}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(report.recording_storage_path || report.recording_url) && (
            <section className="border border-gray-200 rounded-2xl p-4 bg-white">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Recording</h3>
              <div className="space-y-3">
                {recordingUrl ? (
                  <div className="rounded-xl border border-gray-200 overflow-hidden bg-white p-2">
                    <audio
                      ref={audioRef}
                      controls
                      src={recordingUrl}
                      className="block w-full h-16 min-h-[4rem]"
                    >
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
                    {recordingLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Play recording
                      </>
                    )}
                  </button>
                )}
                {recordingError && <p className="text-sm text-red-600">{recordingError}</p>}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Transcript</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(() => {
                if (!report.transcript) {
                  return <div className="text-sm text-gray-600">No transcript recorded</div>
                }

                try {
                  // Try to parse as JSON first
                  const transcriptData = typeof report.transcript === 'string' 
                    ? JSON.parse(report.transcript) 
                    : report.transcript
                  
                  if (Array.isArray(transcriptData) && transcriptData.length > 0) {
                    return transcriptData.map((item: any, idx: number) => {
                      const isAI = item.speaker === 'AI' || item.speaker === 'ai'
                      const isUser = item.speaker === 'User' || item.speaker === 'user'
                      const text = item.text || String(item)
                      
                      return (
                        <div
                          key={idx}
                          className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-lg px-4 py-2 text-sm ${
                              isUser
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <div className="text-xs font-medium mb-1 opacity-70">
                              {isAI ? 'EVA' : elderName}
                            </div>
                            <div className="whitespace-pre-wrap">{text}</div>
                          </div>
                        </div>
                      )
                    })
                  }
                  // If not an array, fall through to plain text parsing
                } catch {
                  // Fallback to plain text parsing
                  const lines = String(report.transcript || 'No transcript recorded').split(/\n/)
                  return lines.map((line, idx) => {
                    if (!line.trim()) return null
                    const isAI = line.trim().toLowerCase().startsWith('ai:')
                    const isUser = line.trim().toLowerCase().startsWith('user:')
                    const text = isAI ? line.slice(3).trim() : isUser ? line.slice(5).trim() : line
                    
                    if (!isAI && !isUser) {
                      return (
                        <div key={idx} className="text-sm text-gray-600 whitespace-pre-wrap">
                          {text}
                        </div>
                      )
                    }
                    
                    return (
                      <div
                        key={idx}
                        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg px-4 py-2 text-sm ${
                            isUser
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <div className="text-xs font-medium mb-1 opacity-70">
                            {isAI ? 'EVA' : elderName}
                          </div>
                          <div className="whitespace-pre-wrap">{text}</div>
                        </div>
                      </div>
                    )
                  }).filter(Boolean)
                }
                
                // Final fallback if nothing matched
                return <div className="text-sm text-gray-600">No transcript recorded</div>
              })()}
            </div>
          </section>

          {healthIndicators && (
            <section>
              <button
                type="button"
                className="w-full flex items-center justify-between mb-2"
                onClick={() => setHealthOpen(v => !v)}
              >
                <h3 className="text-sm font-semibold text-gray-900">Health Indicators</h3>
                <ChevronDown className={`w-4 h-4 text-gray-700 transition-transform ${healthOpen ? 'rotate-180' : ''}`} />
              </button>
              {healthOpen && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Mental Health */}
                  {hasIndicatorSection(healthIndicators?.mental_health) && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-500 font-medium mb-2">Mental Health</div>
                      <div className="space-y-1 text-sm">
                        {Object.entries(healthIndicators?.mental_health ?? {})
                          .filter(([_, v]) => v !== null)
                          .map(([k, v]) => (
                            <div key={`mh-${k}`} className="flex items-center justify-between">
                              <span className="text-gray-700 capitalize">{k.replaceAll('_',' ')}</span>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${typeof v === 'boolean' ? (v ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700') : 'bg-blue-100 text-blue-700'}`}>
                                {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Physical Health */}
                  {hasIndicatorSection(healthIndicators?.physical_health) && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-500 font-medium mb-2">Physical Health</div>
                      <div className="space-y-1 text-sm">
                        {Object.entries(healthIndicators?.physical_health ?? {})
                          .filter(([_, v]) => v !== null)
                          .map(([k, v]) => (
                            <div key={`ph-${k}`} className="flex items-center justify-between">
                              <span className="text-gray-700 capitalize">{k.replaceAll('_',' ')}</span>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${typeof v === 'boolean' ? (v ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700') : 'bg-blue-100 text-blue-700'}`}>
                                {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Social Environment */}
                  {hasIndicatorSection(healthIndicators?.social_environment) && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-500 font-medium mb-2">Social Environment</div>
                      <div className="space-y-1 text-sm">
                        {Object.entries(healthIndicators?.social_environment ?? {})
                          .filter(([_, v]) => v !== null)
                          .map(([k, v]) => (
                            <div key={`se-${k}`} className="flex items-center justify-between">
                              <span className="text-gray-700 capitalize">{k.replaceAll('_',' ')}</span>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${typeof v === 'boolean' ? (v ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700') : 'bg-blue-100 text-blue-700'}`}>
                                {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}
                              </span>
                            </div>
                          ))}
                      </div>
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
