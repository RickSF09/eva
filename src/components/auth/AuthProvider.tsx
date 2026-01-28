'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        // If redirected from a magic link, set session from hash or exchange code
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          const hasCode = url.searchParams.get('code')
          const tokenHash = url.searchParams.get('token_hash')
          const type = url.searchParams.get('type')
          const hash = url.hash.startsWith('#') ? url.hash.substring(1) : ''
          const params = new URLSearchParams(hash)
          const access_token = params.get('access_token')
          const refresh_token = params.get('refresh_token')

          // New password-reset PKCE flow: verify token_hash to create a session
          if (tokenHash && type === 'recovery') {
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'recovery',
            })
            if (error) {
              console.error('Failed to verify recovery token', error)
            } else if (data?.session) {
              window.history.replaceState({}, document.title, url.origin + url.pathname)
            }
          } else if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token })
            window.history.replaceState({}, document.title, url.origin + url.pathname)
          } else if (hasCode) {
            await supabase.auth.exchangeCodeForSession(window.location.href)
            window.history.replaceState({}, document.title, url.origin + url.pathname)
          }
        }

        // Get initial session
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
      } finally {
        setLoading(false)
      }
    }

    init()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
