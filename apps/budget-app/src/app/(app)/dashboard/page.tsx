import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { MonthlySummary } from '@/types/app'
import { DashboardTemplate } from '@/components/templates/DashboardTemplate'

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
    <DashboardTemplate
      summaries={summaries}
      totalSpent={totalSpent}
      totalBudget={totalBudget}
      recentTransactions={txList}
      categories={catList}
      daysRemaining={daysRemaining}
      isCurrentMonth={isCurrentMonth}
    />
  )
}
