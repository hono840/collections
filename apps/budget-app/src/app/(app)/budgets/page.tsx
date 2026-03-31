import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BudgetsTemplate } from '@/components/templates/BudgetsTemplate'

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
    <BudgetsTemplate
      categories={catList}
      budgetMap={budgetMap}
      currentMonth={currentMonth}
      totalBudget={totalBudget}
    />
  )
}
