import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BudgetForm } from './BudgetForm'
import type { Category } from '@/types/app'

// Mock server actions
vi.mock('@/app/(app)/budgets/actions', () => ({
  upsertBudget: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock Toast
vi.mock('@/components/atoms/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    user_id: 'user-1',
    name: '食費',
    icon: 'utensils',
    color: '#ef4444',
    sort_order: 0,
    is_archived: false,
    is_default: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'cat-2',
    user_id: 'user-1',
    name: '交通費',
    icon: 'car',
    color: '#3b82f6',
    sort_order: 1,
    is_archived: false,
    is_default: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

const mockBudgetMap = { 'cat-1': 30000, 'cat-2': 10000 }

describe('BudgetForm', () => {
  it('合計予算が表示される', () => {
    render(
      <BudgetForm
        categories={mockCategories}
        budgetMap={mockBudgetMap}
        currentMonth="2024-03-01"
      />
    )
    expect(screen.getByText('合計予算')).toBeInTheDocument()
    expect(screen.getByText(/[¥￥]40,000/)).toBeInTheDocument()
  })

  it('全カテゴリの行が表示される', () => {
    render(
      <BudgetForm
        categories={mockCategories}
        budgetMap={mockBudgetMap}
        currentMonth="2024-03-01"
      />
    )
    expect(screen.getByText('食費')).toBeInTheDocument()
    expect(screen.getByText('交通費')).toBeInTheDocument()
  })

  it('各カテゴリの予算金額が入力欄に表示される', () => {
    render(
      <BudgetForm
        categories={mockCategories}
        budgetMap={mockBudgetMap}
        currentMonth="2024-03-01"
      />
    )
    expect(screen.getByDisplayValue('30000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10000')).toBeInTheDocument()
  })

  it('金額を変更すると合計が更新される', async () => {
    const user = userEvent.setup()
    render(
      <BudgetForm
        categories={mockCategories}
        budgetMap={mockBudgetMap}
        currentMonth="2024-03-01"
      />
    )
    const input = screen.getByDisplayValue('30000')
    await user.clear(input)
    await user.type(input, '50000')
    // Total should be updated: 50000 + 10000 = 60000
    expect(screen.getByText(/[¥￥]60,000/)).toBeInTheDocument()
  })

  it('カテゴリが空の場合、メッセージが表示される', () => {
    render(
      <BudgetForm
        categories={[]}
        budgetMap={{}}
        currentMonth="2024-03-01"
      />
    )
    expect(
      screen.getByText('カテゴリがありません。先にカテゴリを作成してください。')
    ).toBeInTheDocument()
  })

  it('budgetMap にないカテゴリは 0 として扱われる', () => {
    render(
      <BudgetForm
        categories={mockCategories}
        budgetMap={{ 'cat-1': 30000 }}
        currentMonth="2024-03-01"
      />
    )
    // cat-2 has no budget, so total is 30000
    expect(screen.getByText(/[¥￥]30,000/)).toBeInTheDocument()
  })
})
