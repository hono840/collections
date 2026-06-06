import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from './Card'

describe('Card', () => {
  it('children が正しく表示される', () => {
    render(<Card>カード本文</Card>)
    expect(screen.getByText('カード本文')).toBeInTheDocument()
  })

  it('基本スタイル（rounded-2xl / border）が適用される', () => {
    render(<Card>テスト</Card>)
    const card = screen.getByText('テスト')
    expect(card.className).toContain('rounded-2xl')
    expect(card.className).toContain('border')
  })

  it('デフォルトパディング（md）が適用される', () => {
    render(<Card>テスト</Card>)
    expect(screen.getByText('テスト').className).toContain('p-4')
  })

  it('padding="none" の場合パディングクラスが付かない', () => {
    render(<Card padding="none">テスト</Card>)
    expect(screen.getByText('テスト').className).not.toContain('p-4')
  })

  it('interactive の場合 hover シャドウが付与される', () => {
    render(<Card interactive>テスト</Card>)
    expect(screen.getByText('テスト').className).toContain('hover:shadow-md')
  })

  it('highlighted の場合ゴールド枠が付与される', () => {
    render(<Card highlighted>テスト</Card>)
    expect(screen.getByText('テスト').className).toContain('border-gold-400')
  })

  it('追加の className がマージされる', () => {
    render(<Card className="mt-4">テスト</Card>)
    expect(screen.getByText('テスト').className).toContain('mt-4')
  })
})
