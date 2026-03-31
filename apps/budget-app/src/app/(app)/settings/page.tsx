import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsTemplate } from '@/components/templates/SettingsTemplate'

export const metadata = {
  title: '設定 | Budget App',
}

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <SettingsTemplate userEmail={user.email ?? ''} />
}
