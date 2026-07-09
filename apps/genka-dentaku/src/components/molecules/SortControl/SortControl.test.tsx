import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SortControl } from './SortControl'

describe('SortControl', () => {
  it('defaults to the worst-first order and reports changes', async () => {
    const onChange = vi.fn()
    render(<SortControl value="rate-desc" onChange={onChange} />)
    const select = screen.getByRole('combobox', { name: '並び替え' })
    expect(select).toHaveValue('rate-desc')
    expect(screen.getByRole('option', { name: '原価率が悪い順' })).toBeInTheDocument()
    await userEvent.selectOptions(select, 'name-asc')
    expect(onChange).toHaveBeenCalledWith('name-asc')
  })
})
