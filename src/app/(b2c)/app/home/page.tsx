'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { CallReportModal } from '@/components/calls/CallReportModal'
import { formatDateTime, formatDuration } from '@/lib/utils'
import {
  Clock,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  AlertTriangle,
  Phone,
  TrendingUp,
  UserPlus,
  CheckCircle,
  Loader2,
  Heart,
  Sparkles,
} from 'lucide-react'
import { format, parseISO, differenceInHours } from 'date-fns'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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

type TrendState = 'improving' | 'stable' | 'declining' | 'volatile' | 'insufficient_data'
type TrendConfidence = 'low' | 'medium' | 'high'
type TrendDomainKey = 'loneliness' | 'social_connection' | 'engagement' | 'consistency'
type TrendMetricKey =
  | 'avg_loneliness_score'
  | 'avg_isolation_risk_score'
  | 'avg_engagement_rating'
  | 'support_system_strength_avg'
  | 'answered_calls_week'
  | 'minutes_called_week'

interface TrendDomainSummary {
  state: TrendState
}

interface DomainTrends {
  loneliness: TrendDomainSummary
  social_connection: TrendDomainSummary
  engagement: TrendDomainSummary
  consistency: TrendDomainSummary
}

interface WeeklySeriesPoint {
  week_start_utc: string
  week_end_utc: string
  avg_loneliness_score: number | null
  avg_isolation_risk_score: number | null
  avg_engagement_rating: number | null
  answered_calls_week: number | null
  minutes_called_week: number | null
  support_system_strength_avg: number | null
}

interface TrendReportViewModel {
  id: string
  elder_id: string
  anchor_week_start_utc: string
  anchor_week_end_utc: string
  window_weeks: number
  source_week_count: number
  source_call_count: number
  overall_trend_state: TrendState
  trend_confidence: TrendConfidence
  domain_trends: DomainTrends
  trend_features: Record<string, unknown>
  weekly_series: WeeklySeriesPoint[]
  period_discussion_summary: string
  remarkable_events: string[]
  happy_moments: string[]
  follow_up_points: string[]
  emerging_concerns: string[]
  improving_signals: string[]
  generated_at: string | null
}

type CallTypeFilter = 'all' | 'scheduled' | 'retry' | 'emergency_contact' | 'escalation_followup'

const CALL_TYPE_FILTERS: { value: CallTypeFilter; label: string }[] = [
  { value: 'all', label: 'All calls' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'retry', label: 'Retry' },
  { value: 'emergency_contact', label: 'Emergency contact' },
  { value: 'escalation_followup', label: 'Escalation follow-up' },
]

const TREND_METRIC_OPTIONS: Array<{
  key: TrendMetricKey
  label: string
  color: string
  kind: 'ratio' | 'count' | 'minutes'
}> = [
  { key: 'avg_loneliness_score', label: 'Loneliness score', color: '#475569', kind: 'ratio' },
  { key: 'avg_isolation_risk_score', label: 'Isolation risk', color: '#f43f5e', kind: 'ratio' },
  { key: 'avg_engagement_rating', label: 'Engagement rating', color: '#3b82f6', kind: 'ratio' },
  { key: 'support_system_strength_avg', label: 'Support strength', color: '#4f46e5', kind: 'ratio' },
  { key: 'answered_calls_week', label: 'Answered calls', color: '#0f766e', kind: 'count' },
  { key: 'minutes_called_week', label: 'Minutes called', color: '#7c3aed', kind: 'minutes' },
]

const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const parseObject = (value: unknown): Record<string, unknown> => {
  const parsed = parseMaybeJson(value)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  return parsed as Record<string, unknown>
}

const parseArray = (value: unknown): unknown[] => {
  const parsed = parseMaybeJson(value)
  return Array.isArray(parsed) ? parsed : []
}

const parseNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value.trim())
    if (Number.isFinite(n)) return n
  }
  return null
}

