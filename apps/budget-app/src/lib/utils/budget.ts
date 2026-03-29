export type BudgetStatus = 'safe' | 'warning' | 'danger' | 'none'

export function calculateBudgetProgress(spent: number, budget: number) {
  if (budget <= 0) return { percentage: 0, status: 'none' as BudgetStatus }
  const percentage = Math.round((spent / budget) * 100)
  return { percentage, status: getBudgetStatus(percentage) }
}

export function getBudgetStatus(percentage: number): BudgetStatus {
  if (percentage >= 100) return 'danger'
  if (percentage >= 75) return 'warning'
  return 'safe'
}

export function getDaysRemainingInMonth(): number {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return lastDay.getDate() - now.getDate()
}

export function getFirstDayOfMonth(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}
