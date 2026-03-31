'use client'

import type { TransactionWithCategory } from '@/types/app'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

export interface TransactionRowProps {
  transaction: TransactionWithCategory
  onClick: (transaction: TransactionWithCategory) => void
}

export function TransactionRow({ transaction, onClick }: TransactionRowProps) {
  const isIncome = transaction.type === 'income'
  const categoryColor = transaction.categories?.color ?? '#64748b'

  return (
    <button
      type="button"
      onClick={() => onClick(transaction)}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border-l-4 bg-white px-4 py-3 text-left transition-colors',
        'hover:bg-slate-50 active:bg-slate-100',
        'dark:bg-zinc-800 dark:hover:bg-zinc-750 dark:active:bg-zinc-700'
      )}
      style={{ borderLeftColor: categoryColor }}
    >
      {/* Category icon placeholder + name */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium text-slate-900 dark:text-zinc-100">
          {transaction.categories?.name ?? '未分類'}
        </span>
        {transaction.note && (
          <span className="truncate text-xs text-slate-500 dark:text-zinc-400">
            {transaction.note}
          </span>
        )}
      </div>

      {/* Amount */}
      <span
        className={cn(
          'shrink-0 text-sm font-semibold tabular-nums',
          isIncome
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-slate-900 dark:text-zinc-100'
        )}
      >
        {isIncome ? '+' : '-'}
        {formatCurrency(transaction.amount)}
      </span>
    </button>
  )
}
