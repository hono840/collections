import type { MonthlySummary } from '@/types/app'
import { CategoryBudgetItem } from '@/components/molecules/CategoryBudgetItem'
import { BarChart3 } from 'lucide-react'

export interface CategoryBudgetListProps {
  summaries: MonthlySummary[]
}

export function CategoryBudgetList({ summaries }: CategoryBudgetListProps) {
  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 py-10 text-center dark:border-zinc-700">
        <BarChart3 className="mb-3 h-8 w-8 text-slate-400 dark:text-zinc-500" />
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          カテゴリ別の支出データはまだありません
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {summaries.map((s) => (
        <CategoryBudgetItem
          key={s.category_id}
          categoryId={s.category_id}
          categoryName={s.category_name}
          categoryIcon={s.category_icon}
          categoryColor={s.category_color}
          spent={s.total_spent}
          budget={s.budget_amount}
        />
      ))}
    </div>
  )
}
