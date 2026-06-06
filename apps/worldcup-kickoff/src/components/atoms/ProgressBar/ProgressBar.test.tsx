import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('role=progressbar を持つ', () => {
    render(<ProgressBar value={50} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('aria-valuenow に現在値が設定される', () => {
    render(<ProgressBar value={3} max={10} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '3')
    expect(bar).toHaveAttribute('aria-valuemax', '10')
  })

  it('value が max を超えても clamp される', () => {
    render(<ProgressBar value={150} max={100} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100',
    )
  })

  it('負の value は 0 に clamp される', () => {
    render(<ProgressBar value={-10} max={100} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0',
    )
  })

  it('label が aria-label として設定される', () => {
    render(<ProgressBar value={50} label="学習進捗" />)
    expect(
      screen.getByRole('progressbar', { name: '学習進捗' }),
    ).toBeInTheDocument()
  })

  it('gold カラーの塗りが適用される', () => {
    const { container } = render(<ProgressBar value={50} color="gold" />)
    const fill = container.querySelector('.bg-gold-400')
    expect(fill).toBeInTheDocument()
  })

  it('進捗率が width スタイルに反映される', () => {
    const { container } = render(<ProgressBar value={25} max={100} />)
    const fill = container.querySelector('[style]') as HTMLElement
    expect(fill.style.width).toBe('25%')
  })
})
