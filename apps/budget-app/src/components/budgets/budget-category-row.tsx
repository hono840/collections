'use client'

import type { Category } from '@/types/app'
import { CategoryIcon } from '@/components/categories/category-icon'

interface BudgetCategoryRowProps {
  category: Category
  amount: number
  onChange: (amount: number) => void
}

export function BudgetCategoryRow({
  category,
  amount,
  onChange,
}: BudgetCategoryRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:border-slate-300 dark:border-zinc-700 dark:hover:border-zinc-600">
      {/* Icon */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${category.color}15` }}
      >
        <CategoryIcon
          name={category.icon}
          color={category.color}
          size={18}
        />
      </div>

      {/* Category name */}
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-zinc-200">
        {category.name}
      </span>

      {/* Amount input */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-zinc-500">
          ¥
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={amount || ''}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, '')
            onChange(raw ? parseInt(raw, 10) : 0)
          }}
          placeholder="0"
          className="w-32 rounded-lg border border-slate-200 bg-white py-2 pl-7 pr-3 text-right text-sm font-semibold tabular-nums text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
        />
      </div>
    </div>
  )
}
