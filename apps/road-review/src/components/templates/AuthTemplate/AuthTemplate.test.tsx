import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { AuthTemplate } from './AuthTemplate'

describe('AuthTemplate (login screens layout)', () => {
  it('renders title as h1, description and children inside the main landmark', () => {
    render(
      <AuthTemplate title="ログイン" description="説明文" footer="フッター文">
        <p>本文スロット</p>
      </AuthTemplate>,
    )
    const main = screen.getByRole('main')
    expect(within(main).getByRole('heading', { level: 1, name: 'ログイン' })).toBeInTheDocument()
    expect(within(main).getByText('説明文')).toBeInTheDocument()
    expect(within(main).getByText('本文スロット')).toBeInTheDocument()
    expect(within(main).getByText('公道レビュー')).toBeInTheDocument()
  })

  it('renders the footer slot in a contentinfo landmark outside main', () => {
    render(
      <AuthTemplate title="ログイン" footer="フッター文">
        <p>本文スロット</p>
      </AuthTemplate>,
    )
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByText('フッター文')).toBeInTheDocument()
    expect(screen.getByRole('main')).not.toContainElement(footer)
  })

  it('omits description and footer when not provided', () => {
    render(
      <AuthTemplate title="ログイン">
        <p>本文スロット</p>
      </AuthTemplate>,
    )
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
    expect(screen.queryByText('説明文')).not.toBeInTheDocument()
  })

  it('hides the decorative contour backdrop from assistive tech', () => {
    const { container } = render(
      <AuthTemplate title="ログイン">
        <p>本文スロット</p>
      </AuthTemplate>,
    )
    const backdrop = container.querySelector('svg')
    expect(backdrop).not.toBeNull()
    expect(backdrop).toHaveAttribute('aria-hidden', 'true')
    expect(backdrop).toHaveAttribute('focusable', 'false')
  })
})
