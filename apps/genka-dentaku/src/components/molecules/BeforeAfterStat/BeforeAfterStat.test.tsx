import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BeforeAfterStat } from './BeforeAfterStat'

describe('BeforeAfterStat', () => {
  it('shows before, after and a coloured delta', () => {
    render(<BeforeAfterStat label="売価" before="￥900" after="￥1,020" delta="+￥120" deltaTone="good" />)
    expect(screen.getByText('￥900')).toBeInTheDocument()
    expect(screen.getByText('￥1,020')).toBeInTheDocument()
    expect(screen.getByText('+￥120')).toHaveClass('text-good-fg')
  })

  it('adds a shape icon per side when a status is given (not colour-only)', () => {
    const { container } = render(
      <BeforeAfterStat before="35.0%" after="30.0%" beforeStatus="caution" afterStatus="good" />,
    )
    // two side icons rendered
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2)
  })
})
