import { Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import type { Category } from '@/types/app'
import { BudgetForm } from '@/components/organisms/BudgetForm'

export interface BudgetsTemplateProps {
  categories: Category[]
  budgetMap: Record<string, number>
  currentMonth: string
  totalBudget: number
}

export function BudgetsTemplate({
  categories,
  budgetMap,
  currentMonth,
  totalBudget,
}: BudgetsTemplateProps) {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
          予算設定
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          カテゴリごとに月間予算を設定します
        </p>
      </div>

      {/* Total budget summary */}
      <div className="mb-6 flex items-center gap-3 rounded-2xl bg-slate-50 px-5 py-4 dark:bg-zinc-800/50">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-500/10">
          <Wallet className="h-5 w-5 text-brand-600 dark:text-brand-500" />
        </div>
        <div>
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            今月の合計予算
          </p>
          <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-zinc-100">
            {formatCurrency(totalBudget)}
          </p>
        </div>
      </div>

      {/* Budget form */}
      <BudgetForm
        categories={categories}
        budgetMap={budgetMap}
        currentMonth={currentMonth}
      />
    </div>
  )
}
