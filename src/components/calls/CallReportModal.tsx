'use client'

import { formatDateTime, formatDuration } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Phone, AlertTriangle, ArrowRight, CheckCircle, XCircle, User } from 'lucide-react'

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
    execution_id?: string
    health_indicators?: any
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

  useEffect(() => {
    if (report.escalation_triggered) {
      void loadEscalationFlow()
    }
  }, [report.id])

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
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">Call Report</h2>
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

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-xs text-gray-500 font-medium">Mood</div>
              <div className="mt-2">
                <div className="h-2 rounded bg-gray-200 overflow-hidden">
                  <div className={`h-full ${moodColor.bar}`} style={{ width: `${(moodValue ?? 0) * 100}%` }} />
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

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-xs text-gray-500 font-medium">Tone</div>
              <div className="mt-2">
                <div className="h-2 rounded bg-gray-200 overflow-hidden">
                  <div className={`h-full ${toneColor.bar}`} style={{ width: `${(toneValue ?? 0.5) * 100}%` }} />
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
          </section>

          {report.health_indicators && (
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Health Indicators</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Mental Health */}
                {'mental_health' in (report.health_indicators || {}) && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-xs text-gray-500 font-medium mb-2">Mental Health</div>
                    <div className="space-y-1 text-sm">
                      {Object.entries(report.health_indicators.mental_health || {})
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
                {'physical_health' in (report.health_indicators || {}) && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-xs text-gray-500 font-medium mb-2">Physical Health</div>
                    <div className="space-y-1 text-sm">
                      {Object.entries(report.health_indicators.physical_health || {})
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
                {'social_environment' in (report.health_indicators || {}) && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-xs text-gray-500 font-medium mb-2">Social Environment</div>
                    <div className="space-y-1 text-sm">
                      {Object.entries(report.health_indicators.social_environment || {})
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
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{value ? 'Done' : 'Not Done'}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {report.recording_url && (
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Recording</h3>
              <a href={report.recording_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Open call recording in new tab</a>
            </section>
          )}

          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Transcript</h3>
            <div className="bg-gray-50 rounded p-3 text-sm text-gray-800 whitespace-pre-wrap">
              {(report.transcript || 'No transcript recorded').split(/\n/).map((line, idx) => {
                const isAI = line.trim().toLowerCase().startsWith('ai:')
                const isUser = line.trim().toLowerCase().startsWith('user:')
                return (
                  <div key={idx}>
                    {isAI ? (<><span className="font-semibold">AI:</span>{line.slice(3)}</>) : isUser ? (<><span className="font-semibold">User:</span>{line.slice(5)}</>) : line}
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}


