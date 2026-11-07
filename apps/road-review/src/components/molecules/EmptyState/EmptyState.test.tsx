import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from './EmptyState'

// Contract: EmptyState({ message: string; actionLabel?: string; actionHref?: string })
// E-01 (UX 5): "まだ道が登録されていません。最初の道を登録しましょう" + "道を登録" -> /roads/new

const E01 = 'まだ道が登録されていません。最初の道を登録しましょう'

describe('EmptyState', () => {
  it('shows the message and a link-styled action to the given href', () => {
    render(<EmptyState message={E01} actionLabel="道を登録" actionHref="/roads/new" />)

    expect(screen.getByText(E01)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '道を登録' })).toHaveAttribute('href', '/roads/new')
  })

  it('renders only the message when no action is given', () => {
    render(<EmptyState message="道の情報の履歴はありません。" />)
    expect(screen.getByText('道の情報の履歴はありません。')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('any illustration is decorative (hidden from assistive tech)', () => {
    const { container } = render(<EmptyState message={E01} actionLabel="道を登録" actionHref="/roads/new" />)
    for (const graphic of container.querySelectorAll('svg, img')) {
      const hidden = graphic.getAttribute('aria-hidden') === 'true' || graphic.getAttribute('alt') === ''
      expect(hidden).toBe(true)
    }
  })
})
