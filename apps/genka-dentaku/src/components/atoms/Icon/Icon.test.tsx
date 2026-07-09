import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Lock } from 'lucide-react'
import { Icon } from './Icon'

describe('Icon', () => {
  it('is decorative (aria-hidden) by default', () => {
    const { container } = render(<Icon icon={Lock} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('is announced as an image when a title is provided', () => {
    render(<Icon icon={Lock} title="鍵" />)
    const img = screen.getByRole('img', { name: '鍵' })
    expect(img).toBeInTheDocument()
    expect(img).not.toHaveAttribute('aria-hidden')
  })

  it('applies the size map (lg -> 24px)', () => {
    const { container } = render(<Icon icon={Lock} size="lg" />)
    expect(container.querySelector('svg')).toHaveAttribute('width', '24')
  })
})
