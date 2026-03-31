import { Suspense } from 'react'
import { TrendingDown, PieChart as PieChartIcon } from 'lucide-react'
import { formatCurrency, formatMonthYear } from '@/lib/utils/format'
import { SpendingPieChart } from '@/components/organisms/SpendingPieChart'
import { MonthlyBarChart } from '@/components/organisms/MonthlyBarChart'
import { MonthNavigator } from '@/components/molecules/MonthNavigator'

interface CategorySpending {
  categoryId: string
  categoryName: string
  categoryColor: string
  total: number
}

interface MonthlyData {
  label: string
  total: number
}

export interface ReportsTemplateProps {
  year: number
  month: number
  totalSpent: number
  categorySpending: CategorySpending[]
  monthlyData: MonthlyData[]
}

export function ReportsTemplate({
  year,
  month,
  totalSpent,
  categorySpending,
  monthlyData,
}: ReportsTemplateProps) {
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
