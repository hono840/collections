import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditTransactionDialog } from './EditTransactionDialog'
import type { TransactionWithCategory, Category } from '@/types/app'

// Mock server actions
vi.mock('@/app/(app)/transactions/actions', () => ({
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
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

const mockTransaction: TransactionWithCategory = {
  id: 'tx-1',
  user_id: 'user-1',
  category_id: 'cat-1',
  type: 'expense',
  amount: 1500,
  date: '2024-03-15',
  note: 'ランチ',
  created_at: '2024-03-15T12:00:00Z',
  updated_at: '2024-03-15T12:00:00Z',
  categories: { name: '食費', icon: 'utensils', color: '#ef4444' },
}

describe('EditTransactionDialog', () => {
  it('transaction が null の場合は何も表示されない', () => {
    const { container } = render(
      <EditTransactionDialog
        transaction={null}
        categories={mockCategories}
        onClose={vi.fn()}
      />
    )
    expect(container.innerHTML).toBe('')
  })

  it('transaction がある場合ダイアログが表示される', () => {
    render(
      <EditTransactionDialog
        transaction={mockTransaction}
        categories={mockCategories}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('取引を編集')).toBeInTheDocument()
  })

  it('金額がデフォルト値として表示される', () => {
    render(
      <EditTransactionDialog
        transaction={mockTransaction}
        categories={mockCategories}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByLabelText('金額')).toHaveValue('1500')
  })

  it('カテゴリがデフォルト値として選択される', () => {
    render(
      <EditTransactionDialog
        transaction={mockTransaction}
        categories={mockCategories}
        onClose={vi.fn()}
      />
    )
    const select = screen.getByLabelText('カテゴリ') as HTMLSelectElement
    expect(select.value).toBe('cat-1')
  })

  it('日付がデフォルト値として表示される', () => {
    render(
      <EditTransactionDialog
        transaction={mockTransaction}
        categories={mockCategories}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByLabelText('日付')).toHaveValue('2024-03-15')
  })

  it('メモがデフォルト値として表示される', () => {
    render(
      <EditTransactionDialog
        transaction={mockTransaction}
        categories={mockCategories}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByLabelText('メモ')).toHaveValue('ランチ')
  })

  it('「削除」ボタンが表示される', () => {
    render(
      <EditTransactionDialog
        transaction={mockTransaction}
        categories={mockCategories}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /削除/ })).toBeInTheDocument()
  })

  it('「キャンセル」ボタンが表示される', () => {
    render(
      <EditTransactionDialog
        transaction={mockTransaction}
        categories={mockCategories}
        onClose={vi.fn()}
      />
    )
    expect(
      screen.getByRole('button', { name: 'キャンセル' })
    ).toBeInTheDocument()
  })

  it('「保存」ボタンが表示される', () => {
    render(
      <EditTransactionDialog
        transaction={mockTransaction}
        categories={mockCategories}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /保存/ })).toBeInTheDocument()
  })

  it('「キャンセル」をクリックすると onClose が呼ばれる', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <EditTransactionDialog
        transaction={mockTransaction}
        categories={mockCategories}
        onClose={onClose}
      />
    )
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('金額を変更できる', async () => {
    const user = userEvent.setup()
    render(
      <EditTransactionDialog
        transaction={mockTransaction}
        categories={mockCategories}
        onClose={vi.fn()}
      />
    )
    const input = screen.getByLabelText('金額')
    await user.clear(input)
    await user.type(input, '3000')
    expect(input).toHaveValue('3000')
  })
})
