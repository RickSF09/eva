'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'

interface Organization {
  id: string
  name: string
  role: string
  subscription_plan: string
  subscription_status: string
}

export function useOrganizations() {
  const { user } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    fetchOrganizations()
  }, [user])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      setError(null)

      // First get the user record from users table
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id, account_type')
        .eq('auth_user_id', user?.id)
        .single()

      if (userError) {
        console.error('Error fetching user record:', userError)
        throw userError
      }

      if (!userRecord) {
        console.log('No user record found, user may not be set up yet')
        setOrganizations([])
        setCurrentOrg(null)
        return
      }

      if (userRecord.account_type !== 'b2b') {
        setOrganizations([])
        setCurrentOrg(null)
        return
      }

      // Get user's organizations using the correct user_id
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select(`
          role,
          organizations (
            id,
            name,
            subscription_plan,
            subscription_status
          )
        `)
        .eq('user_id', userRecord.id)
        .eq('active', true)

      if (userOrgsError) {
        throw userOrgsError
      }

      const orgs = userOrgs?.map(uo => {
        const org = Array.isArray(uo.organizations) ? uo.organizations[0] : uo.organizations
        if (!org || !org.id || !org.name) return null
        
        return {
          id: org.id,
          name: org.name,
          role: uo.role,
          subscription_plan: org.subscription_plan,
          subscription_status: org.subscription_status,
        }
      }).filter((org): org is Organization => org !== null) || []

      setOrganizations(orgs)

      // Set current org (first one or from localStorage)
      const savedOrgId = localStorage.getItem('currentOrgId')
      const savedOrg = orgs.find(org => org.id === savedOrgId)
      setCurrentOrg(savedOrg || orgs[0] || null)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch organizations')
    } finally {
      setLoading(false)
    }
  }

  const switchOrganization = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId)
    if (org) {
      setCurrentOrg(org)
      localStorage.setItem('currentOrgId', orgId)
    }
  }

  return {
    organizations,
    currentOrg,
    loading,
    error,
    switchOrganization,
    refetch: fetchOrganizations,
  }
}