const parseStringList = (value: unknown): string[] => {
  return parseArray(value)
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>
        if (typeof obj.title === 'string') return obj.title.trim()
        if (typeof obj.message === 'string') return obj.message.trim()
      }
      return String(item ?? '').trim()
    })
    .filter(Boolean)
}

const parseTrendState = (value: unknown): TrendState => {
  switch (String(value || '').toLowerCase()) {
    case 'improving':
      return 'improving'
    case 'stable':
      return 'stable'
    case 'declining':
      return 'declining'
    case 'volatile':
      return 'volatile'
    default:
      return 'insufficient_data'
  }
}

const parseTrendConfidence = (value: unknown): TrendConfidence => {
  switch (String(value || '').toLowerCase()) {
    case 'high':
      return 'high'
    case 'medium':
      return 'medium'
    default:
      return 'low'
  }
}

const parseWeeklySeries = (value: unknown): WeeklySeriesPoint[] => {
  return parseArray(value)
    .map((item) => parseObject(item))
    .map((seriesItem) => ({
      week_start_utc: typeof seriesItem.week_start_utc === 'string' ? seriesItem.week_start_utc : '',
      week_end_utc: typeof seriesItem.week_end_utc === 'string' ? seriesItem.week_end_utc : '',
      avg_loneliness_score: parseNumber(seriesItem.avg_loneliness_score),
      avg_isolation_risk_score: parseNumber(seriesItem.avg_isolation_risk_score),
      avg_engagement_rating: parseNumber(seriesItem.avg_engagement_rating),
      answered_calls_week: parseNumber(seriesItem.answered_calls_week),
      minutes_called_week: parseNumber(seriesItem.minutes_called_week),
      support_system_strength_avg: parseNumber(seriesItem.support_system_strength_avg),
    }))
    .sort((a, b) => (a.week_start_utc < b.week_start_utc ? -1 : 1))
}

const parseDomainTrends = (value: unknown): DomainTrends => {
  const raw = parseObject(value)
  const pickState = (key: TrendDomainKey): TrendDomainSummary => {
    const domain = parseObject(raw[key])
    return { state: parseTrendState(domain.state) }
  }
  return {
    loneliness: pickState('loneliness'),
    social_connection: pickState('social_connection'),
    engagement: pickState('engagement'),
    consistency: pickState('consistency'),
  }
}

const normalizeTrendReport = (raw: any): TrendReportViewModel => {
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    elder_id: typeof raw.elder_id === 'string' ? raw.elder_id : '',
    anchor_week_start_utc: typeof raw.anchor_week_start_utc === 'string' ? raw.anchor_week_start_utc : '',
    anchor_week_end_utc: typeof raw.anchor_week_end_utc === 'string' ? raw.anchor_week_end_utc : '',
    window_weeks: parseNumber(raw.window_weeks) ?? 8,
    source_week_count: parseNumber(raw.source_week_count) ?? 0,
    source_call_count: parseNumber(raw.source_call_count) ?? 0,
    overall_trend_state: parseTrendState(raw.overall_trend_state),
    trend_confidence: parseTrendConfidence(raw.trend_confidence),
    domain_trends: parseDomainTrends(raw.domain_trends),
    trend_features: parseObject(raw.trend_features),
    weekly_series: parseWeeklySeries(raw.weekly_series),
    period_discussion_summary: typeof raw.period_discussion_summary === 'string' ? raw.period_discussion_summary : '',
    remarkable_events: parseStringList(raw.remarkable_events),
    happy_moments: parseStringList(raw.happy_moments),
    follow_up_points: parseStringList(raw.follow_up_points),
    emerging_concerns: parseStringList(raw.emerging_concerns),
    improving_signals: parseStringList(raw.improving_signals),
    generated_at: typeof raw.generated_at === 'string' ? raw.generated_at : null,
  }
}

const formatStateLabel = (state: TrendState): string => {
  switch (state) {
    case 'insufficient_data':
      return 'Insufficient data'
    default:
      return state.charAt(0).toUpperCase() + state.slice(1)
  }
}

