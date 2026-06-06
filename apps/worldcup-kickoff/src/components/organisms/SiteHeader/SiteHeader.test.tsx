import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { SiteHeader } from './SiteHeader'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

describe('SiteHeader', () => {
  it('ワードマークが表示される', () => {
    render(<SiteHeader />)
    expect(screen.getByText('キックオフ')).toBeInTheDocument()
  })

  it('ロゴはホームへのリンク', () => {
    render(<SiteHeader />)
    const link = screen.getByRole('link', { name: /ホームへ/ })
    expect(link).toHaveAttribute('href', '/')
  })

  it('banner ロール（header）として描画される', () => {
    render(<SiteHeader />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('「開幕まで」のラベルが表示される', () => {
    render(<SiteHeader />)
    expect(screen.getByText('開幕まで')).toBeInTheDocument()
  })

  it('カウントダウンがマウント後に駆動する', async () => {
    vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'))
    const { container } = render(<SiteHeader />)
    await flush()
    // compact カウントダウンに aria-label が付く
    expect(
      container.querySelector('[aria-label^="開幕まであと"]'),
    ).not.toBeNull()
  })
})
