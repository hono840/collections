import type { ReactNode } from 'react'
import { AppHeader } from '@/components/organisms/AppHeader'
import { AppShellTemplate } from '@/components/templates/AppShellTemplate'

/**
 * App area layout (static). No account and no server: data lives on the device.
 * The repository provider and the first-run guide arrive in stage 12.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShellTemplate header={<AppHeader />}>{children}</AppShellTemplate>
}
