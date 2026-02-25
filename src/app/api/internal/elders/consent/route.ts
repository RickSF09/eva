import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isInternalAdminEmail } from '@/lib/internal-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_BUCKET = 'consent-recordings'

type ConsentDecision = 'granted' | 'refused'

function sanitizeFilename(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120)
}

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

export async function GET(request: NextRequest) {
  const auth = await requireInternalOperator()
  if ('error' in auth) return auth.error

  const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? '20') || 20, 50)

  let query = supabaseAdmin
    .from('elders')
    .select(
      'id, first_name, last_name, phone, consent_status, consent_decision_at, consent_obtained_at, consent_recording_storage_path, consent_recorded_by, consent_notes, user_id, updated_at',
    )
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (q) {
    const safe = q.replace(/[%(),]/g, '').trim()
    if (safe) {
      query = query.or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,phone.ilike.%${safe}%`)
    }
  }

  const { data, error } = await query

  if (error) {
    console.error('Internal consent search failed', error)
    return NextResponse.json({ error: 'Failed to load elders' }, { status: 500 })
  }

  return NextResponse.json({ elders: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireInternalOperator()
  if ('error' in auth) return auth.error

  const operatorEmail = auth.user.email ?? 'unknown'

  let formData: FormData
  try {
    formData = await request.formData()
  } catch (error) {
    console.error('Failed to parse consent form data', error)
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const elderId = String(formData.get('elderId') ?? '').trim()
  const decision = String(formData.get('decision') ?? '').trim() as ConsentDecision
  const notesRaw = String(formData.get('notes') ?? '').trim()
  const file = formData.get('recordingFile')

  if (!elderId) {
    return NextResponse.json({ error: 'elderId is required' }, { status: 400 })
  }

  if (decision !== 'granted' && decision !== 'refused') {
    return NextResponse.json({ error: 'decision must be granted or refused' }, { status: 400 })
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('elders')
    .select(
      'id, first_name, last_name, consent_status, consent_recording_storage_path, consent_pathway',
    )
    .eq('id', elderId)
    .single()

  if (existingError || !existing) {
    console.error('Failed to load elder for consent update', existingError)
    return NextResponse.json({ error: 'Elder not found' }, { status: 404 })
  }

  let uploadedStoragePath: string | null = null
  const bucket = process.env.CONSENT_RECORDINGS_BUCKET || DEFAULT_BUCKET

  if (file instanceof File && file.size > 0) {
    const safeName = sanitizeFilename(file.name || 'consent-recording')
    const storagePath = `${elderId}/${Date.now()}-${safeName}`
    const bytes = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(storagePath, bytes, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

    if (uploadError) {
      console.error('Failed to upload consent recording', uploadError)
      return NextResponse.json(
        { error: `Failed to upload recording to bucket "${bucket}". Check bucket exists and service role access.` },
        { status: 500 },
      )
    }

    uploadedStoragePath = storagePath
  }

  const hasEvidenceAlready = Boolean(existing.consent_recording_storage_path)
  const hasIncomingEvidence = Boolean(uploadedStoragePath)

  if (decision === 'granted' && !hasIncomingEvidence && !hasEvidenceAlready) {
    return NextResponse.json(
      { error: 'Recording file is required when granting consent' },
      { status: 400 },
    )
  }

  const now = new Date().toISOString()
  const nextStoragePath =
    decision === 'granted'
      ? uploadedStoragePath ?? existing.consent_recording_storage_path ?? null
      : uploadedStoragePath ?? null

  const updatePayload = {
    consent_pathway: 'direct_consent',
    consent_status: decision,
    consent_method: 'manual_recorded_call',
    consent_decision_at: now,
    consent_obtained_at: decision === 'granted' ? now : null,
    consent_recording_storage_path: nextStoragePath,
    consent_recorded_by: operatorEmail,
    consent_notes: notesRaw || null,
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('elders')
    .update(updatePayload)
    .eq('id', elderId)
    .select(
      'id, first_name, last_name, phone, consent_status, consent_decision_at, consent_obtained_at, consent_recording_storage_path, consent_recorded_by, consent_notes, updated_at',
    )
    .single()

  if (updateError) {
    console.error('Failed to update elder consent', updateError)
    return NextResponse.json({ error: 'Failed to update consent status' }, { status: 500 })
  }

  return NextResponse.json({ elder: updated })
}
