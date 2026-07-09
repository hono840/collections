import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CostRateMeter } from './CostRateMeter'

describe('CostRateMeter', () => {
  it('is a meter whose value text states percent and status', () => {
    render(<CostRateMeter rate={24.8} warn={30} danger={35} />)
    const meter = screen.getByRole('meter', { name: '原価率メーター' })
    expect(meter).toHaveAttribute('aria-valuenow', '24.8')
    expect(meter).toHaveAttribute('aria-valuetext', '24.8%、良好')
  })

  it('reports 未算出 with no value when rate is null', () => {
    render(<CostRateMeter rate={null} warn={30} danger={35} />)
    const meter = screen.getByRole('meter')
    expect(meter).not.toHaveAttribute('aria-valuenow')
    expect(meter).toHaveAttribute('aria-valuetext', '未算出')
  })
})
