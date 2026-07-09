import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CostRatePill } from './CostRatePill'

describe('CostRatePill', () => {
  it('encodes status four ways: colour + icon + number + label', () => {
    const { container } = render(<CostRatePill rate={32} status="caution" />)
    // number + label are both present (not colour-only)
    expect(screen.getByText('32.0%')).toBeInTheDocument()
    expect(screen.getByText('注意')).toBeInTheDocument()
    // an icon shape is rendered
    expect(container.querySelector('svg')).not.toBeNull()
    // screen-reader label states rate AND status word
    expect(screen.getByLabelText('原価率32.0%、注意')).toBeInTheDocument()
  })

  it('renders 要確認 for a null rate', () => {
    render(<CostRatePill rate={null} status="attention" />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText('要確認')).toBeInTheDocument()
    expect(screen.getByLabelText('原価率 未算出、要確認')).toBeInTheDocument()
  })

  it('uses the danger label + shape for high cost rates', () => {
    render(<CostRatePill rate={41.2} status="danger" />)
    expect(screen.getByText('危険')).toBeInTheDocument()
    expect(screen.getByLabelText('原価率41.2%、危険')).toBeInTheDocument()
  })
})
