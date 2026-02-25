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

// Module-level promise to dedup token exchange
let authExchangePromise: Promise<void> | null = null

const AUTH_INIT_TIMEOUT_MS = 8000

async function withTimeout<T>(promise: PromiseLike<T>, label: string, ms = AUTH_INIT_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    }),
  ])
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const hardFallbackTimer = setTimeout(() => {
      if (!active) return
      console.warn('AuthProvider init fallback fired; releasing loading state to avoid infinite spinner')
      setLoading(false)
    }, AUTH_INIT_TIMEOUT_MS + 2000)

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

          const needsExchange = (tokenHash && type === 'recovery') || (access_token && refresh_token) || hasCode

          if (needsExchange) {
            if (!authExchangePromise) {
              authExchangePromise = (async () => {
                try {
                  // New password-reset PKCE flow: verify token_hash to create a session
                  if (tokenHash && type === 'recovery') {
                    const { data, error } = await withTimeout(
                      supabase.auth.verifyOtp({
                        token_hash: tokenHash,
                        type: 'recovery',
                      }),
                      'Supabase verifyOtp(recovery)',
                    )
                    if (error) {
                      console.error('Failed to verify recovery token', error)
                    } else if (data?.session) {
                      window.history.replaceState({}, document.title, url.origin + url.pathname)
                    }
                  } else if (access_token && refresh_token) {
                    await withTimeout(
                      supabase.auth.setSession({ access_token, refresh_token }),
                      'Supabase setSession',
                    )
                    window.history.replaceState({}, document.title, url.origin + url.pathname)
                  } else if (hasCode) {
                    const { error } = await withTimeout(
                      supabase.auth.exchangeCodeForSession(window.location.href),
                      'Supabase exchangeCodeForSession',
                    )
                    if (error) {
                      console.error('Failed to exchange code for session', error)
                    } else {
                      window.history.replaceState({}, document.title, url.origin + url.pathname)
                    }
                  }
                } catch (err) {
                  console.error('Auth exchange error:', err)
                } finally {
                   // Keep the promise set so we don't try again immediately? 
                   // Or clear it? 
                   // If we clear it, a re-mount with same URL (if cleanup failed) might retry.
                   // But we should have cleaned the URL.
                   // Let's clear it after a short delay or just leave it?
                   // Better to clear it if we want to allow future exchanges (e.g. if user navigates away and back with new code).
                   // But for this session/load, it's done.
                   authExchangePromise = null
                }
              })()
            }
            await authExchangePromise
          }
        }

        // Get initial session
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), 'Supabase getSession')
        if (active) {
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('AuthProvider init failed', error)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void init()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      active = false
      clearTimeout(hardFallbackTimer)
      subscription.unsubscribe()
    }
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
