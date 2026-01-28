import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Always redirect to reset-password page
      return NextResponse.redirect(`${origin}/reset-password`)
    } else {
      console.error('Auth code exchange error:', error)
      return NextResponse.redirect(`${origin}/login?error=AuthCodeExchangeError&message=${encodeURIComponent(error.message)}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=NoCodeFound`)
}
