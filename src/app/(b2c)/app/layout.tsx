import { ReactNode } from 'react'
import { B2CDashboardLayout } from '@/components/layout/B2CDashboardLayout'

// Client-side gating (AuthProvider + MFA check) is handled inside B2CDashboardLayout.
// This avoids mutating cookies in a server component, which Next 15 disallows.
export default function B2CLayout({
  children,
}: {
  children: ReactNode
}) {
  return <B2CDashboardLayout>{children}</B2CDashboardLayout>
}

