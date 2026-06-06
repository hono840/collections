import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BottomNav } from './BottomNav'

// usePathname を可変にして現在地ハイライトをテストする
const mocks = vi.hoisted(() => ({ pathname: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}))

beforeEach(() => {
  mocks.pathname = '/'
})

describe('BottomNav', () => {
  it('5項目すべてが表示される', () => {
    render(<BottomNav />)
    expect(screen.getByText('ホーム')).toBeInTheDocument()
    expect(screen.getByText('日程')).toBeInTheDocument()
    expect(screen.getByText('ブラケット')).toBeInTheDocument()
    expect(screen.getByText('国図鑑')).toBeInTheDocument()
    expect(screen.getByText('学ぶ')).toBeInTheDocument()
  })

  it('5つのリンクが正しい href を持つ', () => {
    render(<BottomNav />)
    expect(screen.getByText('ホーム').closest('a')).toHaveAttribute('href', '/')
    expect(screen.getByText('日程').closest('a')).toHaveAttribute(
      'href',
      '/matches',
    )
    expect(screen.getByText('ブラケット').closest('a')).toHaveAttribute(
      'href',
      '/bracket',
    )
    expect(screen.getByText('国図鑑').closest('a')).toHaveAttribute(
      'href',
      '/countries',
    )
    expect(screen.getByText('学ぶ').closest('a')).toHaveAttribute(
      'href',
      '/rules',
    )
  })

  it('nav 要素にラベルが付く', () => {
    render(<BottomNav />)
    expect(
      screen.getByRole('navigation', { name: 'メインナビゲーション' }),
    ).toBeInTheDocument()
  })

  it('現在地（ホーム）に aria-current="page" が付く', () => {
    mocks.pathname = '/'
    render(<BottomNav />)
    expect(screen.getByText('ホーム').closest('a')).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('ホーム以外のページでホームはアクティブにならない', () => {
    mocks.pathname = '/matches'
    render(<BottomNav />)
    expect(screen.getByText('ホーム').closest('a')).not.toHaveAttribute(
      'aria-current',
    )
    expect(screen.getByText('日程').closest('a')).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('配下ページ（/countries/JPN）でも親項目がアクティブになる', () => {
    mocks.pathname = '/countries/JPN'
    render(<BottomNav />)
    expect(screen.getByText('国図鑑').closest('a')).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('各リンクは 44px 以上のタップ領域を確保する', () => {
    render(<BottomNav />)
    for (const link of screen.getAllByRole('link')) {
      expect(link.className).toContain('min-h-11')
    }
  })
})
