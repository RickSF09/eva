'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CalendarDays, CheckCircle2, Clock, RefreshCcw, TriangleAlert, XCircle, Phone, AlertTriangle, Heart } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'

type UpcomingCall = {
  id: string
  scheduled_for: string
  status: string
  call_type: string
  elder: { id: string; name: string }
  schedule?: { id: string; name: string | null }
}

type ExecutedCall = {
  id: string
  completed_at: string | null
  status: string
  call_type: string
  elder: { id: string; name: string }
  schedule?: { id: string; name: string | null }
  post_call_report?: {
    mood_assessment?: string | null
    sentiment_score?: number | null
    duration_seconds?: number | null
    escalation_triggered?: boolean | null
    summary?: string | null
  }
}

interface CallsKanbanProps {
  orgId: string
}

export function CallsKanban({ orgId }: CallsKanbanProps) {
  const [daysForward, setDaysForward] = useState<number>(3)
  const [daysBack, setDaysBack] = useState<number>(3)
  const [loading, setLoading] = useState<boolean>(false)
  const [upcoming, setUpcoming] = useState<UpcomingCall[]>([])
  const [executed, setExecuted] = useState<ExecutedCall[]>([])

  useEffect(() => {
    void fetchData()
  }, [orgId, daysForward, daysBack])

  const startOfDayIso = (d: Date) => {
    const copy = new Date(d)
    copy.setHours(0, 0, 0, 0)
    return copy.toISOString()
  }

  const endOfDayIso = (d: Date) => {
    const copy = new Date(d)
    copy.setHours(23, 59, 59, 999)
    return copy.toISOString()
  }

  const fetchData = async () => {
    if (!orgId) return
    setLoading(true)

    try {
      const now = new Date()
      const startUpcoming = startOfDayIso(now)
      const endUpcoming = endOfDayIso(new Date(now.getTime() + daysForward * 24 * 60 * 60 * 1000))

      // Upcoming: pending calls scheduled in next X days, scoped by elder org
      const { data: upcomingData, error: upcomingErr } = await supabase
        .from('call_executions')
        .select(`
          id,
          scheduled_for,
          status,
          call_type,
          elder_id,
          schedule_id,
          elders!inner ( id, first_name, last_name, org_id ),
          call_schedules ( id, name )
        `)
        .eq('status', 'pending')
        .gte('scheduled_for', startUpcoming)
        .lt('scheduled_for', endUpcoming)
        .eq('elders.org_id', orgId)
        .order('scheduled_for', { ascending: true })

      if (upcomingErr) throw upcomingErr

      const mappedUpcoming: UpcomingCall[] = (upcomingData || []).map((row: any) => ({
        id: row.id,
        scheduled_for: row.scheduled_for,
        status: row.status,
        call_type: row.call_type,
        elder: {
          id: row.elder_id,
          name: `${row.elders?.first_name ?? ''} ${row.elders?.last_name ?? ''}`.trim(),
        },
        schedule: row.call_schedules ? { id: row.call_schedules.id, name: row.call_schedules.name } : undefined,
      }))

      // Executed: completed/failed calls from last X days, scoped by elder org
      const since = startOfDayIso(new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000))
      const { data: executedData, error: executedErr } = await supabase
        .from('call_executions')
        .select(`
          id,
          completed_at,
          status,
          call_type,
          elder_id,
          schedule_id,
          elders!inner ( id, first_name, last_name, org_id ),
          call_schedules ( id, name ),
          post_call_reports (
            mood_assessment,
            sentiment_score,
            duration_seconds,
            escalation_triggered,
            summary
          )
        `)
        .not('completed_at', 'is', null)
        .gte('completed_at', since)
        .eq('elders.org_id', orgId)
        .order('completed_at', { ascending: false })

      if (executedErr) throw executedErr

      const mappedExecuted: ExecutedCall[] = (executedData || []).map((row: any) => ({
        id: row.id,
        completed_at: row.completed_at,
        status: row.status,
        call_type: row.call_type,
        elder: {
          id: row.elder_id,
          name: `${row.elders?.first_name ?? ''} ${row.elders?.last_name ?? ''}`.trim(),
        },
        schedule: row.call_schedules ? { id: row.call_schedules.id, name: row.call_schedules.name } : undefined,
        post_call_report: row.post_call_reports?.[0] ? {
          mood_assessment: row.post_call_reports[0].mood_assessment,
          sentiment_score: row.post_call_reports[0].sentiment_score,
          duration_seconds: row.post_call_reports[0].duration_seconds,
          escalation_triggered: row.post_call_reports[0].escalation_triggered,
          summary: row.post_call_reports[0].summary,
        } : undefined,
      }))

      setUpcoming(mappedUpcoming)
      setExecuted(mappedExecuted)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load kanban data', e)
    } finally {
      setLoading(false)
    }
  }

  const generateDateKeys = (base: Date, count: number, direction: 'forward' | 'back') => {
    const keys: string[] = []
    for (let i = 0; i <= count; i++) {
      const d = new Date(base)
      const offset = (direction === 'forward' ? i : -i) * 24 * 60 * 60 * 1000
      d.setTime(d.getTime() + offset)
      d.setHours(0, 0, 0, 0)
      keys.push(d.toISOString().split('T')[0])
    }
    return keys
  }

  const groupByDate = <T extends { scheduled_for?: string; completed_at?: string | null }>(
    items: T[],
    field: 'scheduled_for' | 'completed_at',
  ) => {
    return items.reduce<Record<string, T[]>>((acc, item) => {
      const raw = (item as any)[field]
      if (!raw) return acc
      const key = new Date(raw).toISOString().split('T')[0]
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, {})
  }

  const upcomingByDay = useMemo(() => groupByDate(upcoming, 'scheduled_for'), [upcoming])
  const executedByDay = useMemo(() => groupByDate(executed, 'completed_at'), [executed])

  const dayKeysUpcoming = useMemo(() => generateDateKeys(new Date(), daysForward, 'forward'), [daysForward])
  const dayKeysExecuted = useMemo(() => generateDateKeys(new Date(), daysBack, 'back'), [daysBack])

  const CallTypeBadge = ({ callType }: { callType: string }) => {
    const normalized = callType.toLowerCase()
    if (normalized === 'scheduled') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
          <Phone className="w-3 h-3" /> Scheduled
        </span>
      )
    }
    if (normalized === 'emergency_contact') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
          <AlertTriangle className="w-3 h-3" /> Emergency
        </span>
      )
    }
    if (normalized === 'escalation_followup') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
          <Heart className="w-3 h-3" /> Follow-up
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
        <Phone className="w-3 h-3" /> {callType}
      </span>
    )
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const normalized = status.toLowerCase()
    if (normalized === 'completed' || normalized === 'success') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
        </span>
      )
    }
    if (normalized === 'failed' || normalized === 'error') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
          <XCircle className="w-3.5 h-3.5" /> Failed
        </span>
      )
    }
    if (normalized === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
          <RefreshCcw className="w-3.5 h-3.5" /> In progress
        </span>
      )
    }
    if (normalized === 'escalated') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
          <TriangleAlert className="w-3.5 h-3.5" /> Escalated
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
        <Clock className="w-3.5 h-3.5" /> {status}
      </span>
    )
  }

  const SegmentedControl = ({
    label,
    value,
    onChange,
  }: {
    label: string
    value: number
    onChange: (n: number) => void
  }) => {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{label}</span>
        <div className="inline-flex rounded-full border border-gray-200 bg-white p-0.5">
          {[1, 3, 7].map((n) => (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                value === n ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {n}d
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 inline-flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-gray-600" /> Calls Kanban
        </h3>
        <div className="flex items-center gap-4">
          <SegmentedControl label="Past" value={daysBack} onChange={setDaysBack} />
          <SegmentedControl label="Next" value={daysForward} onChange={setDaysForward} />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading…</div>
      ) : (
        <div className="space-y-8">
          {/* Recent (past) lanes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Executed (past {daysBack}d)</p>
              <span className="text-xs text-gray-500">{executed.length} items</span>
            </div>
            <div className="overflow-x-auto">
              <div className="grid auto-cols-[minmax(240px,1fr)] grid-flow-col gap-4 min-w-full">
                {dayKeysExecuted.map((key) => (
                  <div key={key} className="bg-gray-50 rounded-lg border border-gray-200 p-3 min-h-[120px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-700">{formatDate(key)}</span>
                      <span className="text-xs text-gray-500">{executedByDay[key]?.length ?? 0}</span>
                    </div>
                    <div className="space-y-2">
                      {(executedByDay[key] || []).map((item) => (
                        <div key={(item as ExecutedCall).id} className="bg-white rounded-lg border border-gray-200 p-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{(item as ExecutedCall).elder.name}</p>
                            <StatusBadge status={(item as ExecutedCall).status} />
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <CallTypeBadge callType={(item as ExecutedCall).call_type} />
                            <span className="text-xs text-gray-600">
                              {(item as ExecutedCall).schedule?.name ?? '—'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mb-1">
                            {formatDateTime((item as ExecutedCall).completed_at || '')}
                          </div>
                          {(item as ExecutedCall).post_call_report && (
                            <div className="space-y-1">
                              {(item as ExecutedCall).post_call_report?.duration_seconds && (
                                <div className="text-xs text-gray-600">
                                  Duration: {Math.round((item as ExecutedCall).post_call_report!.duration_seconds! / 60)}m
                                </div>
                              )}
                              {(item as ExecutedCall).post_call_report?.sentiment_score !== null && (
                                <div className="text-xs text-gray-600">
                                  Mood: {Math.round(((item as ExecutedCall).post_call_report!.sentiment_score! + 1) * 50)}%
                                </div>
                              )}
                              {(item as ExecutedCall).post_call_report?.escalation_triggered && (
                                <div className="text-xs text-red-600 font-medium">
                                  ⚠️ Escalation triggered
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming lanes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Scheduled (next {daysForward}d)</p>
              <span className="text-xs text-gray-500">{upcoming.length} items</span>
            </div>
            <div className="overflow-x-auto">
              <div className="grid auto-cols-[minmax(240px,1fr)] grid-flow-col gap-4 min-w-full">
                {dayKeysUpcoming.map((key) => (
                  <div key={key} className="bg-gray-50 rounded-lg border border-gray-200 p-3 min-h-[120px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-700">{formatDate(key)}</span>
                      <span className="text-xs text-gray-500">{upcomingByDay[key]?.length ?? 0}</span>
                    </div>
                    <div className="space-y-2">
                      {(upcomingByDay[key] || []).map((item) => (
                        <div key={(item as UpcomingCall).id} className="bg-white rounded-lg border border-gray-200 p-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{(item as UpcomingCall).elder.name}</p>
                            <StatusBadge status={(item as UpcomingCall).status} />
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <CallTypeBadge callType={(item as UpcomingCall).call_type} />
                            <span className="text-xs text-gray-600">
                              {(item as UpcomingCall).schedule?.name ?? '—'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDateTime((item as UpcomingCall).scheduled_for)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CallsKanban


