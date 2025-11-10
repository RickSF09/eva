'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useOrganizations } from '@/hooks/useOrganizations'
import { supabase } from '@/lib/supabase'
import { ElderMonitoringCard } from '@/components/elders/ElderMonitoringCard'
import { WeeklyCallStats } from '@/lib/health'
import { Search, Filter } from 'lucide-react'

export default function MonitoringPage() {
  const router = useRouter()
  const { currentOrg } = useOrganizations()
  const [elders, setElders] = useState<any[]>([])
  const [reportsByElder, setReportsByElder] = useState<Record<string, any[]>>({})
  const [escalationsByElder, setEscalationsByElder] = useState<Record<string, number>>({})
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'green' | 'yellow' | 'red'>('all')

  useEffect(() => {
    if (currentOrg) {
      fetchElders()
    }
  }, [currentOrg])

  const fetchElders = async () => {
    try {
      const { data, error } = await supabase
        .from('elders')
        .select('*')
        .eq('org_id', currentOrg!.id)
        .eq('active', true)
        .order('first_name')
      if (error) throw error
      setElders(data || [])

      const elderIds = (data || []).map(e => e.id)
      if (!elderIds.length) {
        setReportsByElder({})
        setEscalationsByElder({})
        return
      }

      // fetch last 7d reports per elder
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: reports, error: reportsErr } = await supabase
        .from('post_call_reports')
        .select(`
          *,
          call_executions!inner(
            call_type
          )
        `)
        .in('elder_id', elderIds)
        .gte('call_started_at', since)
        .order('call_started_at', { ascending: false })
      if (reportsErr) throw reportsErr

      const byElder: Record<string, any[]> = {}
      for (const r of reports || []) {
        byElder[r.elder_id] = byElder[r.elder_id] || []
        byElder[r.elder_id].push(r)
      }
      setReportsByElder(byElder)

      const { data: escalations, error: escErr } = await supabase
        .from('escalation_incidents')
        .select('elder_id')
        .in('elder_id', elderIds)
        .gte('created_at', since)
      if (escErr) throw escErr

      const escByElder: Record<string, number> = {}
      for (const row of escalations || []) {
        escByElder[row.elder_id] = (escByElder[row.elder_id] || 0) + 1
      }
      setEscalationsByElder(escByElder)
    } catch (err) {
      console.error('Monitoring fetch error:', err)
      setReportsByElder({})
      setEscalationsByElder({})
    }
  }

  const computeStats = (elderId: string): WeeklyCallStats => {
    const reports = reportsByElder[elderId] || []
    const total = reports.length
    const completed = reports.filter((r: any) => {
      const status = (r.call_status || '').toLowerCase()
      const isCompletedStatus = ['completed', 'success', 'succeeded', 'completed_successfully'].includes(status)
      return isCompletedStatus || !!r.call_ended_at
    }).length
    const sentiments = reports.map((r: any) => r.sentiment_score).filter(Boolean) as number[]
    const averageSentiment = sentiments.length ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length : null
    return {
      completedCount: completed,
      totalCount: total,
      completionRate: total ? completed / total : 0,
      averageSentiment,
      escalations: escalationsByElder[elderId] || 0,
    }
  }

  const lastCallFor = (elderId: string) => {
    const reports = (reportsByElder[elderId] || []).slice().sort((a, b) => (a.call_started_at < b.call_started_at ? 1 : -1))
    return reports[0] || null
  }

  const filtered = useMemo(() => {
    return elders.filter(e => {
      const name = `${e.first_name} ${e.last_name}`.toLowerCase()
      const matches = name.includes(query.toLowerCase())
      if (!matches) return false
      if (filter === 'all') return true
      // simple evaluate status using computeStats
      const stats = computeStats(e.id)
      const status = ((): 'green' | 'yellow' | 'red' => {
        // replicate compute logic without import to avoid expensive recompute
        const avg = stats.averageSentiment ?? 0
        const comp = stats.completionRate
        if (stats.escalations > 0 || avg <= 0.2 || comp < 0.4) return 'red'
        if (avg <= 0.5 || comp < 0.6) return 'yellow'
        return 'green'
      })()
      return status === filter
    })
  }, [elders, query, filter, reportsByElder, escalationsByElder])

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Client Activity Monitoring</h1>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search clients" className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <select value={filter} onChange={(e)=>setFilter(e.target.value as any)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="all">All</option>
              <option value="green">Green</option>
              <option value="yellow">Yellow</option>
              <option value="red">Red</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((elder) => (
            <ElderMonitoringCard
              key={elder.id}
              elder={elder}
              stats={computeStats(elder.id)}
              lastCall={lastCallFor(elder.id)}
              onOpenDetail={(id) => router.push(`/b2b/elders/${id}?from=monitoring`)}
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}


