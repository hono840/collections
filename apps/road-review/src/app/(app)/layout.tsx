import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/organisms/AppHeader'
import { SafetyNoticeDialog } from '@/components/organisms/SafetyNoticeDialog'
import { AppShellTemplate } from '@/components/templates/AppShellTemplate'
import { getUserSettings } from '@/features/settings/queries'

export default async function SignedInLayout({ children }: { children: ReactNode }) {
  // proxy.ts already redirects signed-out requests; this is the server-side backstop.
  const settings = await getUserSettings()
  if (!settings) redirect('/login')

  return (
    <AppShellTemplate
      header={<AppHeader />}
      overlay={<SafetyNoticeDialog acknowledged={settings.safetyNoticeAcknowledgedAt !== null} />}
    >
      {children}
    </AppShellTemplate>
  )
}
