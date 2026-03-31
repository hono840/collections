import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryCard } from './CategoryCard'
import type { Category } from '@/types/app'

// Mock server actions
vi.mock('@/app/(app)/categories/actions', () => ({
  archiveCategory: vi.fn(),
}))

// Mock Toast
vi.mock('@/components/atoms/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

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

describe('CategoryCard', () => {
  it('カテゴリ名が表示される', () => {
    render(<CategoryCard category={mockCategory} onEdit={vi.fn()} />)
    expect(screen.getByText('食費')).toBeInTheDocument()
  })

  it('デフォルトカテゴリの場合「デフォルト」が表示される', () => {
    const defaultCat = { ...mockCategory, is_default: true }
    render(<CategoryCard category={defaultCat} onEdit={vi.fn()} />)
    expect(screen.getByText('デフォルト')).toBeInTheDocument()
  })

  it('デフォルトでない場合「デフォルト」が表示されない', () => {
    render(<CategoryCard category={mockCategory} onEdit={vi.fn()} />)
    expect(screen.queryByText('デフォルト')).not.toBeInTheDocument()
  })

  it('編集ボタンが表示される', () => {
    render(<CategoryCard category={mockCategory} onEdit={vi.fn()} />)
    expect(screen.getByLabelText('編集')).toBeInTheDocument()
  })

  it('アーカイブボタンが表示される', () => {
    render(<CategoryCard category={mockCategory} onEdit={vi.fn()} />)
    expect(screen.getByLabelText('アーカイブ')).toBeInTheDocument()
  })

  it('編集ボタンをクリックすると onEdit が呼ばれる', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(<CategoryCard category={mockCategory} onEdit={onEdit} />)
    await user.click(screen.getByLabelText('編集'))
    expect(onEdit).toHaveBeenCalledWith(mockCategory)
  })

  it('カラープレビューがカテゴリの色で表示される', () => {
    const { container } = render(
      <CategoryCard category={mockCategory} onEdit={vi.fn()} />
    )
    // jsdom may serialize the color as rgb() or hex depending on environment
    const colorDot =
      container.querySelector('[style*="background-color: #ef4444"]') ??
      container.querySelector('[style*="background-color: rgb(239, 68, 68)"]')
    expect(colorDot).toBeInTheDocument()
  })
})
