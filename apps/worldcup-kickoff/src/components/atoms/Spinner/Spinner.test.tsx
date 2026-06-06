import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Spinner } from './Spinner'

describe('Spinner', () => {
  it('role=status を持つ', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('デフォルトラベル「読み込み中」が表示される', () => {
    render(<Spinner />)
    expect(screen.getByText('読み込み中')).toBeInTheDocument()
  })

  it('カスタムラベルが設定できる', () => {
    render(<Spinner label="試合を取得中" />)
    expect(screen.getByText('試合を取得中')).toBeInTheDocument()
  })

  it('spin アニメーションが付与される', () => {
    const { container } = render(<Spinner />)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('lg サイズが適用される', () => {
    const { container } = render(<Spinner size="lg" />)
    expect(container.querySelector('.h-8')).toBeInTheDocument()
  })
})
