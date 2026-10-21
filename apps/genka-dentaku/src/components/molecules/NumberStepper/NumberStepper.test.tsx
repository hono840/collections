import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NumberStepper } from './NumberStepper'

describe('NumberStepper', () => {
  it('increments and decrements by step', async () => {
    const onChange = vi.fn()
    render(<NumberStepper ariaLabel="使用量" value={10} step={5} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: '増やす' }))
    expect(onChange).toHaveBeenLastCalledWith(15)
    await userEvent.click(screen.getByRole('button', { name: '減らす' }))
    expect(onChange).toHaveBeenLastCalledWith(5)
  })

  it('clamps to min and disables the decrement button at the bound', async () => {
    const onChange = vi.fn()
    render(<NumberStepper ariaLabel="使用量" value={0} min={0} onChange={onChange} />)
    expect(screen.getByRole('button', { name: '減らす' })).toBeDisabled()
  })
})
