'use client'

import { AlertTriangle } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-500/10">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
        エラーが発生しました
      </h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-zinc-400">
        ダッシュボードの読み込み中に問題が発生しました。もう一度お試しください。
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        再試行
      </button>
    </div>
  )
}
