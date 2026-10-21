import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ComputedReadout } from './ComputedReadout'

describe('ComputedReadout', () => {
  it('formats the value and shows the unit', () => {
    render(<ComputedReadout label="有効単価" value={0.25} unit="円/g" formatValue={(n) => n.toFixed(2)} />)
    expect(screen.getByText('有効単価')).toBeInTheDocument()
    expect(screen.getByText('0.25')).toBeInTheDocument()
    expect(screen.getByText('円/g')).toBeInTheDocument()
  })

  it('renders the placeholder and hides the unit when value is null', () => {
    render(<ComputedReadout label="有効単価" value={null} unit="円/g" />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('円/g')).toBeNull()
  })
})
