// Disable static generation to avoid pre-render errors with useSearchParams
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { Suspense } from 'react'
import ProfileSetupClient from './ProfileSetupClient'

export default function ProfileSetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">Loading…</div>}>
      <ProfileSetupClient />
    </Suspense>
  )
}


