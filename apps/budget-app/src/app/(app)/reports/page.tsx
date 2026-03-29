import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, formatMonthYear } from '@/lib/utils/format'
import { SpendingPieChart } from '@/components/reports/spending-pie-chart'
import { MonthlyBarChart } from '@/components/reports/monthly-bar-chart'
import { MonthNavigator } from '@/components/reports/month-navigator'
import { TrendingDown, PieChart as PieChartIcon } from 'lucide-react'

export const metadata = {
  title: 'レポート | Budget App',
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Read month/year from searchParams, default to current month
  const params = await searchParams
  const now = new Date()
  const year =
    typeof params.year === 'string'
      ? parseInt(params.year, 10) || now.getFullYear()
      : now.getFullYear()
  const month =
    typeof params.month === 'string'
      ? parseInt(params.month, 10) || now.getMonth() + 1
      : now.getMonth() + 1

  // Current selected month range
  const startOfMonth = new Date(year, month - 1, 1).toISOString().split('T')[0]
  const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0]

  // Fetch expense transactions for selected month with categories
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, category_id, categories(name, icon, color)')
    .eq('type', 'expense')
    .gte('date', startOfMonth)
    .lte('date', endOfMonth)

  // Aggregate by category
  const categoryMap = new Map<
    string,
    { categoryId: string; categoryName: string; categoryColor: string; total: number }
  >()

  for (const tx of transactions ?? []) {
    const catId = tx.category_id ?? 'uncategorized'
    const cat = tx.categories as { name: string; icon: string; color: string } | null
    const existing = categoryMap.get(catId)
    if (existing) {
      existing.total += tx.amount
    } else {
      categoryMap.set(catId, {
        categoryId: catId,
        categoryName: cat?.name ?? '未分類',
        categoryColor: cat?.color ?? '#94a3b8',
        total: tx.amount,
      })
    }
  }

  const categorySpending = Array.from(categoryMap.values()).sort(
    (a, b) => b.total - a.total
  )
  const totalSpent = categorySpending.reduce((sum, c) => sum + c.total, 0)

  // Fetch monthly totals for bar chart (current + previous 2 months)
  const monthlyData = await Promise.all(
    [2, 1, 0].map(async (offset) => {
      const mDate = new Date(year, month - 1 - offset, 1)
      const mStart = mDate.toISOString().split('T')[0]
      const mEnd = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0]

      const { data } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'expense')
        .gte('date', mStart)
        .lte('date', mEnd)

      const total = data?.reduce((sum, tx) => sum + tx.amount, 0) ?? 0
      const label = formatMonthYear(mDate)

      return { label, total }
    })
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
            レポート
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            支出の分析と推移
          </p>
        </div>
        <Suspense fallback={null}>
          <MonthNavigator basePath="/reports" year={year} month={month} />
        </Suspense>
      </div>

      {/* Total spending card */}
      <div className="mb-8 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 text-brand-100">
          <TrendingDown className="h-4 w-4" />
          <span className="text-sm font-medium">
            {formatMonthYear(new Date(year, month - 1, 1))}の支出
          </span>
        </div>
        <p className="mt-2 text-3xl font-bold tabular-nums">
          {formatCurrency(totalSpent)}
        </p>
      </div>

      {/* Pie chart: Category breakdown */}
      <section className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
            カテゴリ別支出
          </h2>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <SpendingPieChart data={categorySpending} />
        </div>
      </section>

      {/* Bar chart: Monthly comparison */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
            月次推移
          </h2>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <MonthlyBarChart data={monthlyData} />
        </div>
      </section>
    </div>
  )
}
