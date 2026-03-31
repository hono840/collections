import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMonthYear } from '@/lib/utils/format'
import { TransactionsTemplate } from '@/components/templates/TransactionsTemplate'

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
    <TransactionsTemplate
      transactions={txList}
      categories={catList}
      displayLabel={displayLabel}
      hasActiveFilters={!!hasActiveFilters}
      currentPage={page}
      totalPages={totalPages}
      totalCount={totalCount}
    />
  )
}
