import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from './ThemeToggle'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    document.documentElement.classList.remove('dark')
  })

  it('3つのテーマオプション（ライト、ダーク、システム）が表示される', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('radio', { name: 'ライト' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'ダーク' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'システム' })).toBeInTheDocument()
  })

  it('デフォルトでシステムが選択されている', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('radio', { name: 'システム' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })

  it('ライトをクリックすると aria-checked が切り替わる', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    await user.click(screen.getByRole('radio', { name: 'ライト' }))
    expect(screen.getByRole('radio', { name: 'ライト' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(screen.getByRole('radio', { name: 'システム' })).toHaveAttribute(
      'aria-checked',
      'false'
    )
  })

  it('ダークをクリックすると dark クラスが追加される', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    await user.click(screen.getByRole('radio', { name: 'ダーク' }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('ライトをクリックすると dark クラスが削除される', async () => {
    const user = userEvent.setup()
    document.documentElement.classList.add('dark')
    render(<ThemeToggle />)
    await user.click(screen.getByRole('radio', { name: 'ライト' }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('テーマ変更時に localStorage に保存される', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    await user.click(screen.getByRole('radio', { name: 'ダーク' }))
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark')
  })

  it('radiogroup の aria-label が設定されている', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('radiogroup', { name: 'テーマ切替' })).toBeInTheDocument()
  })
})
