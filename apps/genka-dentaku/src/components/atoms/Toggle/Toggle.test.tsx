import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toggle } from './Toggle'

describe('Toggle', () => {
  it('is a switch reflecting the checked state', () => {
    render(<Toggle label="サンプルを表示" checked onChange={() => {}} />)
    const sw = screen.getByRole('switch', { name: 'サンプルを表示' })
    expect(sw).toBeChecked()
  })

  it('toggles on click', async () => {
    const onChange = vi.fn()
    render(<Toggle label="サンプルを表示" checked={false} onChange={onChange} />)
    await userEvent.click(screen.getByRole('switch', { name: 'サンプルを表示' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
