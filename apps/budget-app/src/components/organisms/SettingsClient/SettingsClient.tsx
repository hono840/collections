'use client'

import { useTransition } from 'react'
import {
  Sun,
  User,
  Mail,
  LogOut,
  Database,
  Download,
  Upload,
  Info,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { ThemeToggle } from '@/components/molecules/ThemeToggle'
import { signOut } from '@/app/(app)/settings/actions'

export interface SettingsClientProps {
  userEmail: string
}

export function SettingsClient({ userEmail }: SettingsClientProps) {
  const [isSigningOut, startTransition] = useTransition()

  function handleSignOut() {
    startTransition(async () => {
      await signOut()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Theme section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mb-4 flex items-center gap-2">
          <Sun className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">
            テーマ
          </h2>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            外観モードを選択
          </p>
          <ThemeToggle />
        </div>
      </section>

      {/* Account section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">
            アカウント
          </h2>
        </div>

        <div className="space-y-4">
          {/* Email (read-only) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300">
              メールアドレス
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-700/50">
              <Mail className="h-4 w-4 shrink-0 text-slate-400 dark:text-zinc-500" />
              <span className="truncate text-sm text-slate-600 dark:text-zinc-300">
                {userEmail}
              </span>
            </div>
          </div>

          {/* Sign out button */}
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
          >
            {isSigningOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            ログアウト
          </button>
        </div>
      </section>

      {/* Data section (placeholder) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mb-4 flex items-center gap-2">
          <Database className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">
            データ管理
          </h2>
        </div>

        <div className="space-y-3">
          <button
            disabled
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left text-sm text-slate-400 dark:border-zinc-700 dark:text-zinc-500"
          >
            <Download className="h-4 w-4 shrink-0" />
            <div>
              <span className="font-medium">データをエクスポート</span>
              <span className="ml-2 text-xs">(近日公開)</span>
            </div>
          </button>
          <button
            disabled
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left text-sm text-slate-400 dark:border-zinc-700 dark:text-zinc-500"
          >
            <Upload className="h-4 w-4 shrink-0" />
            <div>
              <span className="font-medium">データをインポート</span>
              <span className="ml-2 text-xs">(近日公開)</span>
            </div>
          </button>
        </div>
      </section>

      {/* About section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mb-4 flex items-center gap-2">
          <Info className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">
            アプリについて
          </h2>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-zinc-400">バージョン</span>
            <span className="font-medium tabular-nums text-slate-900 dark:text-zinc-100">
              0.1.0
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-zinc-400">フレームワーク</span>
            <span className="font-medium text-slate-900 dark:text-zinc-100">
              Next.js + Supabase
            </span>
          </div>
          <a
            href="https://github.com/hiro/budget-app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-500 dark:hover:text-brand-400"
          >
            <ExternalLink className="h-4 w-4" />
            ソースコード
          </a>
        </div>
      </section>
    </div>
  )
}
