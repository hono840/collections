import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 dark:bg-zinc-800">
        <FileQuestion className="h-10 w-10 text-slate-400 dark:text-zinc-500" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-zinc-100">
        404
      </h1>
      <p className="mt-2 text-lg text-slate-500 dark:text-zinc-400">
        ページが見つかりません
      </p>
      <p className="mt-1 text-sm text-slate-400 dark:text-zinc-500">
        お探しのページは存在しないか、移動した可能性があります。
      </p>
      <Link
        href="/dashboard"
        className="mt-8 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        ダッシュボードへ戻る
      </Link>
    </div>
  )
}
