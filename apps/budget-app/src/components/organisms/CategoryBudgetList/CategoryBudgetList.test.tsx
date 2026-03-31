import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CategoryBudgetList } from './CategoryBudgetList'
import type { MonthlySummary } from '@/types/app'

// Mock next/navigation (used by CategoryBudgetItem)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const mockSummaries: MonthlySummary[] = [
  {
    category_id: 'cat-1',
    category_name: '食費',
    category_icon: 'utensils',
    category_color: '#ef4444',
    total_spent: 15000,
    budget_amount: 30000,
  },
  {
    category_id: 'cat-2',
    category_name: '交通費',
    category_icon: 'car',
    category_color: '#3b82f6',
    total_spent: 5000,
    budget_amount: 10000,
  },
]

describe('CategoryBudgetList', () => {
  it('全カテゴリのサマリーが表示される', () => {
    render(<CategoryBudgetList summaries={mockSummaries} />)
    expect(screen.getByText('食費')).toBeInTheDocument()
    expect(screen.getByText('交通費')).toBeInTheDocument()
  })

  it('支出金額が表示される', () => {
    render(<CategoryBudgetList summaries={mockSummaries} />)
    expect(screen.getByText(/[¥￥]15,000/)).toBeInTheDocument()
    expect(screen.getByText(/[¥￥]5,000/)).toBeInTheDocument()
  })

  it('予算金額が表示される', () => {
    render(<CategoryBudgetList summaries={mockSummaries} />)
    expect(screen.getByText(/[¥￥]30,000/)).toBeInTheDocument()
    expect(screen.getByText(/[¥￥]10,000/)).toBeInTheDocument()
  })

  it('空のサマリーリストの場合、空状態メッセージが表示される', () => {
    render(<CategoryBudgetList summaries={[]} />)
    expect(
      screen.getByText('カテゴリ別の支出データはまだありません')
    ).toBeInTheDocument()
  })

  it('空でない場合、空状態メッセージが表示されない', () => {
    render(<CategoryBudgetList summaries={mockSummaries} />)
    expect(
      screen.queryByText('カテゴリ別の支出データはまだありません')
    ).not.toBeInTheDocument()
  })

  it('パーセンテージが表示される', () => {
    render(<CategoryBudgetList summaries={mockSummaries} />)
    // Both categories are at 50%, so multiple elements exist
    const percentages = screen.getAllByText('50%')
    expect(percentages).toHaveLength(2)
  })
})
