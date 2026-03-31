'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonthYear } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

export interface MonthNavigatorProps {
  /** ナビゲーションのベースパス（デフォルト: 現在のパス名） */
  basePath?: string
  /** 年の上書き（デフォルト: URLの検索パラメータから読み取り） */
  year?: number
  /** 月 1-12 の上書き（デフォルト: URLの検索パラメータから読み取り） */
  month?: number
}

function parseMonth(monthStr: string | null): Date {
  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
    const [year, month] = monthStr.split('-').map(Number)
    return new Date(year, month - 1, 1)
  }
  return new Date()
}

function formatMonthParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function MonthNavigator({ basePath, year, month }: MonthNavigatorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // props が渡された場合はそれを使い、なければ URL パラメータから読み取る
  const hasExplicitProps = year !== undefined && month !== undefined
  const effectivePath = basePath ?? pathname

  let currentYear: number
  let currentMonth: number

  if (hasExplicitProps) {
    currentYear = year
    currentMonth = month
  } else {
    const monthParam = searchParams.get('month')
    const parsed = parseMonth(monthParam)
    currentYear = parsed.getFullYear()
    currentMonth = parsed.getMonth() + 1
  }

  const displayDate = new Date(currentYear, currentMonth - 1, 1)
  const now = new Date()
  const isCurrentMonth =
    currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1

  function navigate(direction: -1 | 1) {
    let newMonth = currentMonth + direction
    let newYear = currentYear
    if (newMonth < 1) {
      newMonth = 12
      newYear--
    } else if (newMonth > 12) {
      newMonth = 1
      newYear++
    }

    if (hasExplicitProps) {
      // year/month パラメータを使うパターン（reports など）
      const params = new URLSearchParams(searchParams.toString())
      params.set('year', String(newYear))
      params.set('month', String(newMonth))
      router.push(`${effectivePath}?${params.toString()}`)
    } else {
      // month パラメータを使うパターン（dashboard など）
      const next = new Date(newYear, newMonth - 1, 1)
      if (isSameMonth(next, now)) {
        router.push(effectivePath === pathname ? '?' : effectivePath)
      } else {
        router.push(`${effectivePath}?month=${formatMonthParam(next)}`)
      }
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigate(-1)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
        aria-label="前月"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <span className="min-w-[7rem] text-center text-sm font-semibold text-slate-700 dark:text-zinc-200">
        {formatMonthYear(displayDate)}
      </span>

      <button
        onClick={() => navigate(1)}
        disabled={isCurrentMonth}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
          isCurrentMonth
            ? 'cursor-not-allowed text-slate-300 dark:text-zinc-600'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200'
        )}
        aria-label="翌月"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}
