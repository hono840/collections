import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlanToggle } from './PlanToggle'

describe('PlanToggle', () => {
  it('reflects the annual default and shows the saving badge', () => {
    render(<PlanToggle cycle="annual" onChange={() => {}} />)
    expect(screen.getByRole('radio', { name: '年額' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('2ヶ月分お得')).toBeInTheDocument()
  })

  it('switches to monthly', async () => {
    const onChange = vi.fn()
    render(<PlanToggle cycle="annual" onChange={onChange} />)
    await userEvent.click(screen.getByRole('radio', { name: '月額' }))
    expect(onChange).toHaveBeenCalledWith('monthly')
  })
})
