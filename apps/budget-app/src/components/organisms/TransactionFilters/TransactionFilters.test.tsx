import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TransactionFilters } from './TransactionFilters'
import type { Category } from '@/types/app'

const mockPush = vi.fn()
const mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
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

describe('TransactionFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('検索入力欄が表示される', () => {
    render(<TransactionFilters categories={mockCategories} />)
    expect(screen.getByPlaceholderText('メモで検索...')).toBeInTheDocument()
  })

  it('フィルターボタンが表示される', () => {
    render(<TransactionFilters categories={mockCategories} />)
    expect(screen.getByLabelText('フィルター')).toBeInTheDocument()
  })

  it('初期状態ではフィルターパネルが閉じている', () => {
    render(<TransactionFilters categories={mockCategories} />)
    expect(screen.queryByText('期間')).not.toBeInTheDocument()
  })

  it('フィルターボタンをクリックするとパネルが開く', async () => {
    const user = userEvent.setup()
    render(<TransactionFilters categories={mockCategories} />)
    await user.click(screen.getByLabelText('フィルター'))
    expect(screen.getByText('期間')).toBeInTheDocument()
    expect(screen.getByText('カテゴリ')).toBeInTheDocument()
    expect(screen.getByText('金額')).toBeInTheDocument()
  })

  it('フィルターパネルにカテゴリが表示される', async () => {
    const user = userEvent.setup()
    render(<TransactionFilters categories={mockCategories} />)
    await user.click(screen.getByLabelText('フィルター'))
    expect(screen.getByText('食費')).toBeInTheDocument()
    expect(screen.getByText('交通費')).toBeInTheDocument()
  })

  it('検索入力に文字を入力できる', async () => {
    const user = userEvent.setup()
    render(<TransactionFilters categories={mockCategories} />)
    const input = screen.getByPlaceholderText('メモで検索...')
    await user.type(input, 'ランチ')
    expect(input).toHaveValue('ランチ')
  })

  it('フィルターパネルを再度クリックすると閉じる', async () => {
    const user = userEvent.setup()
    render(<TransactionFilters categories={mockCategories} />)
    await user.click(screen.getByLabelText('フィルター'))
    expect(screen.getByText('期間')).toBeInTheDocument()
    await user.click(screen.getByLabelText('フィルター'))
    expect(screen.queryByText('期間')).not.toBeInTheDocument()
  })

  it('金額フィルターに入力欄が表示される', async () => {
    const user = userEvent.setup()
    render(<TransactionFilters categories={mockCategories} />)
    await user.click(screen.getByLabelText('フィルター'))
    expect(screen.getByPlaceholderText('下限')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('上限')).toBeInTheDocument()
  })
})
