'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/format'
import { calculateBudgetProgress, type BudgetStatus } from '@/lib/utils/budget'
import { CategoryIcon } from '@/components/categories/category-icon'

interface CategoryBudgetItemProps {
  categoryId: string
  categoryName: string
  categoryIcon: string
  categoryColor: string
  spent: number
  budget: number
}

const statusColors: Record<BudgetStatus, string> = {
  safe: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  none: 'bg-slate-300 dark:bg-zinc-600',
}

const statusBgColors: Record<BudgetStatus, string> = {
  safe: 'bg-emerald-100 dark:bg-emerald-500/10',
  warning: 'bg-amber-100 dark:bg-amber-500/10',
  danger: 'bg-red-100 dark:bg-red-500/10',
  none: 'bg-slate-100 dark:bg-zinc-800',
}

export function CategoryBudgetItem({
  categoryId,
  categoryName,
  categoryIcon,
  categoryColor,
  spent,
  budget,
}: CategoryBudgetItemProps) {
  const router = useRouter()
  const { percentage, status } = calculateBudgetProgress(spent, budget)
  const hasBudget = budget > 0

  return (
    <button
      type="button"
      onClick={() => router.push(`/transactions?category=${categoryId}`)}
      className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/50"
    >
      {/* Category icon */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${categoryColor}15` }}
      >
        <CategoryIcon name={categoryIcon} color={categoryColor} size={18} />
      </div>

      {/* Name + progress */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="truncate text-sm font-medium text-slate-700 dark:text-zinc-200">
            {categoryName}
          </span>
          <span className="ml-2 shrink-0 text-xs tabular-nums text-slate-500 dark:text-zinc-400">
            {formatCurrency(spent)}
            {hasBudget && (
              <span className="text-slate-400 dark:text-zinc-500">
                {' '}
                / {formatCurrency(budget)}
              </span>
            )}
          </span>
        </div>

        {/* Progress bar */}
        <div
          className={cn(
            'h-2 overflow-hidden rounded-full',
            statusBgColors[status]
          )}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              statusColors[status]
            )}
            style={{ width: `${Math.min(hasBudget ? percentage : 0, 100)}%` }}
          />
        </div>

        {hasBudget && (
          <div className="mt-0.5 text-right">
            <span
              className={cn(
                'text-[10px] font-medium tabular-nums',
                status === 'danger'
                  ? 'text-red-500'
                  : status === 'warning'
                    ? 'text-amber-500'
                    : 'text-slate-400 dark:text-zinc-500'
              )}
            >
              {percentage}%
            </span>
          </div>
        )}
      </div>
    </button>
  )
}
