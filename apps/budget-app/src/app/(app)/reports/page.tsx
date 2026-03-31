import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMonthYear } from '@/lib/utils/format'
import { ReportsTemplate } from '@/components/templates/ReportsTemplate'

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
    <ReportsTemplate
      year={year}
      month={month}
      totalSpent={totalSpent}
      categorySpending={categorySpending}
      monthlyData={monthlyData}
    />
  )
}
