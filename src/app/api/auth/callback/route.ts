import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Forward to the next path
      // We clean up the URL by not including the code
      return NextResponse.redirect(`${origin}${next}`)
    } else {
        console.error('Auth code exchange error:', error)
    }
  }

  // Return the user to an error page with instructions
  // For now, redirect to login with error param
  return NextResponse.redirect(`${origin}/login?error=AuthCodeError`)
}
