import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SimulationSlider } from './SimulationSlider'

describe('SimulationSlider', () => {
  it('shows the target and the caller-computed suggested price', () => {
    render(<SimulationSlider target={30} suggestedPrice={680} onChange={() => {}} />)
    expect(screen.getByRole('slider', { name: '目標原価率' })).toHaveValue('30')
    expect(screen.getByRole('textbox', { name: '目標原価率' })).toHaveValue('30')
    expect(screen.getByText('推奨売価')).toBeInTheDocument()
    expect(screen.getByText('￥680')).toBeInTheDocument()
  })

  it('reports the new target from the slider', () => {
    const onChange = vi.fn()
    render(<SimulationSlider target={30} suggestedPrice={680} onChange={onChange} />)
    fireEvent.change(screen.getByRole('slider', { name: '目標原価率' }), { target: { value: '35' } })
    expect(onChange).toHaveBeenCalledWith(35)
  })

  it('shows 「—」 when the price is not computable', () => {
    render(<SimulationSlider target={30} suggestedPrice={null} onChange={() => {}} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
