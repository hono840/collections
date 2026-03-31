import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BottomNav } from './BottomNav'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

describe('BottomNav', () => {
  it('全てのナビゲーション項目が表示される', () => {
    render(<BottomNav />)
    expect(screen.getByText('ホーム')).toBeInTheDocument()
    expect(screen.getByText('取引')).toBeInTheDocument()
    expect(screen.getByText('予算')).toBeInTheDocument()
    expect(screen.getByText('レポート')).toBeInTheDocument()
    expect(screen.getByText('設定')).toBeInTheDocument()
  })

  it('現在のパスの項目にアクティブスタイルが適用される', () => {
    render(<BottomNav />)
    const homeLink = screen.getByText('ホーム').closest('a')
    expect(homeLink?.className).toContain('text-brand-600')
  })

  it('非アクティブなナビ項目にはアクティブスタイルが適用されない', () => {
    render(<BottomNav />)
    const txLink = screen.getByText('取引').closest('a')
    expect(txLink?.className).toContain('text-slate-400')
  })

  it('ナビゲーションリンクが正しい href を持つ', () => {
    render(<BottomNav />)
    expect(screen.getByText('ホーム').closest('a')).toHaveAttribute(
      'href',
      '/dashboard'
    )
    expect(screen.getByText('取引').closest('a')).toHaveAttribute(
      'href',
      '/transactions'
    )
    expect(screen.getByText('予算').closest('a')).toHaveAttribute(
      'href',
      '/budgets'
    )
    expect(screen.getByText('レポート').closest('a')).toHaveAttribute(
      'href',
      '/reports'
    )
    expect(screen.getByText('設定').closest('a')).toHaveAttribute(
      'href',
      '/settings'
    )
  })

  it('nav 要素が存在する', () => {
    render(<BottomNav />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('5つのリンクが存在する', () => {
    render(<BottomNav />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(5)
  })
})
