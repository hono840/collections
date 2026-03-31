import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Header } from './Header'

// We need to be able to change the pathname per test
let mockPathname = '/dashboard'

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

describe('Header', () => {
  it('/dashboard の場合「ダッシュボード」が表示される', () => {
    mockPathname = '/dashboard'
    render(<Header />)
    expect(
      screen.getByRole('heading', { name: 'ダッシュボード' })
    ).toBeInTheDocument()
  })

  it('/transactions の場合「トランザクション」が表示される', () => {
    mockPathname = '/transactions'
    render(<Header />)
    expect(
      screen.getByRole('heading', { name: 'トランザクション' })
    ).toBeInTheDocument()
  })

  it('/budgets の場合「予算」が表示される', () => {
    mockPathname = '/budgets'
    render(<Header />)
    expect(
      screen.getByRole('heading', { name: '予算' })
    ).toBeInTheDocument()
  })

  it('/categories の場合「カテゴリ」が表示される', () => {
    mockPathname = '/categories'
    render(<Header />)
    expect(
      screen.getByRole('heading', { name: 'カテゴリ' })
    ).toBeInTheDocument()
  })

  it('/reports の場合「レポート」が表示される', () => {
    mockPathname = '/reports'
    render(<Header />)
    expect(
      screen.getByRole('heading', { name: 'レポート' })
    ).toBeInTheDocument()
  })

  it('/settings の場合「設定」が表示される', () => {
    mockPathname = '/settings'
    render(<Header />)
    expect(
      screen.getByRole('heading', { name: '設定' })
    ).toBeInTheDocument()
  })

  it('未知のパスの場合は何も表示されない', () => {
    mockPathname = '/unknown-path'
    const { container } = render(<Header />)
    expect(container.innerHTML).toBe('')
  })

  it('h1 タグで表示される', () => {
    mockPathname = '/dashboard'
    render(<Header />)
    expect(
      screen.getByRole('heading', { level: 1 })
    ).toBeInTheDocument()
  })
})
