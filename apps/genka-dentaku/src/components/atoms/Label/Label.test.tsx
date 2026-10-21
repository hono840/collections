import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Label } from './Label'

describe('Label', () => {
  it('associates with a control via htmlFor', () => {
    render(<Label htmlFor="name">食材名</Label>)
    expect(screen.getByText('食材名')).toHaveAttribute('for', 'name')
  })

  it('shows a decorative required marker', () => {
    render(<Label required>食材名</Label>)
    const marker = screen.getByText('*')
    expect(marker).toHaveAttribute('aria-hidden', 'true')
  })
})
