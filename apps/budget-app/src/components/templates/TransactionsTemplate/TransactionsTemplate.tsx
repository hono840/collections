import { Suspense } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import type { TransactionWithCategory, Category } from '@/types/app'
import { TransactionList } from '@/components/organisms/TransactionList'
import { TransactionFilters } from '@/components/organisms/TransactionFilters'
import { QuickExpenseFab } from '@/components/organisms/QuickExpenseFab'
import { TransactionPagination } from '@/components/molecules/TransactionPagination'

export interface TransactionsTemplateProps {
  transactions: TransactionWithCategory[]
  categories: Category[]
  displayLabel: string
  hasActiveFilters: boolean
  currentPage: number
  totalPages: number
  totalCount: number
}

export function TransactionsTemplate({
  transactions,
  categories,
  displayLabel,
  hasActiveFilters,
  currentPage,
  totalPages,
  totalCount,
}: TransactionsTemplateProps) {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
          トランザクション
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          {displayLabel}
        </p>
      </div>

      {/* Search & Filters */}
      <Suspense fallback={null}>
        <TransactionFilters categories={categories} />
      </Suspense>

      {/* Transaction list or empty state */}
      {transactions.length > 0 ? (
        <>
          <TransactionList transactions={transactions} categories={categories} />

          {/* Pagination */}
          {totalPages > 1 && (
            <TransactionPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
            />
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-zinc-800">
            <ArrowRightLeft className="h-8 w-8 text-slate-400 dark:text-zinc-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-700 dark:text-zinc-300">
            {hasActiveFilters
              ? '条件に一致する取引が見つかりません'
              : '今月の取引はまだありません'}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            {hasActiveFilters
              ? 'フィルター条件を変更してお試しください'
              : '右下の「+」ボタンから支出を記録しましょう'}
          </p>
        </div>
      )}

      {/* FAB */}
      <QuickExpenseFab categories={categories} />
    </div>
  )
}
