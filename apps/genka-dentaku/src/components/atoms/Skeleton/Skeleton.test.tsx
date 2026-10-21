import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('is decorative and honours explicit dimensions', () => {
    const { container } = render(<Skeleton w={120} h={16} />)
    const el = container.firstElementChild as HTMLElement
    expect(el).toHaveAttribute('aria-hidden', 'true')
    expect(el.style.width).toBe('120px')
    expect(el.style.height).toBe('16px')
  })
})
