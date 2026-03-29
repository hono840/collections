'use client'

import { useState, useCallback } from 'react'
import type { Category } from '@/types/app'
import { BudgetCategoryRow } from '@/components/budgets/budget-category-row'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { useToast } from '@/components/ui/toast'
import { upsertBudget } from '@/app/(app)/budgets/actions'
import { formatCurrency } from '@/lib/utils/format'
import { Wallet } from 'lucide-react'

interface BudgetFormProps {
  categories: Category[]
  budgetMap: Record<string, number>
  currentMonth: string
}

export function BudgetForm({
  categories,
  budgetMap,
  currentMonth,
}: BudgetFormProps) {
  const { toast } = useToast()
  const [localBudgets, setLocalBudgets] =
    useState<Record<string, number>>(budgetMap)

  const saveBudget = useCallback(
    async (categoryId: string, amount: number) => {
      const formData = new FormData()
      formData.set('categoryId', categoryId)
      formData.set('amount', String(amount))
      formData.set('month', currentMonth)

      const result = await upsertBudget(formData)
      if (result.success) {
        toast('予算を保存しました')
      } else {
        toast(result.error, 'error')
      }
    },
    [currentMonth, toast]
  )

  const debouncedSave = useDebounce(saveBudget, 1000)

  function handleChange(categoryId: string, amount: number) {
    setLocalBudgets((prev) => ({ ...prev, [categoryId]: amount }))
    debouncedSave(categoryId, amount)
  }

  const totalBudget = Object.values(localBudgets).reduce(
    (sum, v) => sum + (v || 0),
    0
  )

  return (
    <div>
      {/* Live total */}
      <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-zinc-700">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400">
          <Wallet className="h-4 w-4" />
          合計予算
        </div>
        <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-zinc-100">
          {formatCurrency(totalBudget)}
        </span>
      </div>

      {/* Category rows */}
      <div className="flex flex-col gap-2">
        {categories.map((cat) => (
          <BudgetCategoryRow
            key={cat.id}
            category={cat}
            amount={localBudgets[cat.id] ?? 0}
            onChange={(amount) => handleChange(cat.id, amount)}
          />
        ))}
      </div>

      {categories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            カテゴリがありません。先にカテゴリを作成してください。
          </p>
        </div>
      )}
    </div>
  )
}