const stateBadgeClass = (state: TrendState, confidence: TrendConfidence): string => {
  if (state === 'insufficient_data') return 'border border-slate-200 bg-slate-50 text-slate-700'
  if (confidence === 'low') return 'border border-slate-200 bg-slate-50 text-slate-700'
  switch (state) {
    case 'improving':
      return 'border border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'stable':
      return 'border border-blue-200 bg-blue-50 text-blue-700'
    case 'volatile':
      return 'border border-amber-200 bg-amber-50 text-amber-700'
    case 'declining':
      return 'border border-orange-200 bg-orange-50 text-orange-700'
    default:
      return 'border border-slate-200 bg-slate-50 text-slate-700'
  }
}

const confidenceBadgeClass = (confidence: TrendConfidence): string => {
  switch (confidence) {
    case 'high':
      return 'border border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'medium':
      return 'border border-amber-200 bg-amber-50 text-amber-700'
    default:
      return 'border border-slate-200 bg-slate-50 text-slate-700'
  }
}

const formatWeekLabel = (value: string): string => {
  if (!value) return 'Unknown'
  const date = parseISO(value)
  return Number.isNaN(date.getTime()) ? value : format(date, 'MMM d')
}

const formatWeekDateLong = (value: string): string => {
  if (!value) return 'Unknown'
  const date = parseISO(value)
  return Number.isNaN(date.getTime()) ? value : format(date, 'MMM d, yyyy')
}

const formatMetricValueForTooltip = (key: TrendMetricKey, value: number | null): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A'
  const metric = TREND_METRIC_OPTIONS.find((option) => option.key === key)
  if (!metric) return String(value)
  if (metric.kind === 'ratio') return `${Math.round(value * 100)}%`
  if (metric.kind === 'minutes') return `${value.toFixed(1)} min`
  return `${Math.round(value)}`
}

