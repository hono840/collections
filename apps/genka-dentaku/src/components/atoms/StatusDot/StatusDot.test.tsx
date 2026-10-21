import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { AlertStatus } from '@/lib/domain'
import { StatusDot } from './StatusDot'
import { SEMAPHORE } from './semaphore'

describe('StatusDot', () => {
  it('announces the status word via the shape icon when no visible label', () => {
    render(<StatusDot status="danger" />)
    expect(screen.getByRole('img', { name: '危険' })).toBeInTheDocument()
  })

  it('renders a visible label and makes the shape decorative', () => {
    const { container } = render(<StatusDot status="good" showLabel />)
    expect(screen.getByText('良好')).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('encodes every status with a distinct shape + colour + label (never colour-only)', () => {
    const statuses: AlertStatus[] = ['good', 'caution', 'danger', 'attention']
    const icons = new Set(statuses.map((s) => SEMAPHORE[s].icon))
    const fgs = new Set(statuses.map((s) => SEMAPHORE[s].fg))
    // 4 distinct shapes and 4 distinct colours -> not colour-dependent alone.
    expect(icons.size).toBe(4)
    expect(fgs.size).toBe(4)
  })
})
