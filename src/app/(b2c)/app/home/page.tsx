'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { CallReportModal } from '@/components/calls/CallReportModal'
import { formatDateTime, formatDuration } from '@/lib/utils'
import { Clock, ChevronRight, AlertTriangle } from 'lucide-react'

interface Profile {
  id: string
  first_name: string
  last_name: string
}

interface Elder {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  medications: string | null
  medical_conditions: string | null
}

interface CallReport {
  id: string
  summary: string | null
  call_started_at: string
  call_ended_at: string | null
  duration_seconds: number | null
  mood_assessment: string | null
  sentiment_score: number | null
  call_status: string
  escalation_triggered: boolean | null
  escalation_data: any
  tone_analysis: string | null
  transcript: string | null
  recording_url: string | null
  recording_storage_path: string | null
  execution_id?: string
  health_indicators?: any
  agenda_completion?: any
  elder_id?: string
}

export default function B2CHomePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [elder, setElder] = useState<Elder | null>(null)
  const [callReports, setCallReports] = useState<CallReport[]>([])
  const [selectedReport, setSelectedReport] = useState<CallReport | null>(null)

  useEffect(() => {
    if (!user) {
      router.replace('/login')
    }
  }, [user, router])

  useEffect(() => {
    if (!user) {
      return
    }

    let active = true
    setLoading(true)

    const load = async () => {
      try {
        const { data: userRecord } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('auth_user_id', user.id)
          .single()

        if (!active || !userRecord) {
          setProfile(null)
          setElder(null)
          setCallReports([])
          return
        }

        setProfile(userRecord)

        const { data: elderRecord } = await supabase
          .from('elders')
          .select('id, first_name, last_name, phone, medications, medical_conditions')
          .eq('user_id', userRecord.id)
          .single()

        if (elderRecord) {
          setElder(elderRecord)

          // Fetch recent call reports (last 30 days)
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          const { data: reports } = await supabase
            .from('post_call_reports')
            .select('id, summary, call_started_at, call_ended_at, duration_seconds, mood_assessment, sentiment_score, call_status, escalation_triggered, escalation_data, tone_analysis, transcript, recording_url, recording_storage_path, execution_id, health_indicators, agenda_completion, elder_id')
            .eq('elder_id', elderRecord.id)
            .gte('call_started_at', thirtyDaysAgo)
            .order('call_started_at', { ascending: false })
            .limit(20)

          setCallReports(reports || [])
        } else {
          setElder(null)
          setCallReports([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [user])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-36 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="h-full animate-pulse rounded-md bg-slate-100" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {profile ? `Hi ${profile.first_name}!` : 'Welcome to Eva Cares'}
            </h1>
            {elder && (
              <p className="mt-1 text-sm text-slate-600">
                Monitoring: <span className="font-medium text-slate-900">{elder.first_name} {elder.last_name}</span>
                {' • '}
                <Link href="/app/elder" className="text-slate-900 underline hover:text-slate-700">
                  View profile
                </Link>
              </p>
            )}
            {!elder && (
              <p className="mt-1 text-sm text-slate-600">
                <Link href="/app/elder" className="text-slate-900 underline hover:text-slate-700">
                  Add profile details
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Call History</h2>
          {callReports.length > 0 ? (
            <div className="mt-4 space-y-3">
              {callReports.map((report) => {
                const moodValue = typeof report.sentiment_score === 'number' 
                  ? report.sentiment_score 
                  : parseFloat(String(report.mood_assessment ?? ''))
                const moodDisplay = Number.isFinite(moodValue) 
                  ? `${Math.round(moodValue * 100)}%`
                  : report.mood_assessment || 'N/A'

                return (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className="w-full text-left border border-slate-200 rounded-lg p-4 hover:bg-slate-50 hover:border-slate-300 transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-slate-600">
                            {formatDateTime(report.call_started_at)}
                          </span>
                          {report.duration_seconds && (
                            <span className="text-xs text-slate-500">
                              • {formatDuration(report.duration_seconds)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {report.escalation_triggered && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Escalated
                            </span>
                          )}
                          <span className="text-xs text-slate-600">
                            Mood: <span className="font-medium text-slate-900">{moodDisplay}</span>
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 line-clamp-2">
                          {report.summary || 'No summary available'}
                        </p>
                      </div>
                      <div className="flex items-center text-xs text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity ml-4 flex-shrink-0">
                        View details <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">
              <Clock className="h-5 w-5 text-slate-400 flex-shrink-0" />
              <p>No calls have been completed yet. We&apos;ll show updates here once the first call finishes.</p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Need help?</h2>
          <p className="mt-2 text-sm text-slate-600">
            Reach us at <a href="mailto:support@evacares.com" className="text-slate-900 underline">support@evacares.com</a>{' '}
            or call +1 (555) 123-4567 for urgent assistance.
          </p>
        </section>
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


