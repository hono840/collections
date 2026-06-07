import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CompletenessMeter } from './CompletenessMeter'

describe('CompletenessMeter', () => {
  it('値をパーセント表示する', () => {
    render(<CompletenessMeter value={78} />)
    expect(screen.getByText('78%')).toBeInTheDocument()
  })

  it('progressbar として aria-valuenow を持つ', () => {
    render(<CompletenessMeter value={42} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42')
  })

  it('100 を超える値は 100 に丸める', () => {
    render(<CompletenessMeter value={150} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})
