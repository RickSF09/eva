import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

type RequestBody = {
  org_id: string
  email: string
  role?: 'member' | 'admin'
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
    ...init,
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method Not Allowed' }, { status: 405 })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const siteUrl = Deno.env.get('SITE_URL')

  if (!supabaseUrl || !anonKey || !siteUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SITE_URL' }, { status: 500 })
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch (_e) {
    return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { org_id, email, role = 'member' } = body
  if (!org_id || !email) return jsonResponse({ error: 'org_id and email are required' }, { status: 400 })

  // Authenticated supabase client bound to the caller (to check permissions via RLS)
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const admin = createClient(supabaseUrl, serviceRoleKey)

  // Get auth user
  const { data: sessionData, error: sessionError } = await supabase.auth.getUser()
  if (sessionError || !sessionData?.user) return jsonResponse({ error: 'Unauthenticated' }, { status: 401 })

  // Ensure caller is an org admin
  const { data: userRecord, error: userRecordError } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', sessionData.user.id)
    .single()

  if (userRecordError || !userRecord) return jsonResponse({ error: 'User record not found' }, { status: 403 })

  const { data: membership, error: membershipError } = await supabase
    .from('user_organizations')
    .select('role, active')
    .eq('org_id', org_id)
    .eq('user_id', userRecord.id)
    .single()

  if (membershipError || !membership || membership.role !== 'admin' || !membership.active) {
    return jsonResponse({ error: 'Only admins can invite members' }, { status: 403 })
  }

  // Create or refresh invitation
  const token = crypto.randomUUID()
  const inviteLink = `${siteUrl.replace(/\/$/, '')}/invite/${token}`

  // Delete any existing pending invites for this org + email (case-insensitive)
  const normalizedEmail = email.toLowerCase()
  const { error: deleteError } = await supabase
    .from('organization_invitations')
    .delete()
    .eq('org_id', org_id)
    .eq('status', 'pending')
    .eq('email_normalized', normalizedEmail)

  if (deleteError) return jsonResponse({ error: deleteError.message }, { status: 500 })

  // Insert fresh invite
  const { error: insertError } = await supabase
    .from('organization_invitations')
    .insert({
      org_id,
      email,
      role,
      token,
      status: 'pending',
      created_by: userRecord.id,
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })

  if (insertError) return jsonResponse({ error: insertError.message }, { status: 500 })

  // Ensure a user exists; if not, create confirmed user using service role
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  })
  if (created.error && !String(created.error.message || '').includes('already registered')) {
    return jsonResponse({ error: created.error.message }, { status: 500 })
  }

  // Send magic link that signs the user in on click (works even with signups disabled)
  const { error: sendError } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: inviteLink },
  })

  if (sendError) return jsonResponse({ error: sendError.message }, { status: 500 })

  return jsonResponse({ ok: true, inviteLink })
})


