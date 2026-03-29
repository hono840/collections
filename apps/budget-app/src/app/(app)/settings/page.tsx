import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsClient } from '@/components/settings/settings-client'

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
          設定
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          アプリの設定とアカウント情報
        </p>
      </div>

      <SettingsClient userEmail={user.email ?? ''} />
    </div>
  )
}
