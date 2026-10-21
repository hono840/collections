import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Crown } from 'lucide-react'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders its label', () => {
    render(<Badge>サンプル</Badge>)
    expect(screen.getByText('サンプル')).toBeInTheDocument()
  })

  it('renders a decorative leading icon for the PRO mark', () => {
    const { container } = render(
      <Badge tone="pro" iconStart={Crown}>
        PRO
      </Badge>,
    )
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
