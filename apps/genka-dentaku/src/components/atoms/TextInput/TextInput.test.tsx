import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TextInput } from './TextInput'

describe('TextInput', () => {
  it('is a 16px textbox (iOS zoom-safe) and accepts typing', async () => {
    const onChange = vi.fn()
    render(<TextInput aria-label="食材名" value="" onChange={onChange} />)
    const input = screen.getByRole('textbox', { name: '食材名' })
    expect(input).toHaveClass('text-body')
    await userEvent.type(input, 'a')
    expect(onChange).toHaveBeenCalled()
  })

  it('flags aria-invalid on error', () => {
    render(<TextInput aria-label="ライセンスキー" error readOnly value="x" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })
})
