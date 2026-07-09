import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Chip } from './Chip'

describe('Chip', () => {
  it('renders its label with no remove button by default', () => {
    render(<Chip label="サンプル" />)
    expect(screen.getByText('サンプル')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders an accessible remove button and fires onRemove', async () => {
    const onRemove = vi.fn()
    render(<Chip label="鶏もも" onRemove={onRemove} />)
    await userEvent.click(screen.getByRole('button', { name: '鶏ももを削除' }))
    expect(onRemove).toHaveBeenCalledOnce()
  })
})
