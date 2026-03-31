import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowRightLeft, BarChart3 } from 'lucide-react'
import type { MonthlySummary, TransactionWithCategory, Category } from '@/types/app'
import { QuickExpenseFab } from '@/components/organisms/QuickExpenseFab'
import { RecentTransactions } from '@/components/organisms/RecentTransactions'
import { MonthlySummaryCard } from '@/components/organisms/MonthlySummaryCard'
import { CategoryBudgetList } from '@/components/organisms/CategoryBudgetList'
import { DaysRemainingBadge } from '@/components/molecules/DaysRemainingBadge'
import { MonthNavigator } from '@/components/molecules/MonthNavigator'

export interface DashboardTemplateProps {
  summaries: MonthlySummary[]
  totalSpent: number
  totalBudget: number
  recentTransactions: TransactionWithCategory[]
  categories: Category[]
  daysRemaining: number
  isCurrentMonth: boolean
}

export function DashboardTemplate({
  summaries,
  totalSpent,
  totalBudget,
  recentTransactions,
  categories,
  daysRemaining,
  isCurrentMonth,
}: DashboardTemplateProps) {
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

        {recentTransactions.length > 0 ? (
          <RecentTransactions transactions={recentTransactions} categories={categories} />
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
      <QuickExpenseFab categories={categories} />
    </div>
  )
}
