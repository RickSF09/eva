import { NextRequest, NextResponse } from 'next/server'
import { isInternalAdminEmail } from '@/lib/internal-access'
import { createServerSupabase } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeNextPath(rawValue: string | null | undefined): string {
  const value = (rawValue ?? '').trim()
  if (!value) return '/'
  if (!value.startsWith('/')) return '/'
  if (value.startsWith('//')) return '/'
  return value
}

function getAppOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configured) {
    return configured.replace(/\/+$/, '')
  }

  return request.nextUrl.origin
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

async function parseBody(request: NextRequest): Promise<{ email: string; next: string }> {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const payload = await request.json().catch(() => null)
    const email = String((payload as { email?: string } | null)?.email ?? '')
    const next = String((payload as { next?: string } | null)?.next ?? '')
    return { email, next }
  }

  const formData = await request.formData().catch(() => null)
  const email = String(formData?.get('email') ?? '')
  const next = String(formData?.get('next') ?? '')
  return { email, next }
}

export async function POST(request: NextRequest) {
  const auth = await requireInternalOperator()
  if ('error' in auth) return auth.error

  const body = await parseBody(request)
  const email = body.email.trim().toLowerCase()
  const nextPath = normalizeNextPath(body.next)

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'Enter a valid user email address.' }, { status: 400 })
  }

  const { data: userProfile, error: userLookupError } = await supabaseAdmin
    .from('users')
    .select('auth_user_id, email, first_name, last_name')
    .ilike('email', email)
    .maybeSingle()

  if (userLookupError) {
    console.error('Internal impersonation user lookup failed', userLookupError)
    return NextResponse.json({ error: 'Failed to look up user profile.' }, { status: 500 })
  }

  if (!userProfile) {
    return NextResponse.json({ error: 'No app user found for this email.' }, { status: 404 })
  }

  if (!userProfile.auth_user_id) {
    return NextResponse.json({ error: 'User exists but has no linked auth account.' }, { status: 400 })
  }

  const redirectTo = `${getAppOrigin(request)}${nextPath}`
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: userProfile.email,
    options: {
      redirectTo,
    },
  })

  if (linkError) {
    console.error('Internal impersonation link generation failed', linkError)
    return NextResponse.json(
      { error: linkError.message || 'Failed to create impersonation link.' },
      { status: 400 },
    )
  }

  const actionLink = linkData.properties?.action_link
  if (!actionLink) {
    return NextResponse.json({ error: 'Supabase did not return an action link.' }, { status: 500 })
  }

  console.info('Internal impersonation started', {
    operatorEmail: auth.user.email,
    targetEmail: userProfile.email,
    targetAuthUserId: userProfile.auth_user_id,
    redirectTo,
  })

  return NextResponse.json({
    url: actionLink,
    target: {
      email: userProfile.email,
      name: [userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ').trim(),
    },
  })
}