const normalizeTooltipMetricValue = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  if (Array.isArray(value) && value.length > 0) {
    return normalizeTooltipMetricValue(value[0])
  }
  return null
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function B2CHomePage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [elder, setElder] = useState<Elder | null>(null)

  // Stats data (30-day window for highlights + history context)
  const [statsReports, setStatsReports] = useState<CallReport[]>([])

  // Paginated call history
  const [historyReports, setHistoryReports] = useState<CallReport[]>([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyLoading, setHistoryLoading] = useState(false)

  const [selectedReport, setSelectedReport] = useState<CallReport | null>(null)
  const [activeRequests, setActiveRequests] = useState<any[]>([])
  const [openEscalations, setOpenEscalations] = useState<EscalationIncident[]>([])
  const [nextCall, setNextCall] = useState<any | null>(null)
  const [trendReports, setTrendReports] = useState<TrendReportViewModel[]>([])
  const [trendReportsLoading, setTrendReportsLoading] = useState(false)
  const [selectedTrendMetric, setSelectedTrendMetric] = useState<TrendMetricKey>('avg_loneliness_score')
  const [showTrendDetails, setShowTrendDetails] = useState(false)
  const [showConnectionTrends, setShowConnectionTrends] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [callTypeFilter, setCallTypeFilter] = useState<CallTypeFilter>('all')
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
          setHistoryReports([])
          setHistoryTotal(0)
          setActiveRequests([])
          setOpenEscalations([])
          setTrendReports([])
          setTrendReportsLoading(false)
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
          setHistoryReports([])
          setHistoryTotal(0)
          setActiveRequests([])
          setOpenEscalations([])
          setTrendReports([])
          setTrendReportsLoading(false)
          return
        }

        setElder(elderRecord)
        setTrendReportsLoading(true)

        const { data: trendRows, error: trendError } = await supabase
          .from('elder_trend_reports')
          .select('*')
          .eq('elder_id', elderRecord.id)
          .order('anchor_week_start_utc', { ascending: false })

        if (trendError) {
          console.error('Error fetching trend reports:', trendError)
          if (active) setTrendReports([])
        } else if (active) {
          setTrendReports((trendRows || []).map(normalizeTrendReport))
        }
        if (active) setTrendReportsLoading(false)

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
        if (active) {
          setLoading(false)
          setTrendReportsLoading(false)
        }
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
  // Computed: Trend insights
  // ---------------------------------------------------------------------------
  const currentTrendReport = trendReports[0] ?? null
  const showTrendDebug = searchParams.get('debug') === '1'
  const isBuildingBaseline = Boolean(
    currentTrendReport
      && (
        currentTrendReport.overall_trend_state === 'insufficient_data'
        || currentTrendReport.source_week_count < 4
      ),
  )

  const selectedTrendMetricOption = useMemo(
    () => TREND_METRIC_OPTIONS.find((option) => option.key === selectedTrendMetric) || TREND_METRIC_OPTIONS[0],
    [selectedTrendMetric],
  )

  const selectedTrendSeries = useMemo(() => {
    if (!currentTrendReport) return []
    return currentTrendReport.weekly_series.map((point) => ({
      week_start_utc: point.week_start_utc,
      value: point[selectedTrendMetric],
    }))
  }, [currentTrendReport, selectedTrendMetric])

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
  const recentEscalations = useMemo(
    () => openEscalations.filter((esc) => differenceInHours(new Date(), parseISO(esc.created_at)) <= 7 * 24),
    [openEscalations],
  )

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
      {/* 1. Snapshot                                                       */}
      {/* ================================================================= */}
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />
              Snapshot
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

        {(latestPositiveMoment || highlights.lastCall) && (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  Recent Highlight
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
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
                  className="inline-flex items-center gap-1 self-start rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Open report
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* 2. Connection Trends                                              */}
      {/* ================================================================= */}
      {elder && (
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 px-6 py-5 shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500/40 via-emerald-500/30 to-transparent" />
          <div
            role="button"
            tabIndex={0}
            aria-expanded={showConnectionTrends}
            onClick={() => setShowConnectionTrends((prev) => !prev)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setShowConnectionTrends((prev) => !prev)
              }
            }}
            className="flex cursor-pointer flex-col gap-3 md:flex-row md:items-start md:justify-between"
          >
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-50">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </span>
                Trends
              </h2>
              {currentTrendReport ? (
                <>
                  <p className="mt-1 text-sm text-slate-600">
                    Based on {currentTrendReport.source_week_count} of last {currentTrendReport.window_weeks} weeks, {currentTrendReport.source_call_count} answered calls
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Generated {currentTrendReport.generated_at ? formatDateTime(currentTrendReport.generated_at) : 'Unknown'}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-slate-600">
                  Trend insights are generated from weekly snapshots.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {currentTrendReport && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${stateBadgeClass(currentTrendReport.overall_trend_state, currentTrendReport.trend_confidence)}`}>
                    Trend: {formatStateLabel(currentTrendReport.overall_trend_state)}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${confidenceBadgeClass(currentTrendReport.trend_confidence)}`}>
                    Confidence: {currentTrendReport.trend_confidence.toUpperCase()}
                  </span>
                </div>
              )}
              <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform ${showConnectionTrends ? 'rotate-180' : ''}`} />
            </div>
          </div>

          {showConnectionTrends && (
            <>
              {trendReportsLoading ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading trend insights…
                </div>
              ) : !currentTrendReport ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  No trend reports are available yet.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {isBuildingBaseline && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                      <p className="flex items-center gap-2 text-sm font-medium text-rose-700">
                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                        Need 4 weeks of data for reliable analysis.
                      </p>
                    </div>
                  )}

                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      What Was Discussed
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-slate-700">
                      {currentTrendReport.period_discussion_summary || 'No period summary available.'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {TREND_METRIC_OPTIONS.map((metric) => (
                        <button
                          key={metric.key}
                          onClick={() => setSelectedTrendMetric(metric.key)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            selectedTrendMetric === metric.key
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {metric.label}
                        </button>
                      ))}
                    </div>

                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedTrendSeries} margin={{ left: 0, right: 0, top: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis
                            dataKey="week_start_utc"
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            tickFormatter={formatWeekLabel}
                            interval="preserveStartEnd"
                            axisLine={false}
                            tickLine={false}
                            dy={8}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => {
                              if (selectedTrendMetricOption.kind === 'ratio') return `${Math.round((v || 0) * 100)}%`
                              if (selectedTrendMetricOption.kind === 'minutes') return `${v}`
                              return `${Math.round(v || 0)}`
                            }}
                          />
                          <Tooltip
                            labelFormatter={(label) => formatWeekDateLong(String(label))}
                            formatter={(value) => [
                              formatMetricValueForTooltip(selectedTrendMetric, normalizeTooltipMetricValue(value)),
                              selectedTrendMetricOption.label,
                            ]}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={selectedTrendMetricOption.color}
                            strokeWidth={2.5}
                            dot={{ r: 3, strokeWidth: 0, fill: selectedTrendMetricOption.color }}
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={showTrendDetails}
                    onClick={() => setShowTrendDetails((prev) => !prev)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setShowTrendDetails((prev) => !prev)
                      }
                    }}
                    className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50/60"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          Detailed Trend Notes
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">Remarkable events, moments, follow-ups and signals</p>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${showTrendDetails ? 'rotate-180' : ''}`} />
                    </div>

                    {showTrendDetails && (
                      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {[
                          { title: 'Remarkable Events', items: currentTrendReport.remarkable_events, emptyText: 'No remarkable events noted.', Icon: Sparkles, iconClass: 'text-violet-600', dotClass: 'bg-violet-500', cardClass: 'bg-violet-50/40 border-violet-200' },
                          { title: 'Happy Moments', items: currentTrendReport.happy_moments, emptyText: 'No happy moments captured.', Icon: Heart, iconClass: 'text-rose-600', dotClass: 'bg-rose-500', cardClass: 'bg-rose-50/40 border-rose-200' },
                          { title: 'Follow-up Points', items: currentTrendReport.follow_up_points, emptyText: 'No follow-up points listed.', Icon: Clock, iconClass: 'text-blue-600', dotClass: 'bg-blue-500', cardClass: 'bg-blue-50/40 border-blue-200' },
                          { title: 'Emerging Concerns', items: currentTrendReport.emerging_concerns, emptyText: 'No emerging concerns listed.', Icon: AlertTriangle, iconClass: 'text-amber-600', dotClass: 'bg-amber-500', cardClass: 'bg-amber-50/40 border-amber-200' },
                          { title: 'Improving Signals', items: currentTrendReport.improving_signals, emptyText: 'No improving signals listed.', Icon: TrendingUp, iconClass: 'text-emerald-600', dotClass: 'bg-emerald-500', cardClass: 'bg-emerald-50/40 border-emerald-200' },
                        ].map((section) => (
                          <div key={section.title} className={`rounded-lg border px-3 py-2.5 ${section.cardClass}`}>
                            <h4 className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                              <section.Icon className={`h-3.5 w-3.5 ${section.iconClass}`} />
                              {section.title}
                            </h4>
                            {section.items.length > 0 ? (
                              <ul className="mt-2 space-y-2">
                                {section.items.map((item, idx) => (
                                  <li key={`${section.title}-${idx}`} className="flex items-start gap-2.5 text-sm leading-6 text-slate-700">
                                    <span className={`mt-2 h-1.5 w-1.5 flex-none rounded-full ${section.dotClass}`} />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-2 text-sm text-slate-500">{section.emptyText}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {showTrendDebug && (
                    <details className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                        Debug info
                      </summary>
                      <div className="mt-3 space-y-3">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Domain trends</p>
                          <pre className="mt-1 overflow-x-auto rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700">{JSON.stringify(currentTrendReport.domain_trends, null, 2)}</pre>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Trend features</p>
                          <pre className="mt-1 overflow-x-auto rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700">{JSON.stringify(currentTrendReport.trend_features, null, 2)}</pre>
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              )}
            </>
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
      {recentEscalations.length > 0 && (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">Recent Escalations</h2>
          </div>
          <div className="space-y-3">
            {recentEscalations.map((esc) => (
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
