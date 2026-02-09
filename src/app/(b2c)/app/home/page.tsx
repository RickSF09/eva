'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { CallReportModal } from '@/components/calls/CallReportModal'
import { formatDateTime, formatDuration } from '@/lib/utils'
import {
  Clock,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Phone,
  TrendingUp,
  UserPlus,
  CheckCircle,
  Loader2,
  Heart,
  Sparkles,
} from 'lucide-react'
import { format, parseISO, startOfWeek, differenceInHours } from 'date-fns'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

/** Flattened shape we use after joining post_call_reports + call_executions */
interface CallReport {
  // from post_call_reports
  id: string
  execution_id: string
  elder_id: string
  summary: string | null
  transcript: any
  escalation_triggered: boolean | null
  escalation_data: any
  recording_url: string | null
  recording_storage_path: string | null
  conversation_quality: any
  loneliness_indicators: any
  physical_health: any
  mental_health: any
  social_environment: any
  checklist_completion: any
  callback_analysis: any
  health_indicators: any
  // from joined call_executions
  call_executions: {
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

interface EscalationIncident {
  id: string
  escalation_reason: string
  severity_level: string
  status: string
  created_at: string
}

type CallTypeFilter = 'all' | 'scheduled' | 'retry' | 'emergency_contact' | 'escalation_followup'

const CALL_TYPE_FILTERS: { value: CallTypeFilter; label: string }[] = [
  { value: 'all', label: 'All calls' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'retry', label: 'Retry' },
  { value: 'emergency_contact', label: 'Emergency contact' },
  { value: 'escalation_followup', label: 'Escalation follow-up' },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function B2CHomePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [elder, setElder] = useState<Elder | null>(null)

  // Stats data (30-day window for charts + connection score)
  const [statsReports, setStatsReports] = useState<CallReport[]>([])
  // All call_executions in 30-day window (for connection score)
  const [executions, setExecutions] = useState<any[]>([])

  // Paginated call history
  const [historyReports, setHistoryReports] = useState<CallReport[]>([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyLoading, setHistoryLoading] = useState(false)

  const [selectedReport, setSelectedReport] = useState<CallReport | null>(null)
  const [activeRequests, setActiveRequests] = useState<any[]>([])
  const [openEscalations, setOpenEscalations] = useState<EscalationIncident[]>([])
  const [nextCall, setNextCall] = useState<any | null>(null)
  const [aggregation, setAggregation] = useState<'day' | 'week'>('day')
  const [currentPage, setCurrentPage] = useState(1)
  const [callTypeFilter, setCallTypeFilter] = useState<CallTypeFilter>('all')
  const [showInsights, setShowInsights] = useState(false)
  const itemsPerPage = 5

  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const formatMomentContext = (ctx: any) => {
    if (!ctx) return ''
    if (typeof ctx === 'string') return ctx
    if (typeof ctx === 'number' || typeof ctx === 'boolean') return String(ctx)
    if (typeof ctx === 'object') {
      const name = typeof ctx.name === 'string' ? ctx.name : ''
      const relation = typeof ctx.relation === 'string' ? ctx.relation : ''
      const detail = typeof ctx.context === 'string' ? ctx.context : ''
      const header = [name, relation].filter(Boolean).join(' · ')
      if (header && detail) return `${header} — ${detail}`
      if (header) return header
      if (detail) return detail
      try { return JSON.stringify(ctx) } catch { return '' }
    }
    return ''
  }

  // ---------------------------------------------------------------------------
  // Auth guard
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!user) router.replace('/login')
  }, [user, router])

