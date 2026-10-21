import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LegalPageLayout } from './LegalPageLayout'

describe('LegalPageLayout', () => {
  it('renders the title as an h1 and shows the children', () => {
    render(
      <LegalPageLayout title="プライバシーポリシー">
        <h2>収集しない情報</h2>
        <p>レシピや仕入価格は端末外に送信しません。</p>
      </LegalPageLayout>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'プライバシーポリシー' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '収集しない情報' })).toBeInTheDocument()
    expect(screen.getByText('レシピや仕入価格は端末外に送信しません。')).toBeInTheDocument()
  })

  it('shows the last-updated date only when provided', () => {
    const { rerender } = render(<LegalPageLayout title="規約">本文</LegalPageLayout>)
    expect(screen.queryByText(/最終更新/)).toBeNull()

    rerender(
      <LegalPageLayout title="規約" updatedAt="2026年7月9日">
        本文
      </LegalPageLayout>,
    )
    expect(screen.getByText('最終更新: 2026年7月9日')).toBeInTheDocument()
  })
})
