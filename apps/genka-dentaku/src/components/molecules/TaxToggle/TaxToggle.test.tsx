import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaxToggle } from './TaxToggle'

describe('TaxToggle', () => {
  it('switches between 税込 and 税抜 keeping the rate', async () => {
    const onChange = vi.fn()
    render(<TaxToggle includesTax taxRate={10} onChange={onChange} />)
    expect(screen.getByRole('radio', { name: '税込' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('radio', { name: '税抜' }))
    expect(onChange).toHaveBeenCalledWith({ includesTax: false, taxRate: 10 })
  })

  it('changes the tax rate keeping the inclusive flag', async () => {
    const onChange = vi.fn()
    render(<TaxToggle includesTax taxRate={10} onChange={onChange} />)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '税率' }), '8')
    expect(onChange).toHaveBeenCalledWith({ includesTax: true, taxRate: 8 })
  })
})
