import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CategoryBudgetItem } from './CategoryBudgetItem'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

describe('CategoryBudgetItem', () => {
  const defaultProps = {
    categoryId: 'cat-1',
    categoryName: '食費',
    categoryIcon: 'utensils',
    categoryColor: '#ef4444',
    spent: 5000,
    budget: 10000,
  }

  it('カテゴリ名が表示される', () => {
    render(<CategoryBudgetItem {...defaultProps} />)
    expect(screen.getByText('食費')).toBeInTheDocument()
  })

  it('支出金額が表示される', () => {
    render(<CategoryBudgetItem {...defaultProps} />)
    expect(screen.getByText(/[¥￥]5,000/)).toBeInTheDocument()
  })

  it('予算が設定されている場合、予算金額が表示される', () => {
    render(<CategoryBudgetItem {...defaultProps} />)
    expect(screen.getByText(/[¥￥]10,000/)).toBeInTheDocument()
  })

  it('予算が設定されている場合、パーセンテージが表示される', () => {
    render(<CategoryBudgetItem {...defaultProps} />)
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('safe 状態 (50%) ではプログレスバーが emerald 色', () => {
    const { container } = render(<CategoryBudgetItem {...defaultProps} />)
    const progressBar = container.querySelector('.bg-emerald-500')
    expect(progressBar).toBeInTheDocument()
  })

  it('warning 状態 (75%以上) では amber 色', () => {
    const { container } = render(
      <CategoryBudgetItem {...defaultProps} spent={8000} />
    )
    const progressBar = container.querySelector('.bg-amber-500')
    expect(progressBar).toBeInTheDocument()
  })

  it('danger 状態 (100%以上) では red 色', () => {
    const { container } = render(
      <CategoryBudgetItem {...defaultProps} spent={12000} />
    )
    const progressBar = container.querySelector('.bg-red-500')
    expect(progressBar).toBeInTheDocument()
  })

  it('予算が 0 の場合はパーセンテージが表示されない', () => {
    render(<CategoryBudgetItem {...defaultProps} budget={0} />)
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('クリックするとカテゴリのトランザクションページに遷移する', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(<CategoryBudgetItem {...defaultProps} />)
    await user.click(screen.getByRole('button'))
    expect(mockPush).toHaveBeenCalledWith('/transactions?category=cat-1')
  })
})
