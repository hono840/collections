import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Slider } from './Slider'

describe('Slider', () => {
  it('exposes slider semantics with the current value and a value text', () => {
    render(<Slider ariaLabel="目標原価率" value={30} min={0} max={100} valueText="30%" onChange={() => {}} />)
    const slider = screen.getByRole('slider', { name: '目標原価率' })
    expect(slider).toHaveValue('30')
    expect(slider).toHaveAttribute('min', '0')
    expect(slider).toHaveAttribute('max', '100')
    expect(slider).toHaveAttribute('aria-valuetext', '30%')
  })

  it('emits a number on change', () => {
    const onChange = vi.fn()
    render(<Slider ariaLabel="目標原価率" value={30} onChange={onChange} ticks={[30, 35]} />)
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '35' } })
    expect(onChange).toHaveBeenCalledWith(35)
  })
})
