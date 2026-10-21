import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecalcIndicator } from './RecalcIndicator'

describe('RecalcIndicator', () => {
  it('is a polite live region that announces the recomputed count when visible', () => {
    render(<RecalcIndicator visible count={3} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('3件のメニューを再計算しました')).toBeInTheDocument()
  })

  it('keeps the live region mounted but empty while hidden', () => {
    render(<RecalcIndicator visible={false} count={3} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('3件のメニューを再計算しました')).not.toBeInTheDocument()
  })
})
