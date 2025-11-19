'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  User,
  Settings,
  LogOut,
  Heart
} from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const baseNavigation = [
  { name: 'Home', href: '/app/home', icon: Home },
  { name: 'Profile', href: '/app/elder', icon: User },
  { name: 'Settings', href: '/app/settings', icon: Settings },
]

export function B2CSidebar() {
  const pathname = usePathname()
  const { signOut, user } = useAuth()
  const [elderFirstName, setElderFirstName] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    let active = true

    const fetchElderName = async () => {
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()

        if (!active || !profile) return

        const { data: elder } = await supabase
          .from('elders')
          .select('first_name')
          .eq('user_id', profile.id)
          .single()

        if (!active) return

        if (elder?.first_name) {
          setElderFirstName(elder.first_name.trim())
        } else {
          setElderFirstName(null)
        }
      } catch (error) {
        console.error('Failed to fetch elder name:', error)
        setElderFirstName(null)
      }
    }

    fetchElderName()

    return () => {
      active = false
    }
  }, [user])

  // Build navigation with dynamic name
  const navigation = baseNavigation.map((item) => {
    if (item.href === '/app/elder') {
      return {
        ...item,
        name: elderFirstName ? `${elderFirstName}'s Profile` : 'Profile'
      }
    }
    return item
  })

  return (
    <div className="flex flex-col w-64 bg-white border-r border-slate-200 h-screen">
      {/* Logo */}
      <div className="flex items-center px-6 py-4 border-b border-slate-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <span className="ml-3 text-xl font-semibold text-slate-900">Eva Cares</span>
        </div>
      </div>

      {/* Brand Tagline */}
      <div className="px-6 py-3 border-b border-slate-200">
        <p className="text-sm text-slate-500">Peace of mind for families</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 mr-3",
                isActive ? "text-slate-900" : "text-slate-500"
              )} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Sign Out */}
      <div className="px-4 py-4 border-t border-slate-200">
        <button
          onClick={signOut}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3 text-slate-500" />
          Sign out
        </button>
      </div>
    </div>
  )
}
