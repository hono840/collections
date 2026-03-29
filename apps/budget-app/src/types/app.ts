import type { Database } from './database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type Budget = Database['public']['Tables']['budgets']['Row']

export type TransactionWithCategory = Transaction & {
  categories: Pick<Category, 'name' | 'icon' | 'color'> | null
}

export type MonthlySummary = {
  category_id: string
  category_name: string
  category_icon: string
  category_color: string
  total_spent: number
  budget_amount: number
}