  // ---------------------------------------------------------------------------
  // Initial data load
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!user) return
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
          setStatsReports([])
          setExecutions([])
          setHistoryReports([])
          setHistoryTotal(0)
          setActiveRequests([])
          setOpenEscalations([])
          return
        }

        setProfile(userRecord)

        const { data: elderRecord } = await supabase
          .from('elders')
          .select('id, first_name, last_name, phone, medications, medical_conditions')
          .eq('user_id', userRecord.id)
          .single()

        if (!elderRecord) {
          setElder(null)
          setStatsReports([])
          setExecutions([])
          setHistoryReports([])
          setHistoryTotal(0)
          setActiveRequests([])
          setOpenEscalations([])
          return
        }

        setElder(elderRecord)

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

        // Fetch reports with joined executions for STATS
        const { data: reports } = await supabase
          .from('post_call_reports')
          .select(`
            id, execution_id, elder_id, summary, transcript,
            escalation_triggered, escalation_data,
            recording_url, recording_storage_path,
            conversation_quality, loneliness_indicators,
            physical_health, mental_health, social_environment,
            checklist_completion, callback_analysis, health_indicators,
            call_executions!inner(
              id, attempted_at, completed_at, duration, status,
              picked_up, call_type, onboarding_call, scheduled_for
            )
          `)
          .eq('elder_id', elderRecord.id)
          .gte('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: false })

        const formatted = (reports || []).map((r: any) => ({
          ...r,
          call_executions: Array.isArray(r.call_executions)
            ? r.call_executions[0] || null
            : r.call_executions || null,
        })) as CallReport[]

        if (active) setStatsReports(formatted)

        // Fetch all executions in window (for connection score)
        const { data: execs } = await supabase
          .from('call_executions')
          .select('id, attempted_at, completed_at, duration, status, picked_up, call_type, scheduled_for')
          .eq('elder_id', elderRecord.id)
          .gte('created_at', thirtyDaysAgo)
          .order('scheduled_for', { ascending: false })

        if (active) setExecutions(execs || [])

        // Active requests
        const { data: requests } = await supabase
          .from('call_requests')
          .select('*')
          .eq('elder_id', elderRecord.id)
          .eq('resolved', false)
          .order('created_at', { ascending: false })

        if (active) setActiveRequests(requests || [])

        // Open escalations
        const { data: escalations } = await supabase
          .from('escalation_incidents')
          .select('id, escalation_reason, severity_level, status, created_at')
          .eq('elder_id', elderRecord.id)
          .neq('status', 'resolved')
          .order('created_at', { ascending: false })

        if (active) setOpenEscalations((escalations || []) as EscalationIncident[])

        // Next scheduled call
        const { data: upcoming } = await supabase
          .from('call_executions')
          .select(`
            id, 
            scheduled_for, 
            call_type,
            call_schedules (
              name
            )
          `)
          .eq('elder_id', elderRecord.id)
          .eq('status', 'pending')
          .gte('scheduled_for', new Date().toISOString())
          .order('scheduled_for', { ascending: true })
          .limit(1)

        if (active) {
          const rawNext = upcoming?.[0]
          if (rawNext) {
            setNextCall({
              ...rawNext,
              schedule_name: Array.isArray(rawNext.call_schedules) 
                ? rawNext.call_schedules[0]?.name 
                : (rawNext.call_schedules as any)?.name
            })
          } else {
            setNextCall(null)
          }
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [user])

  // ---------------------------------------------------------------------------
  // Paginated history
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!elder) return
    let active = true
    setHistoryLoading(true)

    const fetchHistory = async () => {
      try {
        const from = (currentPage - 1) * itemsPerPage
        const to = from + itemsPerPage - 1

        let query = supabase
          .from('post_call_reports')
          .select(`
            id, execution_id, elder_id, summary, transcript,
            escalation_triggered, escalation_data,
            recording_url, recording_storage_path,
            conversation_quality, loneliness_indicators,
            physical_health, mental_health, social_environment,
            checklist_completion, callback_analysis, health_indicators,
            call_executions!inner(
              id, attempted_at, completed_at, duration, status,
              picked_up, call_type, onboarding_call, scheduled_for
            )
          `, { count: 'exact' })
          .eq('elder_id', elder.id)
          .order('created_at', { ascending: false })
          .range(from, to)

        if (callTypeFilter !== 'all') {
          query = query.eq('call_executions.call_type', callTypeFilter)
        }

        const { data: reports, count, error } = await query
        if (!active) return
        if (error) { console.error('Error fetching history:', error); return }

        const formatted = (reports || []).map((r: any) => ({
          ...r,
          call_executions: Array.isArray(r.call_executions)
            ? r.call_executions[0] || null
            : r.call_executions || null,
        })) as CallReport[]

        setHistoryReports(formatted)
        if (count !== null) setHistoryTotal(count)
      } catch (err) {
        console.error('Failed to fetch history', err)
      } finally {
        if (active) setHistoryLoading(false)
      }
    }

    fetchHistory()
    return () => { active = false }
  }, [elder, currentPage, callTypeFilter, itemsPerPage])

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1) }, [callTypeFilter])

  // ---------------------------------------------------------------------------
  // Computed: Connection Score
  // ---------------------------------------------------------------------------
  const connectionScore = useMemo(() => {
    if (executions.length === 0) return null

    const total = executions.length
    const completed = executions.filter(
      (e) => e.status === 'completed' && e.picked_up === true,
    )
    const completionRate = total > 0 ? completed.length / total : 0

    const durations = completed
      .map((e) => Number(e.duration))
      .filter((d) => d > 0)
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0

    // Days connected this week
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const daysThisWeek = new Set(
      completed
        .filter((e) => e.completed_at && new Date(e.completed_at).getTime() > sevenDaysAgo)
        .map((e) => format(parseISO(e.completed_at!), 'yyyy-MM-dd')),
    ).size

    // Missed call streak (from most recent going backwards)
    let missedStreak = 0
    const sorted = [...executions].sort(
      (a, b) => new Date(b.scheduled_for || b.created_at).getTime() - new Date(a.scheduled_for || a.created_at).getTime(),
    )
    for (const e of sorted) {
      if (e.status === 'completed' && e.picked_up === true) break
      if (e.status !== 'pending') missedStreak++
    }

    // Overall score: weighted combination
    const engagementRatings = statsReports
      .map((r) => r.conversation_quality?.engagement_rating)
      .filter((v): v is number => typeof v === 'number')
    const avgEngagement = engagementRatings.length > 0
      ? engagementRatings.reduce((a, b) => a + b, 0) / engagementRatings.length
      : 0.5

    // Score = 40% completion + 30% engagement + 20% duration_factor + 10% recency
    const durationFactor = Math.min(avgDuration / 300, 1) // normalise to 5 min ideal
    const recencyFactor = daysThisWeek / 7
    const score = Math.round(
      (completionRate * 0.4 + avgEngagement * 0.3 + durationFactor * 0.2 + recencyFactor * 0.1) * 100,
    )

    return {
      score: Math.min(100, Math.max(0, score)),
      completionRate: Math.round(completionRate * 100),
      avgDuration: Math.round(avgDuration),
      daysThisWeek,
      missedStreak,
    }
  }, [executions, statsReports])

  // ---------------------------------------------------------------------------
  // Computed: Engagement Trend chart data
  // ---------------------------------------------------------------------------
  const trendData = useMemo(() => {
    const buckets: Record<string, { label: string; engagementSum: number; engagementCount: number; isolationSum: number; isolationCount: number }> = {}

    for (const r of statsReports) {
      const attemptedAt = r.call_executions?.attempted_at
      if (!attemptedAt) continue

      const dt = parseISO(attemptedAt)
      const keyDay = format(dt, 'yyyy-MM-dd')
      const keyWeek = format(startOfWeek(dt, { weekStartsOn: 1 }), 'yyyy-ww')
      const bucketKey = aggregation === 'day' ? keyDay : keyWeek
      const label = aggregation === 'day'
        ? format(dt, 'MMM d')
        : `Wk of ${format(startOfWeek(dt, { weekStartsOn: 1 }), 'MMM d')}`

      const b = (buckets[bucketKey] ||= { label, engagementSum: 0, engagementCount: 0, isolationSum: 0, isolationCount: 0 })

      const eng = r.conversation_quality?.engagement_rating
      if (typeof eng === 'number') { b.engagementSum += eng; b.engagementCount++ }

      const iso = r.loneliness_indicators?.isolation_risk_score
      if (typeof iso === 'number') { b.isolationSum += iso; b.isolationCount++ }
    }

  return Object.entries(buckets)
    .map(([key, v]) => ({
      key,
      label: v.label,
      engagement: v.engagementCount > 0 ? +(v.engagementSum / v.engagementCount).toFixed(2) : null,
        isolationRisk: v.isolationCount > 0 ? +(v.isolationSum / v.isolationCount).toFixed(2) : null,
      }))
      .sort((a, b) => (a.key < b.key ? -1 : 1))
  }, [statsReports, aggregation])

  const parseScheduledFor = (value?: string | null) => {
    if (!value) return null
    const isoDate = parseISO(value)
    if (!Number.isNaN(isoDate.getTime())) return isoDate
    const epochMatch = value.match(/\d{9,13}/)
    if (epochMatch) {
      const epoch = Number(epochMatch[0])
      if (!Number.isNaN(epoch)) {
        const multiplier = epoch > 1_000_000_000_000 ? 1 : 1000
        const epochDate = new Date(epoch * multiplier)
        if (!Number.isNaN(epochDate.getTime())) return epochDate
      }
    }
    const fallback = new Date(value)
    return Number.isNaN(fallback.getTime()) ? null : fallback
  }

  // ---------------------------------------------------------------------------
  // Computed: Connection highlights
  // ---------------------------------------------------------------------------
  const highlights = useMemo(() => {
    // Last successful call
    const lastCompleted = statsReports.find(
      (r) => r.call_executions?.status === 'completed' && r.call_executions?.picked_up,
    )

    // Favorite topics from notable_positive_moments across all reports
    const allMoments = statsReports.flatMap(
      (r) => r.conversation_quality?.notable_positive_moments || [],
    )

    return { lastCall: lastCompleted, moments: allMoments.slice(0, 3), nextCall }
  }, [statsReports, nextCall])

  const nextCallDate = parseScheduledFor(highlights.nextCall?.scheduled_for)

  const attentionCount = activeRequests.length + openEscalations.length

  const latestPositiveMoment = useMemo(() => {
    const firstMoment = highlights.moments[0]
    if (!firstMoment) return null
    if (typeof firstMoment === 'string') return { quote: firstMoment, context: '' }
    const quote = typeof firstMoment.quote === 'string' ? firstMoment.quote : formatMomentContext(firstMoment)
    const context = typeof firstMoment.context === 'string' ? firstMoment.context : ''
    if (!quote) return null
    return { quote, context }
  }, [highlights.moments])

  const reassuranceMessage = useMemo(() => {
    if (openEscalations.length > 0) {
      return `${openEscalations.length} escalation${openEscalations.length === 1 ? '' : 's'} need your review.`
    }
    if (activeRequests.length > 0) {
      return `${activeRequests.length} request${activeRequests.length === 1 ? '' : 's'} captured for follow-up.`
    }
    if (highlights.lastCall?.call_executions?.attempted_at) {
      return `${elder?.first_name || 'Your loved one'} was checked in on ${format(parseISO(highlights.lastCall.call_executions.attempted_at), 'EEE, MMM d \'at\' h:mm a')}.`
    }
    if (highlights.nextCall?.scheduled_for) {
      return nextCallDate
        ? `Next check-in is scheduled for ${format(nextCallDate, 'EEE, MMM d \'at\' h:mm a')}.`
        : 'Next check-in is scheduled soon.'
    }
    return 'Eva keeps checking in and surfaces anything that needs your attention.'
  }, [
    activeRequests.length,
    elder?.first_name,
    highlights.lastCall,
    highlights.nextCall,
    nextCallDate,
    openEscalations.length,
  ])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleResolveRequest = async (requestId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      setResolvingId(requestId)
      const { error } = await supabase
        .from('call_requests')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', requestId)
      if (error) throw error
      setActiveRequests((prev) => prev.filter((r) => r.id !== requestId))
    } catch {
      alert('Failed to update request status')
    } finally {
      setResolvingId(null)
    }
  }

  const handleRequestClick = async (callId: string) => {
    const existing = historyReports.find((r) => r.id === callId) || statsReports.find((r) => r.id === callId)
    if (existing) { setSelectedReport(existing); return }
    try {
      const { data: report } = await supabase
        .from('post_call_reports')
        .select(`
          id, execution_id, elder_id, summary, transcript,
          escalation_triggered, escalation_data,
          recording_url, recording_storage_path,
          conversation_quality, loneliness_indicators,
          physical_health, mental_health, social_environment,
          checklist_completion, callback_analysis, health_indicators,
          call_executions(
            id, attempted_at, completed_at, duration, status,
            picked_up, call_type, onboarding_call, scheduled_for
          )
        `)
        .eq('id', callId)
        .single()
      if (report) {
        const formatted = {
          ...report,
          call_executions: Array.isArray(report.call_executions)
            ? report.call_executions[0] || null
            : report.call_executions || null,
        } as CallReport
        setSelectedReport(formatted)
      }
    } catch (err) {
      console.error('Failed to fetch linked report', err)
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const getCallTypeInfo = (callType?: string | null) => {
    switch (callType) {
      case 'scheduled': return { label: 'Scheduled', badge: 'bg-indigo-50 text-indigo-700 border border-indigo-200', dot: 'bg-indigo-500' }
      case 'retry': return { label: 'Retry', badge: 'bg-orange-50 text-orange-700 border border-orange-200', dot: 'bg-orange-500' }
      case 'emergency_contact': return { label: 'Emergency contact', badge: 'bg-rose-50 text-rose-700 border border-rose-200', dot: 'bg-rose-500' }
      case 'escalation_followup': return { label: 'Escalation follow-up', badge: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500' }
      default: return { label: callType || 'Call', badge: 'bg-slate-50 text-slate-700 border border-slate-200', dot: 'bg-slate-400' }
    }
  }

  const severityBadge = (s?: string) => {
    switch ((s || '').toLowerCase()) {
      case 'high': return 'bg-rose-50 text-rose-700 border border-rose-200'
      case 'medium': return 'bg-orange-50 text-orange-700 border border-orange-200'
      default: return 'bg-slate-50 text-slate-700 border border-slate-200'
    }
  }

  const scoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600'
    if (score >= 40) return 'text-amber-600'
    return 'text-rose-600'
  }

  const scoreRingColor = (score: number) => {
    if (score >= 70) return 'stroke-emerald-500'
    if (score >= 40) return 'stroke-amber-500'
    return 'stroke-rose-500'
  }

  const formatLastCheckIn = (value?: string | null) => {
    if (!value) return 'No completed check-in yet'
    const callDate = parseISO(value)
    const hoursAgo = differenceInHours(new Date(), callDate)
    if (hoursAgo < 1) return 'Checked in less than 1 hour ago'
    if (hoursAgo < 24) return `Checked in ${hoursAgo} hour${hoursAgo === 1 ? '' : 's'} ago`
    const daysAgo = Math.floor(hoursAgo / 24)
    return `Checked in ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`
  }

  const totalPages = Math.ceil(historyTotal / itemsPerPage)
  const showingStart = historyTotal > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
  const showingEnd = historyTotal > 0 ? Math.min(currentPage * itemsPerPage, historyTotal) : 0

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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
      {/* Welcome header */}
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {profile ? `Hi ${profile.first_name}!` : 'Welcome to Eva Cares'}
            </h1>
            {elder ? (
              <p className="mt-1 text-sm text-slate-600">
                Monitoring: <span className="font-medium text-slate-900">{elder.first_name} {elder.last_name}</span>
                {' \u2022 '}
                <Link href="/app/elder" className="text-slate-900 underline hover:text-slate-700">View profile</Link>
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-600">
                <Link href="/app/elder" className="text-slate-900 underline hover:text-slate-700">Add profile details</Link>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 1. Care Snapshot                                                  */}
      {/* ================================================================= */}
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />
              Care Snapshot
            </h2>
            <p className="mt-1 text-sm text-slate-600">{reassuranceMessage}</p>
          </div>
          {attentionCount > 0 ? (
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              {attentionCount} item{attentionCount === 1 ? '' : 's'} need attention
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              No urgent issues
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Last check-in</span>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {formatLastCheckIn(highlights.lastCall?.call_executions?.attempted_at)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Next check-in</span>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {nextCallDate
                ? format(nextCallDate, 'EEE, MMM d \'at\' h:mm a')
                : 'Scheduling soon'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Open follow-ups</span>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {attentionCount > 0 ? `${attentionCount} item${attentionCount === 1 ? '' : 's'}` : 'Everything is up to date'}
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 2. Recent Highlight                                               */}
      {/* ================================================================= */}
      {(latestPositiveMoment || highlights.lastCall) && (
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                Recent Highlight
              </h2>
              <p className="mt-3 text-sm text-slate-700 leading-relaxed">
                {latestPositiveMoment?.quote
                  ? `"${latestPositiveMoment.quote}"`
                  : (highlights.lastCall?.summary || 'No summary available')}
              </p>
              {latestPositiveMoment?.context && (
                <p className="mt-2 text-xs text-slate-500">{latestPositiveMoment.context}</p>
              )}
            </div>
            {highlights.lastCall && (
              <button
                onClick={() => setSelectedReport(highlights.lastCall!)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Open report
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 3. Detailed Insights (expandable)                                 */}
      {/* ================================================================= */}
      {(connectionScore || trendData.length > 1) && (
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <button
            type="button"
            onClick={() => setShowInsights((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div>
              <h2 className="text-base font-semibold text-slate-900">Detailed Insights</h2>
              <p className="text-sm text-slate-600">Optional trends and deeper metrics.</p>
            </div>
            {showInsights ? (
              <ChevronUp className="h-5 w-5 text-slate-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-500" />
            )}
          </button>

          {showInsights && (
            <div className="mt-5 space-y-6 border-t border-slate-100 pt-5">
              {connectionScore && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <h3 className="mb-4 text-sm font-semibold text-slate-900">Connection Overview</h3>
                  <div className="flex flex-col items-center gap-6 lg:flex-row">
                    <div className="relative flex-shrink-0">
                      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-slate-200" />
                        <circle
                          cx="60" cy="60" r="52" fill="none" strokeWidth="10"
                          className={scoreRingColor(connectionScore.score)}
                          strokeLinecap="round"
                          strokeDasharray={`${(connectionScore.score / 100) * 327} 327`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-2xl font-bold ${scoreColor(connectionScore.score)}`}>
                          {connectionScore.score}
                        </span>
                      </div>
                    </div>

                    <div className="grid w-full grid-cols-2 gap-3">
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-xs text-slate-500">Completed calls</p>
                        <p className="text-base font-semibold text-slate-900">{connectionScore.completionRate}%</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-xs text-slate-500">Average call length</p>
                        <p className="text-base font-semibold text-slate-900">{formatDuration(connectionScore.avgDuration)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-xs text-slate-500">Check-ins this week</p>
                        <p className="text-base font-semibold text-slate-900">{connectionScore.daysThisWeek} / 7</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-xs text-slate-500">Calls needing retry</p>
                        <p className={`text-base font-semibold ${connectionScore.missedStreak > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {connectionScore.missedStreak}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {trendData.length > 1 && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      Well-being Trend
                    </h3>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setAggregation('day')} className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${aggregation === 'day' ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Daily</button>
                      <button onClick={() => setAggregation('week')} className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${aggregation === 'week' ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Weekly</button>
                    </div>
                  </div>

                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ left: 0, right: 0, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" axisLine={false} tickLine={false} dy={10} />
                        <YAxis domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} width={40} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(v: any, name: string) => [`${Math.round(v * 100)}%`, name === 'engagement' ? 'Engagement' : 'Isolation risk']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                        />
                        <Legend verticalAlign="top" height={30} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                        <Line name="Engagement" type="monotone" dataKey="engagement" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />
                        <Line name="Isolation Risk" type="monotone" dataKey="isolationRisk" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: '#f43f5e', strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ================================================================= */}
      {/* 4. Active Requests & Needs (kept from old design)                */}
      {/* ================================================================= */}
      {activeRequests.length > 0 && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 px-6 py-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📝</span>
            <h2 className="text-lg font-semibold text-blue-900">Active Requests & Needs</h2>
          </div>
          <div className="space-y-3">
            {activeRequests.map((req) => (
              <button
                key={req.id}
                onClick={() => handleRequestClick(req.call_id)}
                className="w-full text-left bg-white border border-blue-100 rounded-xl p-4 hover:shadow-md transition-shadow group"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">📝</span>
                      <span className="text-sm font-semibold text-slate-900">{req.description}</span>
                      {req.urgency && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          req.urgency.toLowerCase().includes('high') ? 'bg-red-100 text-red-700'
                          : req.urgency.toLowerCase().includes('medium') ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                        }`}>
                          {req.urgency}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 pl-7">
                      <Clock className="w-3 h-3" />
                      <span>{req.created_at ? format(parseISO(req.created_at), 'MMM d, h:mm a') : ''}</span>
                      {req.quote && (
                        <span className="italic border-l border-slate-300 pl-2">&ldquo;{req.quote}&rdquo;</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => handleResolveRequest(req.id, e)}
                      disabled={resolvingId === req.id}
                      className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-green-700 hover:bg-green-50 px-2 py-1 rounded-lg border border-transparent hover:border-green-200 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      title="Mark as resolved"
                    >
                      {resolvingId === req.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span className="hidden sm:inline">Resolve</span>
                        </>
                      )}
                    </button>
                    <div className="flex items-center text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs font-medium mr-1 hidden sm:inline">View Report</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 5. Escalations & Follow-Ups (conditional)                        */}
      {/* ================================================================= */}
      {openEscalations.length > 0 && (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">Open Escalations</h2>
          </div>
          <div className="space-y-3">
            {openEscalations.map((esc) => (
              <div
                key={esc.id}
                className="bg-white border border-red-100 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityBadge(esc.severity_level)}`}>
                        {esc.severity_level.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-500">{esc.status}</span>
                    </div>
                    <p className="text-sm text-slate-800">{esc.escalation_reason}</p>
                  </div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">
                    {differenceInHours(new Date(), parseISO(esc.created_at))}h ago
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 6. Call History                                                   */}
      {/* ================================================================= */}
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Call History</h2>
            {historyTotal > itemsPerPage && (
              <span className="text-xs text-slate-500">
                Showing {showingStart}-{showingEnd} of {historyTotal}
                {callTypeFilter !== 'all' ? ` \u2022 ${CALL_TYPE_FILTERS.find((o) => o.value === callTypeFilter)?.label}` : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="call-type-filter" className="text-xs font-medium text-slate-500">Call type</label>
            <select
              id="call-type-filter"
              value={callTypeFilter}
              onChange={(e) => setCallTypeFilter(e.target.value as CallTypeFilter)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              {CALL_TYPE_FILTERS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {historyLoading && historyReports.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          </div>
        ) : historyReports.length > 0 ? (
          <>
            <div className={`mt-4 space-y-3 transition-opacity duration-200 ${historyLoading ? 'opacity-50' : 'opacity-100'}`}>
              {historyReports.map((report) => {
                const exec = report.call_executions
                const callTypeInfo = exec?.call_type ? getCallTypeInfo(exec.call_type) : null
                const engagementRating = report.conversation_quality?.engagement_rating
                const engagementDisplay = typeof engagementRating === 'number'
                  ? `${Math.round(engagementRating * 100)}%`
                  : 'N/A'

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
                            {exec?.attempted_at ? formatDateTime(exec.attempted_at) : 'Unknown date'}
                          </span>
                          {exec?.duration && (
                            <span className="text-xs text-slate-500">&bull; {formatDuration(exec.duration)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {callTypeInfo && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${callTypeInfo.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1 ${callTypeInfo.dot}`} />
                              {callTypeInfo.label}
                            </span>
                          )}
                          {exec?.onboarding_call && (
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
                          {exec?.picked_up === false && exec?.status === 'completed' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <Phone className="w-3 h-3 mr-1" />
                              No answer
                            </span>
                          )}
                          <span className="text-xs text-slate-600">
                            Engagement: <span className="font-medium text-slate-900">{engagementDisplay}</span>
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
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="text-sm text-slate-600">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">
            <Clock className="h-5 w-5 text-slate-400 flex-shrink-0" />
            <p>{callTypeFilter === 'all' ? "No calls have been completed yet. We'll show updates here once the first call finishes." : 'No calls match the selected filter.'}</p>
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

      {/* Call Report Modal */}
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
