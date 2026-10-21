import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchBar } from './SearchBar'

describe('SearchBar', () => {
  it('reports typed input', async () => {
    const onChange = vi.fn()
    render(<SearchBar value="" onChange={onChange} />)
    await userEvent.type(screen.getByRole('searchbox', { name: '検索' }), '唐')
    expect(onChange).toHaveBeenCalledWith('唐')
  })

  it('shows a clear button only with a query and clears it', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<SearchBar value="" onChange={onChange} />)
    expect(screen.queryByRole('button', { name: '検索をクリア' })).toBeNull()
    rerender(<SearchBar value="唐揚げ" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: '検索をクリア' }))
    expect(onChange).toHaveBeenCalledWith('')
  })
})
