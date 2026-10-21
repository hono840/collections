import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarketingTemplate } from './MarketingTemplate'

describe('MarketingTemplate', () => {
  it('renders the brand logo linking home and the primary CTA to the app', () => {
    render(<MarketingTemplate>本文コンテンツ</MarketingTemplate>)
    expect(screen.getByRole('link', { name: '原価電卓' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: '無料で使ってみる' })).toHaveAttribute('href', '/app')
  })

  it('links nav items to pricing and faq', () => {
    render(<MarketingTemplate>本文</MarketingTemplate>)
    expect(screen.getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/faq')
    for (const link of screen.getAllByRole('link', { name: '料金' })) {
      expect(link).toHaveAttribute('href', '/pricing')
    }
  })

  it('renders the footer legal links and the privacy pledge', () => {
    render(<MarketingTemplate>本文</MarketingTemplate>)
    expect(screen.getByRole('link', { name: '特定商取引法に基づく表記' })).toHaveAttribute('href', '/legal/tokushoho')
    expect(screen.getByRole('link', { name: 'プライバシーポリシー' })).toHaveAttribute('href', '/legal/privacy')
    expect(screen.getByText('データは端末内のみ。レシピと仕入価格は外部に送信しません。')).toBeInTheDocument()
    expect(screen.getByText(/© \d{4} 原価電卓/)).toBeInTheDocument()
  })

  it('renders its children', () => {
    render(<MarketingTemplate>ユニークな本文</MarketingTemplate>)
    expect(screen.getByText('ユニークな本文')).toBeInTheDocument()
  })
})
