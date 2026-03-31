import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuickExpenseDialog } from './QuickExpenseDialog'
import type { Category } from '@/types/app'

// Mock server actions
vi.mock('@/app/(app)/transactions/actions', () => ({
  createTransaction: vi.fn(),
}))

// Mock Toast
const mockToast = vi.fn()
vi.mock('@/components/atoms/Toast', () => ({
  useToast: () => ({ toast: mockToast }),
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

describe('QuickExpenseDialog', () => {
  it('open=true の場合ダイアログが表示される', () => {
    render(
      <QuickExpenseDialog
        open={true}
        onClose={vi.fn()}
        categories={mockCategories}
      />
    )
    expect(screen.getByText('支出を記録')).toBeInTheDocument()
  })

  it('open=false の場合ダイアログが表示されない', () => {
    render(
      <QuickExpenseDialog
        open={false}
        onClose={vi.fn()}
        categories={mockCategories}
      />
    )
    expect(screen.queryByText('支出を記録')).not.toBeInTheDocument()
  })

  it('金額入力欄が表示される', () => {
    render(
      <QuickExpenseDialog
        open={true}
        onClose={vi.fn()}
        categories={mockCategories}
      />
    )
    expect(screen.getByLabelText('金額')).toBeInTheDocument()
  })

  it('カテゴリ選択に全カテゴリが表示される', () => {
    render(
      <QuickExpenseDialog
        open={true}
        onClose={vi.fn()}
        categories={mockCategories}
      />
    )
    const select = screen.getByLabelText('カテゴリ')
    expect(select).toBeInTheDocument()
    expect(screen.getByText('食費')).toBeInTheDocument()
    expect(screen.getByText('交通費')).toBeInTheDocument()
  })

  it('日付入力欄が表示される', () => {
    render(
      <QuickExpenseDialog
        open={true}
        onClose={vi.fn()}
        categories={mockCategories}
      />
    )
    expect(screen.getByLabelText('日付')).toBeInTheDocument()
  })

  it('メモ入力欄が表示される', () => {
    render(
      <QuickExpenseDialog
        open={true}
        onClose={vi.fn()}
        categories={mockCategories}
      />
    )
    expect(screen.getByLabelText('メモ')).toBeInTheDocument()
  })

  it('「記録する」ボタンが表示される', () => {
    render(
      <QuickExpenseDialog
        open={true}
        onClose={vi.fn()}
        categories={mockCategories}
      />
    )
    expect(
      screen.getByRole('button', { name: '記録する' })
    ).toBeInTheDocument()
  })

  it('カテゴリのデフォルト選択が「選択してください」である', () => {
    render(
      <QuickExpenseDialog
        open={true}
        onClose={vi.fn()}
        categories={mockCategories}
      />
    )
    const select = screen.getByLabelText('カテゴリ') as HTMLSelectElement
    expect(select.value).toBe('')
  })

  it('フォームに金額を入力できる', async () => {
    const user = userEvent.setup()
    render(
      <QuickExpenseDialog
        open={true}
        onClose={vi.fn()}
        categories={mockCategories}
      />
    )
    const input = screen.getByLabelText('金額')
    await user.type(input, '1500')
    expect(input).toHaveValue('1500')
  })

  it('カテゴリを選択できる', async () => {
    const user = userEvent.setup()
    render(
      <QuickExpenseDialog
        open={true}
        onClose={vi.fn()}
        categories={mockCategories}
      />
    )
    const select = screen.getByLabelText('カテゴリ')
    await user.selectOptions(select, 'cat-1')
    expect((select as HTMLSelectElement).value).toBe('cat-1')
  })
})
