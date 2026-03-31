import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sidebar } from './Sidebar'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signOut: vi.fn().mockResolvedValue({}) },
  }),
}))

// Mock matchMedia and localStorage for ThemeToggle
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
})

describe('Sidebar', () => {
  it('アプリ名「Budget App」が表示される', () => {
    render(<Sidebar userEmail="test@example.com" />)
    expect(screen.getByText('Budget App')).toBeInTheDocument()
  })

  it('全てのナビゲーション項目が表示される', () => {
    render(<Sidebar userEmail="test@example.com" />)
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument()
    expect(screen.getByText('トランザクション')).toBeInTheDocument()
    expect(screen.getByText('予算')).toBeInTheDocument()
    expect(screen.getByText('カテゴリ')).toBeInTheDocument()
    expect(screen.getByText('レポート')).toBeInTheDocument()
    expect(screen.getByText('設定')).toBeInTheDocument()
  })

  it('現在のパスの項目にアクティブスタイルが適用される', () => {
    render(<Sidebar userEmail="test@example.com" />)
    const dashboardLink = screen.getByText('ダッシュボード').closest('a')
    expect(dashboardLink?.className).toContain('bg-brand-50')
  })

  it('非アクティブなナビ項目にはアクティブスタイルが適用されない', () => {
    render(<Sidebar userEmail="test@example.com" />)
    const txLink = screen.getByText('トランザクション').closest('a')
    expect(txLink?.className).not.toContain('bg-brand-50')
  })

  it('ユーザーのメールアドレスが表示される', () => {
    render(<Sidebar userEmail="test@example.com" />)
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('ユーザーのイニシャルが表示される', () => {
    render(<Sidebar userEmail="test@example.com" />)
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('ログアウトボタンが表示される', () => {
    render(<Sidebar userEmail="test@example.com" />)
    expect(screen.getByLabelText('ログアウト')).toBeInTheDocument()
  })

  it('ナビゲーションリンクが正しい href を持つ', () => {
    render(<Sidebar userEmail="test@example.com" />)
    const dashLink = screen.getByText('ダッシュボード').closest('a')
    expect(dashLink).toHaveAttribute('href', '/dashboard')
    const txLink = screen.getByText('トランザクション').closest('a')
    expect(txLink).toHaveAttribute('href', '/transactions')
  })
})
