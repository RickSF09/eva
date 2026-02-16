import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const { email, redirectTo } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Use supabaseAdmin to send the reset email. 
    // This bypasses the client-side PKCE challenge generation, allowing the link to work across devices.
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || undefined,
    })

    if (error) {
      console.error('Error sending reset email:', error)
      const errorWithMeta = error as { status?: number; code?: string }
      const status = typeof errorWithMeta.status === 'number' ? errorWithMeta.status : 400
      return NextResponse.json(
        { error: error.message, code: errorWithMeta.code },
        { status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Internal error in request-reset:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
