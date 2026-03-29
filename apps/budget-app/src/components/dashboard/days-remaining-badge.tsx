import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface DaysRemainingBadgeProps {
  /** Days left in the displayed month */
  days: number
  /** Whether the displayed month is the current calendar month */
  isCurrentMonth: boolean
}

export function DaysRemainingBadge({
  days,
  isCurrentMonth,
}: DaysRemainingBadgeProps) {
  if (!isCurrentMonth) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
        過去の月
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        days <= 3
          ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
          : days <= 7
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
      )}
    >
      <Clock className="h-3 w-3" />
      残り{days}日
    </span>
  )
}
