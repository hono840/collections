import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SemaphoreLegend } from './SemaphoreLegend'

describe('SemaphoreLegend', () => {
  it('lists the three statuses with their current threshold ranges', () => {
    render(<SemaphoreLegend warn={30} danger={35} />)
    expect(screen.getByText('良好')).toBeInTheDocument()
    expect(screen.getByText('注意')).toBeInTheDocument()
    expect(screen.getByText('危険')).toBeInTheDocument()
    expect(screen.getByText('30.0% 未満')).toBeInTheDocument()
    expect(screen.getByText('30.0% 〜 35.0%')).toBeInTheDocument()
    expect(screen.getByText('35.0% 超')).toBeInTheDocument()
  })

  it('offers a threshold-edit link when provided', async () => {
    const onEdit = vi.fn()
    render(<SemaphoreLegend warn={30} danger={35} onEditThresholds={onEdit} />)
    await userEvent.click(screen.getByRole('button', { name: '閾値を変更' }))
    expect(onEdit).toHaveBeenCalledOnce()
  })
})
