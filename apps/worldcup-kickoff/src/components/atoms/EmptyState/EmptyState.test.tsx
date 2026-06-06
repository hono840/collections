import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Search } from 'lucide-react'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('title が表示される', () => {
    render(<EmptyState title="結果がありません" />)
    expect(screen.getByText('結果がありません')).toBeInTheDocument()
  })

  it('description が表示される', () => {
    render(
      <EmptyState
        title="結果がありません"
        description="別のキーワードで検索してください"
      />,
    )
    expect(
      screen.getByText('別のキーワードで検索してください'),
    ).toBeInTheDocument()
  })

  it('description が無い場合は表示されない', () => {
    const { container } = render(<EmptyState title="タイトルのみ" />)
    // p 要素は title の1つだけ
    expect(container.querySelectorAll('p')).toHaveLength(1)
  })

  it('icon が表示される', () => {
    render(
      <EmptyState
        icon={<Search data-testid="empty-icon" />}
        title="検索結果なし"
      />,
    )
    expect(screen.getByTestId('empty-icon')).toBeInTheDocument()
  })

  it('action が表示される', () => {
    render(
      <EmptyState
        title="まだ予想がありません"
        action={<button type="button">予想する</button>}
      />,
    )
    expect(
      screen.getByRole('button', { name: '予想する' }),
    ).toBeInTheDocument()
  })

  it('追加の className がマージされる', () => {
    const { container } = render(
      <EmptyState title="テスト" className="my-8" />,
    )
    expect(container.firstElementChild?.className).toContain('my-8')
  })
})
