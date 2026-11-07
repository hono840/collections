import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { AppShellTemplate } from './AppShellTemplate'

describe('AppShellTemplate (signed-in layout)', () => {
  it('renders header slot, then children inside the main landmark', () => {
    render(
      <AppShellTemplate header={<header>ヘッダースロット</header>}>
        <p>本文スロット</p>
      </AppShellTemplate>,
    )
    const banner = screen.getByRole('banner')
    const main = screen.getByRole('main')
    expect(within(banner).getByText('ヘッダースロット')).toBeInTheDocument()
    expect(within(main).getByText('本文スロット')).toBeInTheDocument()
    expect(main).not.toContainElement(banner)
    // header comes before main in document order
    expect(banner.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('gives main id="main" (skip-link target)', () => {
    render(
      <AppShellTemplate header={<header>ヘッダー</header>}>
        <p>本文</p>
      </AppShellTemplate>,
    )
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })

  it('renders the overlay slot outside main', () => {
    render(
      <AppShellTemplate header={<header>ヘッダー</header>} overlay={<div>オーバーレイ</div>}>
        <p>本文</p>
      </AppShellTemplate>,
    )
    const overlay = screen.getByText('オーバーレイ')
    expect(screen.getByRole('main')).not.toContainElement(overlay)
  })

  it('renders without an overlay', () => {
    render(
      <AppShellTemplate header={<header>ヘッダー</header>}>
        <p>本文</p>
      </AppShellTemplate>,
    )
    expect(screen.queryByText('オーバーレイ')).not.toBeInTheDocument()
  })
})
