'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonthYear } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

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

export function MonthNavigator() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const monthParam = searchParams.get('month')
  const current = parseMonth(monthParam)
  const now = new Date()
  const isCurrentMonth = isSameMonth(current, now)

  function navigate(offset: number) {
    const next = new Date(current.getFullYear(), current.getMonth() + offset, 1)
    const param = formatMonthParam(next)
    // If navigating to the current calendar month, remove the param
    if (isSameMonth(next, now)) {
      router.push('?')
    } else {
      router.push(`?month=${param}`)
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
        {formatMonthYear(current)}
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
