import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarketingHero } from './MarketingHero'

describe('MarketingHero', () => {
  it('renders the exact fixed H1', () => {
    render(<MarketingHero />)
    const h1 = screen.getByRole('heading', { level: 1 })
    // H1 は原文固定（architecture §8.1）。一字でも変わったら失敗させる。
    expect(h1).toHaveTextContent('仕入れ値を1つ直すだけで、全メニューの原価率が即再計算。')
  })

  it('renders the sub-copy with the local-only privacy promise', () => {
    render(<MarketingHero />)
    expect(screen.getByText(/レシピと仕入価格は端末の外に出ません/)).toBeInTheDocument()
    expect(screen.getByText(/POS不要・登録不要/)).toBeInTheDocument()
  })

  it('links the primary CTA to the app and the secondary CTA to pricing', () => {
    render(<MarketingHero />)
    expect(screen.getByRole('link', { name: /無料で使ってみる/ })).toHaveAttribute('href', '/app')
    expect(screen.getByRole('link', { name: '料金を見る' })).toHaveAttribute('href', '/pricing')
  })

  it('shows the trust badge and the before/after wedge cost-rate pills', () => {
    render(<MarketingHero />)
    expect(screen.getByText('データは端末内のみ')).toBeInTheDocument()
    // 静的 before/after: 24.8%（良好）→ 30.9%（注意）
    expect(screen.getByText('24.8%')).toBeInTheDocument()
    expect(screen.getByText('30.9%')).toBeInTheDocument()
  })
})
