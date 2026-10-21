import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from './Select'

const options = [
  { value: 'rate-desc', label: '原価率が悪い順' },
  { value: 'name-asc', label: '名前順' },
]

describe('Select', () => {
  it('renders options and reports the chosen value', async () => {
    const onChange = vi.fn()
    render(<Select aria-label="並び替え" options={options} value="rate-desc" onChange={onChange} />)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '並び替え' }), 'name-asc')
    expect(onChange).toHaveBeenCalledWith('name-asc')
  })
})
