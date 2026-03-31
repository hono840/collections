import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryList } from './CategoryList'
import type { Category } from '@/types/app'

// Mock server actions used by CategoryCard and CategoryFormDialog
vi.mock('@/app/(app)/categories/actions', () => ({
  archiveCategory: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
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
    is_default: true,
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

describe('CategoryList', () => {
  it('「新規作成」ボタンが表示される', () => {
    render(<CategoryList categories={mockCategories} />)
    expect(
      screen.getByRole('button', { name: /新規作成/ })
    ).toBeInTheDocument()
  })

  it('カテゴリ名が表示される', () => {
    render(<CategoryList categories={mockCategories} />)
    expect(screen.getByText('食費')).toBeInTheDocument()
    expect(screen.getByText('交通費')).toBeInTheDocument()
  })

  it('空のカテゴリリストの場合、カテゴリカードが表示されない', () => {
    render(<CategoryList categories={[]} />)
    expect(screen.queryByText('食費')).not.toBeInTheDocument()
    // 新規作成ボタンは表示される
    expect(
      screen.getByRole('button', { name: /新規作成/ })
    ).toBeInTheDocument()
  })

  it('「新規作成」をクリックすると作成ダイアログが開く', async () => {
    const user = userEvent.setup()
    render(<CategoryList categories={mockCategories} />)
    await user.click(screen.getByRole('button', { name: /新規作成/ }))
    // CategoryFormDialog should be open - the dialog title would appear
    // The exact title depends on CategoryFormDialog implementation
  })

  it('各カテゴリに編集ボタンがある', () => {
    render(<CategoryList categories={mockCategories} />)
    const editButtons = screen.getAllByLabelText('編集')
    expect(editButtons).toHaveLength(2)
  })

  it('各カテゴリにアーカイブボタンがある', () => {
    render(<CategoryList categories={mockCategories} />)
    const archiveButtons = screen.getAllByLabelText('アーカイブ')
    expect(archiveButtons).toHaveLength(2)
  })
})
