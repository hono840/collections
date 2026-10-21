import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SegmentedControl } from './SegmentedControl'

const opts = [
  { value: 'ex' as const, label: '税抜' },
  { value: 'in' as const, label: '税込' },
]

describe('SegmentedControl', () => {
  it('is a radiogroup marking the selected option', () => {
    render(<SegmentedControl ariaLabel="税設定" options={opts} value="ex" onChange={() => {}} />)
    expect(screen.getByRole('radiogroup', { name: '税設定' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '税抜' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: '税込' })).toHaveAttribute('aria-checked', 'false')
  })

  it('selects on click', async () => {
    const onChange = vi.fn()
    render(<SegmentedControl ariaLabel="税設定" options={opts} value="ex" onChange={onChange} />)
    await userEvent.click(screen.getByRole('radio', { name: '税込' }))
    expect(onChange).toHaveBeenCalledWith('in')
  })

  it('moves selection with the arrow keys', async () => {
    const onChange = vi.fn()
    render(<SegmentedControl ariaLabel="税設定" options={opts} value="ex" onChange={onChange} />)
    const selected = screen.getByRole('radio', { name: '税抜' })
    selected.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('in')
  })
})
