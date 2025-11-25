'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { CallReportModal } from '@/components/calls/CallReportModal'
import { formatDateTime, formatDuration } from '@/lib/utils'
import { Clock, ChevronRight, ChevronLeft, AlertTriangle, Sparkles, ShieldAlert, Activity, ArrowUpRight, ArrowDownRight, Minus, Phone, Mail, TrendingUp, UserPlus } from 'lucide-react'
import { format, parseISO, startOfWeek } from 'date-fns'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'

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
  call_executions?: {
    onboarding_call: boolean | null
    call_type?: string | null
  } | null
}

type CallTypeFilter = 'all' | 'scheduled' | 'retry' | 'emergency_contact' | 'escalation_followup'

const CALL_TYPE_FILTERS: { value: CallTypeFilter; label: string }[] = [
  { value: 'all', label: 'All calls' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'retry', label: 'Retry' },
  { value: 'emergency_contact', label: 'Emergency contact' },
  { value: 'escalation_followup', label: 'Escalation follow-up' },
]

export default function B2CHomePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [elder, setElder] = useState<Elder | null>(null)
  const [callReports, setCallReports] = useState<CallReport[]>([])
  const [selectedReport, setSelectedReport] = useState<CallReport | null>(null)
  const [analysis, setAnalysis] = useState<any | null>(null)
  const [aggregation, setAggregation] = useState<'day' | 'week'>('day')
  const [currentPage, setCurrentPage] = useState(1)
  const [callTypeFilter, setCallTypeFilter] = useState<CallTypeFilter>('all')
  const itemsPerPage = 5

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
            .select('id, summary, call_started_at, call_ended_at, duration_seconds, mood_assessment, sentiment_score, call_status, escalation_triggered, escalation_data, tone_analysis, transcript, recording_url, recording_storage_path, execution_id, health_indicators, agenda_completion, elder_id, call_executions(onboarding_call, call_type)')
            .eq('elder_id', elderRecord.id)
            .gte('call_started_at', thirtyDaysAgo)
            .order('call_started_at', { ascending: false })
            .limit(20)

          const formattedReports = (reports || []).map(r => ({
            ...r,
            call_executions: Array.isArray(r.call_executions) 
              ? (r.call_executions[0] || null) 
              : (r.call_executions || null)
          })) as CallReport[]

          setCallReports(formattedReports)

          // Fetch latest analysis
          const { data: analysisData } = await supabase
            .from('elder_analysis_reports')
            .select('*')
            .eq('elder_id', elderRecord.id)
            .order('analysis_date', { ascending: false })
            .limit(1)

          const latest = (analysisData && analysisData[0]) || null
          
          if (latest) {
            const parseMaybeJson = (value: any) => {
              if (!value) return null
              if (typeof value === 'string') {
                try { return JSON.parse(value) } catch { return value }
              }
              return value
            }

            setAnalysis({
              ...latest,
              ai_recommendations: parseMaybeJson(latest.ai_recommendations) || [],
              ai_concerns: parseMaybeJson(latest.ai_concerns) || [],
              ai_early_warnings: parseMaybeJson(latest.ai_early_warnings) || [],
            })
          } else {
            setAnalysis(null)
          }
        } else {
          setElder(null)
          setCallReports([])
          setAnalysis(null)
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

  // Helper function to convert numeric value to text label
  const getValueLabel = (value: number): string => {
    if (value < 0.25) return 'Poor'
    if (value < 0.5) return 'Fair'
    if (value < 0.75) return 'Good'
    return 'Excellent'
  }

  const trendInfo = (dir?: string | null) => {
    switch ((dir || '').toLowerCase()) {
      case 'improving':
      case 'up':
        return { label: 'Improving', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> }
      case 'declining':
      case 'down':
        return { label: 'Declining', color: 'bg-rose-50 text-rose-700 border border-rose-200', icon: <ArrowDownRight className="w-3.5 h-3.5 mr-1" /> }
      default:
        return { label: 'Stable', color: 'bg-slate-50 text-slate-700 border border-slate-200', icon: <Minus className="w-3.5 h-3.5 mr-1" /> }
    }
  }

  const priorityBadge = (p?: string) => {
    switch ((p || '').toLowerCase()) {
      case 'high':
        return 'bg-rose-50 text-rose-700 border border-rose-200'
      case 'medium':
        return 'bg-amber-50 text-amber-700 border border-amber-200'
      case 'low':
      default:
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    }
  }

  const severityBadge = (s?: string) => {
    switch ((s || '').toLowerCase()) {
      case 'high':
        return 'bg-rose-50 text-rose-700 border border-rose-200'
      case 'medium':
        return 'bg-orange-50 text-orange-700 border border-orange-200'
      case 'low':
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200'
    }
  }

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

  // Build chart data for mood and tone
  const { moodSeries, toneSeries } = useMemo(() => {
    const moodPoints: { key: string; label: string; value: number; textLabel: string }[] = []
    const tonePoints: { key: string; label: string; value: number; textLabel: string }[] = []
    const bucketsMood: Record<string, { sum: number; count: number; label: string }> = {}
    const bucketsTone: Record<string, { sum: number; count: number; label: string }> = {}

    for (const r of callReports) {
      if (!r.call_started_at) continue
      const dt = parseISO(r.call_started_at)
      const keyDay = format(dt, 'yyyy-MM-dd')
      const keyWeek = format(startOfWeek(dt, { weekStartsOn: 1 }), 'yyyy-ww')
      const bucketKey = aggregation === 'day' ? keyDay : keyWeek
      const label = aggregation === 'day' ? format(dt, 'MMM d') : `Wk of ${format(startOfWeek(dt, { weekStartsOn: 1 }), 'MMM d')}`

      // mood: prefer numeric mood_assessment; fallback to sentiment_score
      const moodRaw = typeof r.mood_assessment === 'number' ? r.mood_assessment : parseFloat(String(r.mood_assessment ?? ''))
      const moodVal = Number.isFinite(moodRaw) ? Math.max(0, Math.min(1, moodRaw)) : (typeof r.sentiment_score === 'number' ? Math.max(0, Math.min(1, r.sentiment_score)) : null)
      if (typeof moodVal === 'number') {
        const b = (bucketsMood[bucketKey] ||= { sum: 0, count: 0, label })
        b.sum += moodVal
        b.count += 1
      }

      // tone: numeric text 0..1 in tone_analysis
      const toneRaw = parseFloat(String(r.tone_analysis ?? ''))
      const toneVal = Number.isFinite(toneRaw) ? Math.max(0, Math.min(1, toneRaw)) : null
      if (typeof toneVal === 'number') {
        const b = (bucketsTone[bucketKey] ||= { sum: 0, count: 0, label })
        b.sum += toneVal
        b.count += 1
      }
    }

    for (const [k, v] of Object.entries(bucketsMood)) {
      const avgValue = v.count ? v.sum / v.count : 0
      moodPoints.push({ key: k, label: v.label, value: avgValue, textLabel: getValueLabel(avgValue) })
    }
    for (const [k, v] of Object.entries(bucketsTone)) {
      const avgValue = v.count ? v.sum / v.count : 0
      tonePoints.push({ key: k, label: v.label, value: avgValue, textLabel: getValueLabel(avgValue) })
    }

    // sort chronologically by key
    moodPoints.sort((a, b) => (a.key < b.key ? -1 : 1))
    tonePoints.sort((a, b) => (a.key < b.key ? -1 : 1))

    return { moodSeries: moodPoints, toneSeries: tonePoints }
  }, [callReports, aggregation])

  // Call type filtering and pagination logic for call history
  const filteredReports = useMemo(() => {
    if (callTypeFilter === 'all') {
      return callReports
    }
    return callReports.filter(report => report.call_executions?.call_type === callTypeFilter)
  }, [callReports, callTypeFilter])

  const activeFilterLabel = CALL_TYPE_FILTERS.find(opt => opt.value === callTypeFilter)?.label ?? 'All calls'
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedReports = filteredReports.slice(startIndex, endIndex)
  const showingStart = filteredReports.length > 0 ? startIndex + 1 : 0
  const showingEnd = filteredReports.length > 0 ? Math.min(endIndex, filteredReports.length) : 0

  // Reset to page 1 when data set or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [callReports.length, callTypeFilter])

  // Calculate quick stats
  const quickStats = useMemo(() => {
    if (callReports.length === 0) {
      return {
        totalCalls: 0,
        lastCallDate: null,
        averageMood: null,
        escalations: 0,
      }
    }

    const completedCalls = callReports.filter(r => {
      const status = (r.call_status || '').toLowerCase()
      return ['completed', 'success', 'succeeded', 'completed_successfully'].includes(status) || !!r.call_ended_at
    })

    const moods = callReports
      .map(r => {
        const moodRaw = typeof r.mood_assessment === 'number' ? r.mood_assessment : parseFloat(String(r.mood_assessment ?? ''))
        return Number.isFinite(moodRaw) ? Math.max(0, Math.min(1, moodRaw)) : (typeof r.sentiment_score === 'number' ? Math.max(0, Math.min(1, r.sentiment_score)) : null)
      })
      .filter((v): v is number => typeof v === 'number')

    const averageMood = moods.length > 0 
      ? Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 100)
      : null

    const lastCall = callReports[0] // Already sorted by date descending
    const lastCallDate = lastCall?.call_started_at ? format(parseISO(lastCall.call_started_at), 'MMM d, yyyy') : null

    return {
      totalCalls: callReports.length,
      lastCallDate,
      averageMood,
      escalations: callReports.filter(r => r.escalation_triggered).length,
    }
  }, [callReports])

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

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Phone className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500">Total Calls</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{quickStats.totalCalls}</div>
        </div>
        
        {quickStats.lastCallDate ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">Last Call</span>
            </div>
            <div className="text-sm font-semibold text-slate-900">{quickStats.lastCallDate}</div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">Last Call</span>
            </div>
            <div className="text-sm font-semibold text-slate-500">No calls yet</div>
          </div>
        )}
        
        {quickStats.averageMood !== null ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">Avg Mood</span>
            </div>
            <div className="text-xl font-bold text-slate-900">{quickStats.averageMood}%</div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">Avg Mood</span>
            </div>
            <div className="text-sm font-semibold text-slate-500">N/A</div>
          </div>
        )}
      </div>
      
      {/* Escalations alert if any */}
      {quickStats.escalations > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-red-900">
                {quickStats.escalations} {quickStats.escalations === 1 ? 'escalation' : 'escalations'} detected
              </div>
              <div className="text-xs text-red-700 mt-0.5">Review call history for details</div>
            </div>
          </div>
        </div>
      )}

      {analysis ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Health Overview
              </h2>
              <div className="text-xs text-slate-500">
                {analysis.period_days || 7} days ending {format(parseISO(analysis.analysis_date), 'MMM d, yyyy')}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs text-slate-500 mb-1">Average Mood</div>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold text-slate-900">{Math.round((analysis.avg_mood_score || 0) * 100)}%</div>
                  {typeof analysis.mood_trend === 'number' && (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${analysis.mood_trend > 0 ? 'bg-emerald-100 text-emerald-800' : analysis.mood_trend < 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'}`}>
                      {analysis.mood_trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : analysis.mood_trend < 0 ? <ArrowDownRight className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
                      {analysis.mood_trend > 0 ? '+' : ''}{analysis.mood_trend.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs text-slate-500 mb-1">Average Pain Level</div>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold text-slate-900">{Math.round((analysis.avg_pain_level || 0) * 100)}%</div>
                  {typeof analysis.pain_trend === 'number' && (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${analysis.pain_trend > 0 ? 'bg-rose-100 text-rose-800' : analysis.pain_trend < 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                      {analysis.pain_trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : analysis.pain_trend < 0 ? <ArrowDownRight className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
                      {analysis.pain_trend > 0 ? '+' : ''}{analysis.pain_trend.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs text-slate-500 mb-1">Average Energy Level</div>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold text-slate-900">{Math.round((analysis.avg_energy_level || 0) * 100)}%</div>
                  {typeof analysis.energy_trend === 'number' && (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${analysis.energy_trend > 0 ? 'bg-emerald-100 text-emerald-800' : analysis.energy_trend < 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'}`}>
                      {analysis.energy_trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : analysis.energy_trend < 0 ? <ArrowDownRight className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
                      {analysis.energy_trend > 0 ? '+' : ''}{analysis.energy_trend.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
             <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                AI Insights
              </h2>
            </div>
            
            {analysis.ai_narrative && (
              <p className="text-sm text-slate-700 mb-6 bg-purple-50 border border-purple-100 p-4 rounded-xl">{analysis.ai_narrative}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div>
                 <h3 className="text-sm font-semibold text-slate-900 mb-3">Recommendations</h3>
                 <div className="space-y-2">
                    {(analysis.ai_recommendations || []).map((rec: any, idx: number) => (
                      <div key={idx} className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                         <div className="text-sm text-slate-800 mb-1">{rec.action || String(rec)}</div>
                         {rec.priority && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${priorityBadge(rec.priority)}`}>
                              {String(rec.priority).toUpperCase()}
                            </span>
                          )}
                      </div>
                    ))}
                    {(!analysis.ai_recommendations || analysis.ai_recommendations.length === 0) && (
                      <div className="text-xs text-slate-500 italic">No current recommendations</div>
                    )}
                 </div>
               </div>
               
                <div>
                 <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center"><ShieldAlert className="w-4 h-4 mr-1 text-amber-600" /> Concerns</h3>
                 <div className="space-y-2">
                    {(analysis.ai_concerns || []).map((c: any, idx: number) => (
                      <div key={idx} className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                         <div className="text-sm text-slate-800 mb-1">{c.issue || String(c)}</div>
                         {c.severity && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${severityBadge(c.severity)}`}>
                              {String(c.severity).toUpperCase()}
                            </span>
                          )}
                      </div>
                    ))}
                    {(!analysis.ai_concerns || analysis.ai_concerns.length === 0) && (
                      <div className="text-xs text-slate-500 italic">No concerns detected</div>
                    )}
                 </div>
               </div>

                <div>
                 <h3 className="text-sm font-semibold text-slate-900 mb-3">Early Warnings</h3>
                 <ul className="space-y-2">
                    {(analysis.ai_early_warnings || []).map((w: any, idx: number) => (
                      <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                        {String(w)}
                      </li>
                    ))}
                    {(!analysis.ai_early_warnings || analysis.ai_early_warnings.length === 0) && (
                      <div className="text-xs text-slate-500 italic">No early warnings</div>
                    )}
                 </ul>
               </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
             <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Trends</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setAggregation('day')} className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${aggregation === 'day' ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Daily</button>
                <button onClick={() => setAggregation('week')} className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${aggregation === 'week' ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Weekly</button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div>
                 <div className="text-sm font-medium text-slate-900 mb-4">Mood History</div>
                 <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={moodSeries} margin={{ left: 0, right: 0, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" axisLine={false} tickLine={false} dy={10} />
                      <YAxis domain={[0, 1]} ticks={[0, 0.5, 1]} tickFormatter={(v) => getValueLabel(v)} width={40} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: any, name: any, props: any) => [props.payload.textLabel, 'Mood']} labelClassName="text-xs font-medium" contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                      <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                 </div>
               </div>

               <div>
                 <div className="text-sm font-medium text-slate-900 mb-4">Tone History</div>
                 <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={toneSeries} margin={{ left: 0, right: 0, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" axisLine={false} tickLine={false} dy={10} />
                      <YAxis domain={[0, 1]} ticks={[0, 0.5, 1]} tickFormatter={(v) => getValueLabel(v)} width={40} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: any, name: any, props: any) => [props.payload.textLabel, 'Tone']} labelClassName="text-xs font-medium" contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                      <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                 </div>
               </div>
            </div>
          </section>
        </>
      ) : (
        elder && (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-6 text-center text-sm text-slate-600">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="font-semibold text-slate-800">Insights coming soon</p>
            <p className="mt-1">
              Once Eva completes enough recent calls with {elder.first_name}, we’ll generate mood, tone, and wellbeing analysis here.
            </p>
          </section>
        )
      )}

      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Call History</h2>
            {filteredReports.length > itemsPerPage && (
              <span className="text-xs text-slate-500">
                Showing {showingStart}-{showingEnd} of {filteredReports.length}
                {callTypeFilter !== 'all' ? ` • ${activeFilterLabel}` : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="call-type-filter" className="text-xs font-medium text-slate-500">
              Call type
            </label>
            <select
              id="call-type-filter"
              value={callTypeFilter}
              onChange={(event) => setCallTypeFilter(event.target.value as CallTypeFilter)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              {CALL_TYPE_FILTERS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
          {callReports.length > 0 ? (
            filteredReports.length > 0 ? (
              <>
              <div className="mt-4 space-y-3">
                {paginatedReports.map((report) => {
                const moodValue = typeof report.sentiment_score === 'number' 
                  ? report.sentiment_score 
                  : parseFloat(String(report.mood_assessment ?? ''))
                const moodDisplay = Number.isFinite(moodValue) 
                  ? `${Math.round(moodValue * 100)}%`
                  : report.mood_assessment || 'N/A'
                const callTypeInfo = report.call_executions?.call_type ? getCallTypeInfo(report.call_executions.call_type) : null

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
                          {callTypeInfo && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${callTypeInfo.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1 ${callTypeInfo.dot}`} />
                              {callTypeInfo.label}
                            </span>
                          )}
                          {report.call_executions?.onboarding_call && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                              <UserPlus className="w-3 h-3 mr-1" />
                              Onboarding
                            </span>
                          )}
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

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
            ) : (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">
                <Clock className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <p>No calls match the selected filter.</p>
              </div>
            )
          ) : (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">
              <Clock className="h-5 w-5 text-slate-400 flex-shrink-0" />
              <p>No calls have been completed yet. We&apos;ll show updates here once the first call finishes.</p>
            </div>
          )}
      </section>

      {/* Need help section */}
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Need help?</h2>
        <p className="text-sm text-slate-600">
          Reach us at <a href="mailto:support@evacares.com" className="text-slate-900 underline hover:text-slate-700">support@evacares.com</a>{' '}
          or call +1 (555) 123-4567 for urgent assistance.
        </p>
      </section>

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


