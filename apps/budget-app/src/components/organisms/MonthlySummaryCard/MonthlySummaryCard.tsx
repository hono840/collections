import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

export interface MonthlySummaryCardProps {
  totalSpent: number
  totalBudget: number
}

export function MonthlySummaryCard({
  totalSpent,
  totalBudget,
}: MonthlySummaryCardProps) {
  const hasbudget = totalBudget > 0
  const remaining = totalBudget - totalSpent
  const percentage = hasbudget ? Math.round((totalSpent / totalBudget) * 100) : 0

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white shadow-lg">
      {/* Glassmorphism decorative circles */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-sm" />
      <div className="pointer-events-none absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-white/5 blur-sm" />

      <div className="relative">
        <div className="flex items-center gap-2 text-brand-100">
          <TrendingDown className="h-4 w-4" />
          <span className="text-sm font-medium">今月の支出</span>
        </div>
        <p className="mt-2 text-3xl font-bold tabular-nums">
          {formatCurrency(totalSpent)}
        </p>

        {hasbudget && (
          <div className="mt-4 space-y-2">
            {/* Progress bar */}
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  percentage >= 100
                    ? 'bg-red-400'
                    : percentage >= 75
                      ? 'bg-yellow-400'
                      : 'bg-emerald-400'
                )}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-brand-100">
                予算: {formatCurrency(totalBudget)}
              </span>
              <span
                className={cn(
                  'flex items-center gap-1 font-medium',
                  remaining >= 0 ? 'text-emerald-300' : 'text-red-300'
                )}
              >
                {remaining >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {remaining >= 0 ? '残り' : '超過'}{' '}
                {formatCurrency(Math.abs(remaining))}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
