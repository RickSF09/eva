'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { computeHealthStatus, healthColorClasses, WeeklyCallStats } from '@/lib/health'
import { formatDateTime, formatDuration } from '@/lib/utils'
import { CallReportModal } from '@/components/calls/CallReportModal'
import { ArrowLeft, Clock, ChevronRight, AlertTriangle, Phone, MapPin, FileText, ArrowUpRight, ArrowDownRight, Minus, Activity, Sparkles, ShieldAlert } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'
import { format, parseISO, startOfWeek } from 'date-fns'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ElderDetailPage({ params }: PageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [elderId, setElderId] = useState<string>('')

  // Unwrap params Promise in Next.js 15
  useEffect(() => {
    params.then(({ id }) => setElderId(id))
  }, [params])

  const [elder, setElder] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])
  const [stats, setStats] = useState<WeeklyCallStats | null>(null)
  const [selectedReport, setSelectedReport] = useState<any | null>(null)
  const [callTypeFilter, setCallTypeFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview')
  const [aggregation, setAggregation] = useState<'day' | 'week'>('day')
  const [totals, setTotals] = useState<{ calls: number; escalations: number }>({ calls: 0, escalations: 0 })
  const [analysis, setAnalysis] = useState<any | null>(null)

  useEffect(() => {
    if (elderId) {
      fetchElder()
      fetchReports()
      fetchAnalysis()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elderId])

  const fetchElder = async () => {
    const { data } = await supabase.from('elders').select('*').eq('id', elderId).single()
    setElder(data)
  }

  const fetchReports = async () => {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('post_call_reports')
      .select(`
        *,
        call_executions!inner(
          call_type
        )
      `)
      .eq('elder_id', elderId)
      .gte('call_started_at', sixtyDaysAgo)
      .order('call_started_at', { ascending: false })
    setReports(data || [])

    const totalCount = data?.length || 0
    const completed = (data || []).filter(r => r.call_status === 'completed').length
    const completionRate = totalCount > 0 ? completed / totalCount : 0
    const sentiments = (data || []).map(r => r.sentiment_score).filter((v: any) => typeof v === 'number') as number[]
    const averageSentiment = sentiments.length ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length : null
    setStats({ completedCount: completed, totalCount, completionRate, averageSentiment, escalations: 0 })

    // Fetch lifetime totals for calls and escalations
    const [{ count: callsCount }, { count: escalationsCount }] = await Promise.all([
      supabase.from('post_call_reports').select('*', { count: 'exact', head: true }).eq('elder_id', elderId),
      supabase.from('escalation_incidents').select('*', { count: 'exact', head: true }).eq('elder_id', elderId),
    ])
    setTotals({ calls: callsCount || 0, escalations: escalationsCount || 0 })
  }

  const fetchAnalysis = async () => {
    const { data } = await supabase
      .from('elder_analysis_reports')
      .select('*')
      .eq('elder_id', elderId)
      .order('analysis_date', { ascending: false })
      .limit(1)

    const latest = (data && data[0]) || null
    if (!latest) {
      setAnalysis(null)
      return
    }

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
  }

  const status = stats ? computeHealthStatus(stats) : 'green'
  const colors = healthColorClasses(status)

  // Helper function to convert numeric value to text label
  const getValueLabel = (value: number): string => {
    if (value < 0.25) return 'Poor'
    if (value < 0.5) return 'Fair'
    if (value < 0.75) return 'Good'
    return 'Excellent'
  }

  const scoreColorBadge = (score?: number | null) => {
    const val = typeof score === 'number' ? score : 0
    if (val > 80) return 'bg-green-50 text-green-700 border border-green-200'
    if (val > 60) return 'bg-yellow-50 text-yellow-700 border border-yellow-200'
    if (val > 40) return 'bg-orange-50 text-orange-700 border border-orange-200'
    return 'bg-red-50 text-red-700 border border-red-200'
  }

  const trendInfo = (dir?: string | null) => {
    switch ((dir || '').toLowerCase()) {
      case 'improving':
      case 'up':
        return { label: 'Improving', color: 'bg-green-50 text-green-700 border border-green-200', icon: <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> }
      case 'declining':
      case 'down':
        return { label: 'Declining', color: 'bg-red-50 text-red-700 border border-red-200', icon: <ArrowDownRight className="w-3.5 h-3.5 mr-1" /> }
      default:
        return { label: 'Stable', color: 'bg-gray-50 text-gray-700 border border-gray-200', icon: <Minus className="w-3.5 h-3.5 mr-1" /> }
    }
  }

  const priorityBadge = (p?: string) => {
    switch ((p || '').toLowerCase()) {
      case 'high':
        return 'bg-red-50 text-red-700 border border-red-200'
      case 'medium':
        return 'bg-amber-50 text-amber-700 border border-amber-200'
      case 'low':
      default:
        return 'bg-green-50 text-green-700 border border-green-200'
    }
  }

  const severityBadge = (s?: string) => {
    switch ((s || '').toLowerCase()) {
      case 'high':
        return 'bg-red-50 text-red-700 border border-red-200'
      case 'medium':
        return 'bg-orange-50 text-orange-700 border border-orange-200'
      case 'low':
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200'
    }
  }

  // Build chart data for mood and tone
  const { moodSeries, toneSeries } = useMemo(() => {
    const moodPoints: { key: string; label: string; value: number; textLabel: string }[] = []
    const tonePoints: { key: string; label: string; value: number; textLabel: string }[] = []
    const bucketsMood: Record<string, { sum: number; count: number; label: string }> = {}
    const bucketsTone: Record<string, { sum: number; count: number; label: string }> = {}

    for (const r of reports) {
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
  }, [reports, aggregation])

  const getCallTypeInfo = (callType: string) => {
    switch (callType) {
      case 'scheduled':
        return { label: 'Scheduled', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', bgColor: 'bg-indigo-500' }
      case 'retry':
        return { label: 'Retry', color: 'bg-orange-50 text-orange-700 border-orange-200', bgColor: 'bg-orange-500' }
      case 'emergency_contact':
        return { label: 'Emergency Contact', color: 'bg-red-50 text-red-700 border-red-200', bgColor: 'bg-red-500' }
      case 'escalation_followup':
        return { label: 'Escalation Follow-up', color: 'bg-amber-50 text-amber-700 border-amber-200', bgColor: 'bg-amber-500' }
      default:
        return { label: callType || 'Unknown', color: 'bg-gray-50 text-gray-700 border-gray-200', bgColor: 'bg-gray-500' }
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                const from = searchParams.get('from')
                router.push(from === 'monitoring' ? '/monitoring' : '/elders')
              }}
              className="inline-flex items-center px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{elder?.first_name} {elder?.last_name}</h1>
              {stats && (
                <span className={`inline-flex items-center mt-2 px-2 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${colors.dot}`} />
                  {status.toUpperCase()}
                </span>
              )}
              {analysis && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${scoreColorBadge(analysis.overall_health_score)}`}>
                    Overall health: <span className="ml-1 font-semibold">{Math.round(analysis.overall_health_score || 0)}</span>
                  </span>
                  {analysis.risk_level && (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${severityBadge(analysis.risk_level)}`}>
                      Risk: <span className="ml-1 font-semibold capitalize">{String(analysis.risk_level)}</span>
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${trendInfo(analysis.trend_direction).color}`}>
                    {trendInfo(analysis.trend_direction).icon}
                    {trendInfo(analysis.trend_direction).label}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Elder details card */}
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-700">
                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                <span>{elder?.phone || 'No phone on file'}</span>
              </div>
              {elder?.address && (
                <div className="flex items-center text-sm text-gray-700">
                  <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="truncate">{elder.address}</span>
                </div>
              )}
              <div className="flex items-center space-x-2 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${elder?.active ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}`}>
                  {elder?.active ? 'Active' : 'Inactive'}
                </span>
                {elder?.created_at && (
                  <span className="text-gray-500">Since {formatDateTime(elder.created_at)}</span>
                )}
              </div>
            </div>
            <div className="space-y-3">
              {(elder?.medical_conditions || elder?.medications) && (
                <div>
                  <div className="flex items-center text-xs text-gray-500 mb-1">
                    <FileText className="w-3 h-3 mr-1" /> Medical Information
                  </div>
                  {elder?.medical_conditions && (
                    <p className="text-sm text-gray-700"><span className="font-medium">Conditions:</span> {elder.medical_conditions}</p>
                  )}
                  {elder?.medications && (
                    <p className="text-sm text-gray-700"><span className="font-medium">Medications:</span> {elder.medications}</p>
                  )}
                </div>
              )}
              {elder?.emergency_instructions && (
                <div>
                  <div className="flex items-center text-xs text-gray-500 mb-1">
                    <FileText className="w-3 h-3 mr-1" /> Emergency Instructions
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{elder.emergency_instructions}</p>
                </div>
              )}
              {elder?.personal_info && (
                <div>
                  <div className="flex items-center text-xs text-gray-500 mb-1">
                    <FileText className="w-3 h-3 mr-1" /> Personal Notes
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{elder.personal_info}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-4">
          <div className="flex items-center">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'overview' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'history' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
              onClick={() => setActiveTab('history')}
            >
              History
            </button>
          </div>
        </div>

        {activeTab === 'overview' ? (
          <div className="space-y-6">
            {/* Analytics: Health Metrics */}
            {analysis && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Health Metrics</h3>
                  <div className="text-xs text-gray-500">As of {format(parseISO(analysis.analysis_date), 'MMM d, yyyy')} • {analysis.period_days || 7}d</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-gray-100 p-3">
                    <div className="text-xs text-gray-500 mb-1">Average Mood</div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-xl font-semibold text-gray-900">{Math.round((analysis.avg_mood_score || 0) * 100)}%</div>
                      {typeof analysis.mood_trend === 'number' && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${analysis.mood_trend > 0 ? 'bg-green-50 text-green-700 border border-green-200' : analysis.mood_trend < 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-50 text-gray-700 border border-gray-200'}`}>
                          {analysis.mood_trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : analysis.mood_trend < 0 ? <ArrowDownRight className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
                          {analysis.mood_trend > 0 ? '+' : ''}{analysis.mood_trend.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-100 p-3">
                    <div className="text-xs text-gray-500 mb-1">Average Pain Level</div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-xl font-semibold text-gray-900">{Math.round((analysis.avg_pain_level || 0) * 100)}%</div>
                      {typeof analysis.pain_trend === 'number' && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${analysis.pain_trend > 0 ? 'bg-red-50 text-red-700 border border-red-200' : analysis.pain_trend < 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-700 border border-gray-200'}`}>
                          {analysis.pain_trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : analysis.pain_trend < 0 ? <ArrowDownRight className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
                          {analysis.pain_trend > 0 ? '+' : ''}{analysis.pain_trend.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-100 p-3">
                    <div className="text-xs text-gray-500 mb-1">Average Energy Level</div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-xl font-semibold text-gray-900">{Math.round((analysis.avg_energy_level || 0) * 100)}%</div>
                      {typeof analysis.energy_trend === 'number' && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${analysis.energy_trend > 0 ? 'bg-green-50 text-green-700 border border-green-200' : analysis.energy_trend < 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-50 text-gray-700 border border-gray-200'}`}>
                          {analysis.energy_trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : analysis.energy_trend < 0 ? <ArrowDownRight className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
                          {analysis.energy_trend > 0 ? '+' : ''}{analysis.energy_trend.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics: AI Insights */}
            {analysis && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center"><Sparkles className="w-4 h-4 mr-2 text-purple-600" /> AI Insights</h3>
                  <div className="text-xs text-gray-500">Latest weekly analysis</div>
                </div>
                {analysis.ai_narrative && (
                  <p className="text-sm text-gray-700 mb-3">{analysis.ai_narrative}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-gray-900 mb-2">Recommendations</div>
                    <div className="space-y-2">
                      {(analysis.ai_recommendations || []).map((rec: any, idx: number) => (
                        <div key={idx} className="border border-gray-100 rounded-lg p-2">
                          <div className="flex items-start justify-between">
                            <div className="text-sm text-gray-800">{rec.action || String(rec)}</div>
                            {rec.priority && (
                              <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${priorityBadge(rec.priority)}`}>
                                {String(rec.priority).toUpperCase()}
                              </span>
                            )}
                          </div>
                          {rec.category && (
                            <div className="mt-1 text-[11px] text-gray-500">Category: {rec.category}</div>
                          )}
                        </div>
                      ))}
                      {(!analysis.ai_recommendations || analysis.ai_recommendations.length === 0) && (
                        <div className="text-xs text-gray-500">No recommendations</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-900 mb-2 flex items-center"><ShieldAlert className="w-4 h-4 mr-1 text-amber-600" /> Concerns</div>
                    <div className="space-y-2">
                      {(analysis.ai_concerns || []).map((c: any, idx: number) => (
                        <div key={idx} className="flex items-start justify-between border border-gray-100 rounded-lg p-2">
                          <div className="text-sm text-gray-800">{c.issue || String(c)}</div>
                          {c.severity && (
                            <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${severityBadge(c.severity)}`}>
                              {String(c.severity).toUpperCase()}
                            </span>
                          )}
                        </div>
                      ))}
                      {(!analysis.ai_concerns || analysis.ai_concerns.length === 0) && (
                        <div className="text-xs text-gray-500">No concerns</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-900 mb-2">Early warnings</div>
                    <ul className="space-y-2 list-disc list-inside text-sm text-gray-800">
                      {(analysis.ai_early_warnings || []).map((w: any, idx: number) => (
                        <li key={idx}>{String(w)}</li>
                      ))}
                      {(!analysis.ai_early_warnings || analysis.ai_early_warnings.length === 0) && (
                        <div className="text-xs text-gray-500">No early warnings</div>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics: Statistics */}
            {analysis && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center">
                  <div className="p-3 rounded-lg bg-blue-50 text-blue-700"><Activity className="w-5 h-5" /></div>
                  <div className="ml-3">
                    <div className="text-xs text-gray-500">Call completion rate</div>
                    <div className="text-xl font-semibold text-gray-900">{Math.round((analysis.call_completion_rate || 0))}%</div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center">
                  <div className="p-3 rounded-lg bg-red-50 text-red-700"><AlertTriangle className="w-5 h-5" /></div>
                  <div className="ml-3">
                    <div className="text-xs text-gray-500">Total escalations</div>
                    <div className="text-xl font-semibold text-gray-900">{analysis.escalations_count || 0}</div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center">
                  <div className="p-3 rounded-lg bg-gray-50 text-gray-700"><Clock className="w-5 h-5" /></div>
                  <div className="ml-3">
                    <div className="text-xs text-gray-500">Analysis period</div>
                    <div className="text-sm font-medium text-gray-900">{analysis.period_days || 7} days ending {format(parseISO(analysis.analysis_date), 'MMM d, yyyy')}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Legacy overview stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center">
                <div className="p-3 rounded-lg bg-blue-50 text-blue-700"><Phone className="w-5 h-5" /></div>
                <div className="ml-3">
                  <div className="text-xs text-gray-500">Total Calls</div>
                  <div className="text-xl font-semibold text-gray-900">{totals.calls}</div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center">
                <div className="p-3 rounded-lg bg-red-50 text-red-700"><AlertTriangle className="w-5 h-5" /></div>
                <div className="ml-3">
                  <div className="text-xs text-gray-500">Total Escalations</div>
                  <div className="text-xl font-semibold text-gray-900">{totals.escalations}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Mood & Tone Trends</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setAggregation('day')} className={`px-3 py-1 text-sm rounded-lg border ${aggregation === 'day' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>Per day</button>
                <button onClick={() => setAggregation('week')} className={`px-3 py-1 text-sm rounded-lg border ${aggregation === 'week' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>Per week</button>
              </div>
            </div>

            {/* Mood Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-900 mb-2">Mood</div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={moodSeries} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                    <YAxis domain={[0, 1]} ticks={[0, 0.33, 0.66, 1]} tickFormatter={(v) => getValueLabel(v)} width={70} />
                    <Tooltip formatter={(v: any, name: any, props: any) => [props.payload.textLabel, 'Mood']} labelClassName="text-xs" />
                    <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tone Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-900 mb-2">Tone</div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={toneSeries} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                    <YAxis domain={[0, 1]} ticks={[0, 0.33, 0.66, 1]} tickFormatter={(v) => getValueLabel(v)} width={70} />
                    <Tooltip formatter={(v: any, name: any, props: any) => [props.payload.textLabel, 'Tone']} labelClassName="text-xs" />
                    <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="px-0 pt-0 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="px-3 py-2 rounded-t-lg text-sm font-medium bg-white border border-b-0 border-gray-200 text-gray-900">
                  Call History
                </div>
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

            <div className="pt-4">
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
          </>
        )}

        {selectedReport && (
          <CallReportModal
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            onOpenReport={(r) => setSelectedReport(r)}
          />
        )}
      </div>
    </DashboardLayout>
  )
}


