import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TransactionList } from '@/components/transactions/transaction-list'
import { TransactionFilters } from '@/components/transactions/transaction-filters'
import { QuickExpenseFab } from '@/components/transactions/quick-expense-fab'
import { TransactionPagination } from '@/components/transactions/transaction-pagination'
import { formatMonthYear } from '@/lib/utils/format'
import { ArrowRightLeft } from 'lucide-react'

export const metadata = {
  title: 'トランザクション | Budget App',
}

const PAGE_SIZE = 50

export default async function TransactionsPage({
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

  // Read search params
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q : ''
  const from = typeof params.from === 'string' ? params.from : ''
  const to = typeof params.to === 'string' ? params.to : ''
  const sort = typeof params.sort === 'string' ? params.sort : 'date-desc'
  const page = typeof params.page === 'string' ? Math.max(1, parseInt(params.page, 10) || 1) : 1
  const minAmount = typeof params.minAmount === 'string' ? parseFloat(params.minAmount) : null
  const maxAmount = typeof params.maxAmount === 'string' ? parseFloat(params.maxAmount) : null

  // Category can be a single string or array
  const categoryParam = params.category
  const categoryIds: string[] = Array.isArray(categoryParam)
    ? categoryParam
    : categoryParam
      ? [categoryParam]
      : []

  // Determine date range: default to current month if no date filters
  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0]
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0]

  const effectiveFrom = from || defaultFrom
  const effectiveTo = to || defaultTo

  // Build query
  let query = supabase
    .from('transactions')
    .select('*, categories(name, icon, color)', { count: 'exact' })
    .gte('date', effectiveFrom)
    .lte('date', effectiveTo)

  // Text search on note (escape SQL wildcards)
  if (q) {
    const escaped = q.replace(/%/g, '\\%').replace(/_/g, '\\_')
    query = query.ilike('note', `%${escaped}%`)
  }

  // Category filter
  if (categoryIds.length > 0) {
    query = query.in('category_id', categoryIds)
  }

  // Amount range filter
  if (minAmount !== null && !isNaN(minAmount)) {
    query = query.gte('amount', minAmount)
  }
  if (maxAmount !== null && !isNaN(maxAmount)) {
    query = query.lte('amount', maxAmount)
  }

  // Sort
  const [sortField, sortDir] = sort.split('-') as [string, string]
  const ascending = sortDir === 'asc'
  if (sortField === 'amount') {
    query = query.order('amount', { ascending })
  } else {
    // Default: date sort
    query = query
      .order('date', { ascending })
      .order('created_at', { ascending })
  }

  // Pagination
  const offset = (page - 1) * PAGE_SIZE
  query = query.range(offset, offset + PAGE_SIZE - 1)

  const { data: transactions, count } = await query

  // Fetch categories for filters and dialogs
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('is_archived', false)
    .order('sort_order', { ascending: true })

  const txList = transactions ?? []
  const catList = categories ?? []
  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // Determine display label
  const hasActiveFilters = q || from || to || categoryIds.length > 0 || minAmount !== null || maxAmount !== null
  const displayLabel = hasActiveFilters
    ? `${totalCount}件の検索結果`
    : formatMonthYear(now)

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
        <TransactionFilters categories={catList} />
      </Suspense>

      {/* Transaction list or empty state */}
      {txList.length > 0 ? (
        <>
          <TransactionList transactions={txList} categories={catList} />

          {/* Pagination */}
          {totalPages > 1 && (
            <TransactionPagination
              currentPage={page}
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
      <QuickExpenseFab categories={catList} />
    </div>
  )
}
