import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isInternalAdminEmail } from '@/lib/internal-access'
import type {
  DemoCallEmailSentFilter,
  DemoCallHasAudioFilter,
  DemoCallRangeFilter,
  DemoCallReviewItem,
  DemoCallsResponse,
} from '@/types/internal-demo-calls'
import type { Database } from '@/types/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type DemoCallRow = Database['public']['Tables']['demo_calls']['Row']
type DemoLeadRow = Database['public']['Tables']['demo_leads']['Row']
type DemoLeadLookup = Pick<DemoLeadRow, 'id' | 'name' | 'email'>

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

const VALID_HAS_AUDIO: DemoCallHasAudioFilter[] = ['yes', 'no', 'all']
const VALID_EMAIL_SENT: DemoCallEmailSentFilter[] = ['sent', 'unsent', 'all']
const VALID_RANGE: DemoCallRangeFilter[] = ['7d', '30d', 'all']

async function requireInternalOperator() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (!isInternalAdminEmail(user.email)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user }
}

function parseHasAudio(value: string | null): DemoCallHasAudioFilter {
  if (!value) return 'yes'
  const normalized = value.toLowerCase()
  return VALID_HAS_AUDIO.includes(normalized as DemoCallHasAudioFilter)
    ? (normalized as DemoCallHasAudioFilter)
    : 'yes'
}

function parseEmailSent(value: string | null): DemoCallEmailSentFilter {
  if (!value) return 'all'
  const normalized = value.toLowerCase()
  return VALID_EMAIL_SENT.includes(normalized as DemoCallEmailSentFilter)
    ? (normalized as DemoCallEmailSentFilter)
    : 'all'
}

function parseRange(value: string | null): DemoCallRangeFilter {
  if (!value) return '30d'
  const normalized = value.toLowerCase()
  return VALID_RANGE.includes(normalized as DemoCallRangeFilter)
    ? (normalized as DemoCallRangeFilter)
    : '30d'
}

function parseLimit(value: string | null): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT
  if (parsed <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(parsed), MAX_LIMIT)
}

function parseOffset(value: string | null): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  if (parsed < 0) return 0
  return Math.floor(parsed)
}

function rangeStartIso(range: DemoCallRangeFilter): string | null {
  if (range === 'all') return null

  const now = new Date()
  const days = range === '7d' ? 7 : 30
  now.setUTCDate(now.getUTCDate() - days)
  return now.toISOString()
}

function readTranscriptPreview(transcript: DemoCallRow['transcript']): string {
  if (!transcript) return ''

  let data: unknown = transcript
  if (typeof transcript === 'string') {
    try {
      data = JSON.parse(transcript)
    } catch {
      return ''
    }
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) return ''

  const linesRaw = (data as { lines?: unknown }).lines
  if (!Array.isArray(linesRaw) || linesRaw.length === 0) return ''

  const parts = linesRaw
    .map((line) => {
      if (!line || typeof line !== 'object') return ''
      const text = (line as { text?: unknown }).text
      return typeof text === 'string' ? text.trim() : ''
    })
    .filter(Boolean)
    .slice(0, 2)

  return parts.join(' ').trim()
}

function normalizeItems(rows: DemoCallRow[], leadMap: Map<string, DemoLeadLookup>): DemoCallReviewItem[] {
  return rows.map((row) => {
    const lead = row.lead_id ? leadMap.get(row.lead_id) : null

    return {
      id: row.id,
      sessionId: row.session_id,
      createdAt: row.created_at,
      startedAt: row.started_at,
      audioUrl: row.audio_url,
      hasAudio: Boolean(row.audio_url),
      leadEmail: lead?.email ?? null,
      leadName: lead?.name ?? null,
      emailSent: Boolean(row.email_sent),
      totalTokens: row.total_tokens,
      totalCostUsd: row.total_cost_usd,
      transcriptPreview: readTranscriptPreview(row.transcript),
    }
  })
}

export async function GET(request: NextRequest) {
  const auth = await requireInternalOperator()
  if ('error' in auth) return auth.error

  const hasAudio = parseHasAudio(request.nextUrl.searchParams.get('hasAudio'))
  const emailSent = parseEmailSent(request.nextUrl.searchParams.get('emailSent'))
  const range = parseRange(request.nextUrl.searchParams.get('range'))
  const limit = parseLimit(request.nextUrl.searchParams.get('limit'))
  const offset = parseOffset(request.nextUrl.searchParams.get('offset'))

  let countQuery = supabaseAdmin.from('demo_calls').select('*', { count: 'exact', head: true })
  if (hasAudio === 'yes') {
    countQuery = countQuery.not('audio_url', 'is', null)
  } else if (hasAudio === 'no') {
    countQuery = countQuery.is('audio_url', null)
  }
  if (emailSent === 'sent') {
    countQuery = countQuery.eq('email_sent', true)
  } else if (emailSent === 'unsent') {
    countQuery = countQuery.eq('email_sent', false)
  }
  const rangeStart = rangeStartIso(range)
  if (rangeStart) {
    countQuery = countQuery.gte('created_at', rangeStart)
  }

  const { count, error: countError } = await countQuery
  if (countError) {
    console.error('Failed to count demo calls', countError)
    return NextResponse.json({ error: 'Failed to load demo calls' }, { status: 500 })
  }

  let callsQuery = supabaseAdmin
    .from('demo_calls')
    .select('id, lead_id, session_id, created_at, started_at, audio_url, email_sent, total_tokens, total_cost_usd, transcript')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (hasAudio === 'yes') {
    callsQuery = callsQuery.not('audio_url', 'is', null)
  } else if (hasAudio === 'no') {
    callsQuery = callsQuery.is('audio_url', null)
  }
  if (emailSent === 'sent') {
    callsQuery = callsQuery.eq('email_sent', true)
  } else if (emailSent === 'unsent') {
    callsQuery = callsQuery.eq('email_sent', false)
  }
  if (rangeStart) {
    callsQuery = callsQuery.gte('created_at', rangeStart)
  }

  const { data: rows, error: callsError } = await callsQuery
  if (callsError) {
    console.error('Failed to query demo calls', callsError)
    return NextResponse.json({ error: 'Failed to load demo calls' }, { status: 500 })
  }

  const leadIds = Array.from(
    new Set(
      (rows ?? [])
        .map((row) => row.lead_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    ),
  )

  const leadMap = new Map<string, DemoLeadLookup>()
  if (leadIds.length > 0) {
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('demo_leads')
      .select('id, name, email')
      .in('id', leadIds)

    if (leadsError) {
      console.error('Failed to query demo leads', leadsError)
      return NextResponse.json({ error: 'Failed to load demo leads' }, { status: 500 })
    }

    for (const lead of leads ?? []) {
      leadMap.set(lead.id, lead)
    }
  }

  const response: DemoCallsResponse = {
    items: normalizeItems((rows ?? []) as DemoCallRow[], leadMap),
    total: count ?? 0,
    limit,
    offset,
  }

  return NextResponse.json(response)
}
