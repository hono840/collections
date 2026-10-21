import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HelperText } from './HelperText'

describe('HelperText', () => {
  it('renders muted hint text without an icon', () => {
    const { container } = render(<HelperText>1以上を入力してください</HelperText>)
    expect(screen.getByText('1以上を入力してください')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()
  })

  it('pairs danger tone with a warning icon (not colour-only)', () => {
    const { container } = render(<HelperText tone="danger">1以上を入力してください</HelperText>)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('exposes an id for aria-describedby wiring', () => {
    render(<HelperText id="qty-error" tone="danger">エラー</HelperText>)
    expect(screen.getByText('エラー').closest('p')).toHaveAttribute('id', 'qty-error')
  })
})
