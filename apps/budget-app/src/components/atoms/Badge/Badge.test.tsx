import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge', () => {
  // --- 基本表示 ---

  it('children が正しく表示される', () => {
    render(<Badge>新規</Badge>)
    expect(screen.getByText('新規')).toBeInTheDocument()
  })

  // --- バリアント別スタイル ---

  it('デフォルト (gray) のスタイルが適用される', () => {
    render(<Badge>タグ</Badge>)
    const badge = screen.getByText('タグ')
    expect(badge.className).toContain('bg-slate-100')
  })

  it('red バリアントのスタイルが適用される', () => {
    render(<Badge color="red">危険</Badge>)
    const badge = screen.getByText('危険')
    expect(badge.className).toContain('bg-red-100')
  })

  it('amber バリアントのスタイルが適用される', () => {
    render(<Badge color="amber">警告</Badge>)
    const badge = screen.getByText('警告')
    expect(badge.className).toContain('bg-amber-100')
  })

  it('emerald バリアントのスタイルが適用される', () => {
    render(<Badge color="emerald">安全</Badge>)
    const badge = screen.getByText('安全')
    expect(badge.className).toContain('bg-emerald-100')
  })

  it('brand バリアントのスタイルが適用される', () => {
    render(<Badge color="brand">特集</Badge>)
    const badge = screen.getByText('特集')
    expect(badge.className).toContain('bg-brand-100')
  })

  // --- 共通スタイル ---

  it('rounded-full のピルスタイルが適用される', () => {
    render(<Badge>テスト</Badge>)
    expect(screen.getByText('テスト').className).toContain('rounded-full')
  })

  // --- カスタム className ---

  it('追加の className がマージされる', () => {
    render(<Badge className="mt-2">テスト</Badge>)
    expect(screen.getByText('テスト').className).toContain('mt-2')
  })
})
