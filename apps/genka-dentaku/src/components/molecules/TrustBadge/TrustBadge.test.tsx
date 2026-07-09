import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrustBadge } from './TrustBadge'

describe('TrustBadge', () => {
  it('shows the privacy copy in the full variant', () => {
    render(<TrustBadge />)
    expect(screen.getByText('データは端末内のみ')).toBeInTheDocument()
  })

  it('keeps the message accessible in the compact (icon-only) variant', () => {
    render(<TrustBadge variant="compact" />)
    expect(screen.getByRole('img', { name: 'データは端末内のみ' })).toBeInTheDocument()
  })
})
