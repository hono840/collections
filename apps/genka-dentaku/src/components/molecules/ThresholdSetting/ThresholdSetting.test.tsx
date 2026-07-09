import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThresholdSetting } from './ThresholdSetting'

describe('ThresholdSetting', () => {
  it('renders both bound inputs and no error for a valid order', () => {
    render(<ThresholdSetting warn={30} danger={35} onChange={() => {}} />)
    expect(screen.getByLabelText('良好の上限')).toHaveValue('30')
    expect(screen.getByLabelText('注意の上限')).toHaveValue('35')
    expect(screen.queryByText('「良好の上限」は「注意の上限」より小さくしてください')).toBeNull()
  })

  it('shows the validation message and flags invalid when warn >= danger', () => {
    render(<ThresholdSetting warn={35} danger={30} onChange={() => {}} />)
    expect(screen.getByText('「良好の上限」は「注意の上限」より小さくしてください')).toBeInTheDocument()
    expect(screen.getByLabelText('良好の上限')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('注意の上限')).toHaveAttribute('aria-invalid', 'true')
  })

  it('emits the edited warn threshold', async () => {
    const onChange = vi.fn()
    render(<ThresholdSetting warn={30} danger={35} onChange={onChange} />)
    const warn = screen.getByLabelText('良好の上限')
    await userEvent.type(warn, '2')
    // "30" + "2" typed at the end -> "302"; the component emits the parsed number.
    expect(onChange).toHaveBeenCalled()
    expect(typeof onChange.mock.calls.at(-1)?.[0].warn).toBe('number')
  })
})
