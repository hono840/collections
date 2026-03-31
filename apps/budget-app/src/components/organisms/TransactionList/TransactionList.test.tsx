import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TransactionList } from './TransactionList'
import type { TransactionWithCategory, Category } from '@/types/app'

// Mock server actions used by EditTransactionDialog
vi.mock('@/app/(app)/transactions/actions', () => ({
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
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
]

const mockTransactions: TransactionWithCategory[] = [
  {
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
  },
  {
    id: 'tx-2',
    user_id: 'user-1',
    category_id: 'cat-1',
    type: 'expense',
    amount: 800,
    date: '2024-03-15',
    note: 'コーヒー',
    created_at: '2024-03-15T14:00:00Z',
    updated_at: '2024-03-15T14:00:00Z',
    categories: { name: '食費', icon: 'utensils', color: '#ef4444' },
  },
  {
    id: 'tx-3',
    user_id: 'user-1',
    category_id: 'cat-1',
    type: 'expense',
    amount: 3000,
    date: '2024-03-14',
    note: '夕食',
    created_at: '2024-03-14T19:00:00Z',
    updated_at: '2024-03-14T19:00:00Z',
    categories: { name: '食費', icon: 'utensils', color: '#ef4444' },
  },
]

describe('TransactionList', () => {
  it('日付ごとにグループ化されて表示される', () => {
    render(
      <TransactionList
        transactions={mockTransactions}
        categories={mockCategories}
      />
    )
    // 2つの日付グループ: 3月15日と3月14日
    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings).toHaveLength(2)
  })

  it('トランザクションのメモが表示される', () => {
    render(
      <TransactionList
        transactions={mockTransactions}
        categories={mockCategories}
      />
    )
    expect(screen.getByText('ランチ')).toBeInTheDocument()
    expect(screen.getByText('コーヒー')).toBeInTheDocument()
    expect(screen.getByText('夕食')).toBeInTheDocument()
  })

  it('カテゴリ名が表示される', () => {
    render(
      <TransactionList
        transactions={mockTransactions}
        categories={mockCategories}
      />
    )
    const categoryNames = screen.getAllByText('食費')
    expect(categoryNames.length).toBeGreaterThanOrEqual(3)
  })

  it('トランザクションをクリックすると編集ダイアログが開く', async () => {
    const user = userEvent.setup()
    render(
      <TransactionList
        transactions={mockTransactions}
        categories={mockCategories}
      />
    )
    // Click on first transaction row
    const buttons = screen.getAllByRole('button')
    const txButton = buttons.find((btn) => btn.textContent?.includes('ランチ'))
    expect(txButton).toBeTruthy()
    await user.click(txButton!)
    // Edit dialog should appear
    expect(screen.getByText('取引を編集')).toBeInTheDocument()
  })

  it('空のトランザクションリストでエラーが起きない', () => {
    const { container } = render(
      <TransactionList transactions={[]} categories={mockCategories} />
    )
    expect(container).toBeInTheDocument()
  })
})
