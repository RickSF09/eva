'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Users, 
  Calendar, 
  Phone, 
  ActivitySquare,
  Settings, 
  LogOut,
  ChevronDown,
  Building2
} from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useOrganizations } from '@/hooks/useOrganizations'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/b2b/dashboard', icon: Home },
  { name: 'Monitoring', href: '/b2b/monitoring', icon: ActivitySquare },
  { name: 'Clients', href: '/b2b/elders', icon: Users },
  { name: 'Schedules', href: '/b2b/schedules', icon: Calendar },
  { name: 'Emergency Contacts', href: '/b2b/emergency-contacts', icon: Users },
  { name: 'Settings', href: '/b2b/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const { organizations, currentOrg, switchOrganization } = useOrganizations()
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 h-screen">
      {/* Logo */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <span className="ml-3 text-xl font-semibold text-gray-900">Eva Cares</span>
        </div>
      </div>

      {/* Organization Selector */}
      {currentOrg && (
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="relative">
            <button
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <Building2 className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-900 truncate">{currentOrg.name}</span>
              </div>
              <ChevronDown className={cn(
                "w-4 h-4 text-gray-500 transition-transform",
                orgDropdownOpen && "rotate-180"
              )} />
            </button>

            {orgDropdownOpen && organizations.length > 1 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      switchOrganization(org.id)
                      setOrgDropdownOpen(false)
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg",
                      org.id === currentOrg.id && "bg-blue-50 text-blue-700"
                    )}
                  >
                    <div className="flex items-center">
                      <Building2 className="w-4 h-4 mr-2" />
                      <span className="truncate">{org.name}</span>
                      {org.role === 'admin' && (
                        <span className="ml-auto text-xs text-gray-500">Admin</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 mr-3",
                isActive ? "text-blue-700" : "text-gray-500"
              )} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Sign Out */}
      <div className="px-4 py-4 border-t border-gray-200">
        <button
          onClick={signOut}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3 text-gray-500" />
          Sign out
        </button>
      </div>
    </div>
  )
}

