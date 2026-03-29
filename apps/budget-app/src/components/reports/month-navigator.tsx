'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonthYear } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

interface MonthNavigatorProps {
  /** Base path for navigation, e.g. '/reports' */
  basePath: string
  /** Currently displayed year */
  year: number
  /** Currently displayed month (1-12) */
  month: number
}

export function MonthNavigator({ basePath, year, month }: MonthNavigatorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function navigate(direction: -1 | 1) {
    let newMonth = month + direction
    let newYear = year
    if (newMonth < 1) {
      newMonth = 12
      newYear--
    } else if (newMonth > 12) {
      newMonth = 1
      newYear++
    }

    const params = new URLSearchParams(searchParams.toString())
    params.set('year', String(newYear))
    params.set('month', String(newMonth))
    router.push(`${basePath}?${params.toString()}`)
  }

  // Prevent navigating to the future
  const now = new Date()
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1
  const isFutureDisabled = isCurrentMonth

  const displayDate = new Date(year, month - 1, 1)

  const navButton = cn(
    'flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 transition-colors',
    'dark:border-zinc-700'
  )

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => navigate(-1)}
        className={cn(
          navButton,
          'bg-white text-slate-600 hover:bg-slate-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-750'
        )}
        aria-label="前月"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <span className="min-w-[120px] text-center text-sm font-semibold text-slate-900 dark:text-zinc-100">
        {formatMonthYear(displayDate)}
      </span>

      <button
        onClick={() => navigate(1)}
        disabled={isFutureDisabled}
        className={cn(
          navButton,
          isFutureDisabled
            ? 'cursor-not-allowed text-slate-300 dark:text-zinc-600'
            : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-750'
        )}
        aria-label="次月"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
