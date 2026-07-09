import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('reflects checked state and is labelled', () => {
    render(<Checkbox label="全メニュー" checked onChange={() => {}} />)
    expect(screen.getByRole('checkbox', { name: '全メニュー' })).toBeChecked()
  })

  it('emits the next boolean on click', async () => {
    const onChange = vi.fn()
    render(<Checkbox label="全メニュー" checked={false} onChange={onChange} />)
    await userEvent.click(screen.getByRole('checkbox', { name: '全メニュー' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
