import { SettingsClient } from '@/components/organisms/SettingsClient'

export interface SettingsTemplateProps {
  userEmail: string
}

export function SettingsTemplate({ userEmail }: SettingsTemplateProps) {
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

      <SettingsClient userEmail={userEmail} />
    </div>
  )
}
