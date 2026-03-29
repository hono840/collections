import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { QuickExpenseFab } from '@/components/transactions/quick-expense-fab'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { MonthlySummaryCard } from '@/components/dashboard/monthly-summary-card'
import { CategoryBudgetList } from '@/components/dashboard/category-budget-list'
import { DaysRemainingBadge } from '@/components/dashboard/days-remaining-badge'
import { MonthNavigator } from '@/components/dashboard/month-navigator'
import type { MonthlySummary } from '@/types/app'
import { ArrowRightLeft, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'ダッシュボード | Budget App',
}

function parseMonthParam(month: string | string[] | undefined): Date {
  if (typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
    const [year, m] = month.split('-').map(Number)
    return new Date(year, m - 1, 1)
  }
  return new Date()
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { month } = await searchParams
  const targetDate = parseMonthParam(month)

  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Month range
  const startOfMonth = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    1
  )
    .toISOString()
    .split('T')[0]
  const endOfMonth = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth() + 1,
    0
  )
    .toISOString()
    .split('T')[0]

  // Fetch categories (RLS filters to current user)
  const { data: allCategories } = await supabase
    .from('categories')
    .select('id, name, icon, color, sort_order')
    .eq('is_archived', false)
    .order('sort_order', { ascending: true })

  // Fetch monthly expenses per category
  const { data: monthlyExpenses } = await supabase
    .from('transactions')
    .select('category_id, amount')
    .eq('type', 'expense')
    .gte('date', startOfMonth)
    .lte('date', endOfMonth)

  // Fetch budgets for this month
  const { data: monthBudgets } = await supabase
    .from('budgets')
    .select('category_id, amount')
    .eq('month', startOfMonth)

  // Fetch template budgets (month is null)
  const { data: templateBudgets } = await supabase
    .from('budgets')
    .select('category_id, amount')
    .is('month', null)

  // Build summaries
  const expenseMap = new Map<string, number>()
  for (const tx of monthlyExpenses ?? []) {
    if (tx.category_id) {
      expenseMap.set(tx.category_id, (expenseMap.get(tx.category_id) ?? 0) + tx.amount)
    }
  }

  const budgetMap = new Map<string, number>()
  for (const b of templateBudgets ?? []) {
    budgetMap.set(b.category_id, b.amount)
  }
  for (const b of monthBudgets ?? []) {
    budgetMap.set(b.category_id, b.amount)
  }

  const summaries: MonthlySummary[] = (allCategories ?? []).map((c) => ({
    category_id: c.id,
    category_name: c.name,
    category_icon: c.icon,
    category_color: c.color,
    total_spent: expenseMap.get(c.id) ?? 0,
    budget_amount: budgetMap.get(c.id) ?? 0,
  }))

  const totalSpent = summaries.reduce((sum, s) => sum + s.total_spent, 0)
  const totalBudget = summaries.reduce((sum, s) => sum + s.budget_amount, 0)

  // Fetch recent 5 transactions
  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select('*, categories(name, icon, color)')
    .gte('date', startOfMonth)
    .lte('date', endOfMonth)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch categories for the FAB dialog
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('is_archived', false)
    .order('sort_order', { ascending: true })

  const txList = recentTransactions ?? []
  const catList = categories ?? []

  // Days remaining
  const now = new Date()
  const isCurrentMonth =
    now.getFullYear() === targetDate.getFullYear() &&
    now.getMonth() === targetDate.getMonth()
  const lastDayOfMonth = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth() + 1,
    0
  )
  const daysRemaining = isCurrentMonth
    ? lastDayOfMonth.getDate() - now.getDate()
    : 0

  return (
    <div>
      {/* Header with month navigation */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
          ダッシュボード
        </h1>
        <div className="flex items-center gap-2 sm:gap-3">
          <DaysRemainingBadge
            days={daysRemaining}
            isCurrentMonth={isCurrentMonth}
          />
          <Suspense fallback={null}>
            <MonthNavigator />
          </Suspense>
        </div>
      </div>

      {/* Monthly spending card */}
      <div className="mb-8">
        <MonthlySummaryCard totalSpent={totalSpent} totalBudget={totalBudget} />
      </div>

      {/* Category budget progress */}
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
            カテゴリ別予算
          </h2>
        </div>
        <CategoryBudgetList summaries={summaries} />
      </section>

      {/* Recent transactions */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
            最近の取引
          </h2>
          <Link
            href="/transactions"
            className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-500"
          >
            すべて表示
          </Link>
        </div>

        {txList.length > 0 ? (
          <RecentTransactions transactions={txList} categories={catList} />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 py-12 text-center dark:border-zinc-700">
            <ArrowRightLeft className="mb-3 h-8 w-8 text-slate-400 dark:text-zinc-500" />
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              今月の取引はまだありません
            </p>
          </div>
        )}
      </section>

      {/* FAB */}
      <QuickExpenseFab categories={catList} />
    </div>
  )
}
