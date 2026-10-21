import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UnitSelect } from './UnitSelect'

describe('UnitSelect', () => {
  it('groups weight / volume / count preset units', () => {
    render(<UnitSelect value="g" onChange={() => {}} />)
    const select = screen.getByRole('combobox', { name: '単位' })
    // grouped options are present
    expect(screen.getByRole('option', { name: 'kg' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'ml' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '個' })).toBeInTheDocument()
    expect(select).toHaveValue('g')
  })

  it('reports the selected preset', async () => {
    const onChange = vi.fn()
    render(<UnitSelect value="g" onChange={onChange} />)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '単位' }), 'kg')
    expect(onChange).toHaveBeenCalledWith('kg')
  })

  it('offers a free-entry field for a custom (non-preset) value', () => {
    render(<UnitSelect value="房" allowCustom onChange={() => {}} />)
    // select falls back to the custom option, and a free-text field shows the value
    expect(screen.getByRole('combobox', { name: '単位' })).toHaveValue('__custom__')
    expect(screen.getByRole('textbox', { name: '単位（自由入力）' })).toHaveValue('房')
  })
})
