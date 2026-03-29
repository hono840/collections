import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BudgetForm } from '@/components/budgets/budget-form'
import { formatCurrency } from '@/lib/utils/format'
import { Wallet } from 'lucide-react'

export const metadata = {
  title: '予算設定 | Budget App',
}

export default async function BudgetsPage() {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Current month first day
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  // Fetch active categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('is_archived', false)
    .order('sort_order', { ascending: true })

  // Fetch budgets for the current month
  const { data: budgets } = await supabase
    .from('budgets')
    .select('*')
    .eq('month', currentMonth)

  const catList = categories ?? []
  const budgetList = budgets ?? []

  // Build a map of category_id -> budget amount
  const budgetMap: Record<string, number> = {}
  for (const b of budgetList) {
    budgetMap[b.category_id] = b.amount
  }

  // Total budget
  const totalBudget = budgetList.reduce((sum, b) => sum + b.amount, 0)

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
        categories={catList}
        budgetMap={budgetMap}
        currentMonth={currentMonth}
      />
    </div>
  )
}
