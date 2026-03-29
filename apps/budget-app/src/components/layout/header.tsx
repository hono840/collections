'use client'

import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/dashboard': 'ダッシュボード',
  '/transactions': 'トランザクション',
  '/budgets': '予算',
  '/categories': 'カテゴリ',
  '/reports': 'レポート',
  '/settings': '設定',
}

export function Header() {
  const pathname = usePathname()

  // Match the current path to a title, falling back to the path segment
  const title =
    pageTitles[pathname] ??
    pageTitles[
      Object.keys(pageTitles).find((key) => pathname.startsWith(key)) ?? ''
    ] ??
    ''

  if (!title) return null

  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
        {title}
      </h1>
    </header>
  )
}
