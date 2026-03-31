import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BudgetCategoryRow } from './BudgetCategoryRow'
import type { Category } from '@/types/app'

const mockCategory: Category = {
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
}

describe('BudgetCategoryRow', () => {
  it('カテゴリ名が表示される', () => {
    render(
      <BudgetCategoryRow category={mockCategory} amount={0} onChange={vi.fn()} />
    )
    expect(screen.getByText('食費')).toBeInTheDocument()
  })

  it('金額が入力欄に表示される', () => {
    render(
      <BudgetCategoryRow
        category={mockCategory}
        amount={5000}
        onChange={vi.fn()}
      />
    )
    const input = screen.getByDisplayValue('5000')
    expect(input).toBeInTheDocument()
  })

  it('金額が 0 の場合はプレースホルダーが表示される', () => {
    render(
      <BudgetCategoryRow category={mockCategory} amount={0} onChange={vi.fn()} />
    )
    const input = screen.getByPlaceholderText('0')
    expect(input).toHaveValue('')
  })

  it('数値を入力すると onChange が呼ばれる', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <BudgetCategoryRow
        category={mockCategory}
        amount={0}
        onChange={onChange}
      />
    )
    const input = screen.getByPlaceholderText('0')
    await user.type(input, '3')
    // Controlled component: amount stays 0 so value resets each keystroke.
    // Verify onChange was called with the parsed digit.
    expect(onChange).toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('数字以外の入力は除去される', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <BudgetCategoryRow
        category={mockCategory}
        amount={0}
        onChange={onChange}
      />
    )
    const input = screen.getByPlaceholderText('0')
    await user.type(input, 'abc')
    // Non-numeric chars should result in 0
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]
    expect(lastCall[0]).toBe(0)
  })

  it('¥ 記号が表示される', () => {
    render(
      <BudgetCategoryRow category={mockCategory} amount={0} onChange={vi.fn()} />
    )
    expect(screen.getByText('¥')).toBeInTheDocument()
  })
})
