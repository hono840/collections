import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KpiCard } from './KpiCard'

describe('KpiCard', () => {
  it('renders label, value, unit and caption', () => {
    render(<KpiCard label="平均原価率" value="28.4%" caption="前回比 -1.2pt" />)
    expect(screen.getByText('平均原価率')).toBeInTheDocument()
    expect(screen.getByText('28.4%')).toBeInTheDocument()
    expect(screen.getByText('前回比 -1.2pt')).toBeInTheDocument()
  })

  it('colours the value with the danger semaphore when status is danger', () => {
    render(<KpiCard label="危険メニュー数" value={3} status="danger" />)
    expect(screen.getByText('3')).toHaveClass('text-danger-fg')
  })
})
