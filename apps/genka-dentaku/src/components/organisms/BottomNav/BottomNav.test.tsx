import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BottomNav } from './BottomNav'

describe('BottomNav', () => {
  it('marks the active tab with aria-current and navigates on tap', async () => {
    const onNavigate = vi.fn()
    render(<BottomNav active="dashboard" onNavigate={onNavigate} />)

    const dashboard = screen.getByRole('button', { name: 'ダッシュボード' })
    expect(dashboard).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '食材' })).not.toHaveAttribute('aria-current')

    await userEvent.click(screen.getByRole('button', { name: '設定' }))
    expect(onNavigate).toHaveBeenCalledWith('settings')
  })

  it('disables navigation when disabled', async () => {
    const onNavigate = vi.fn()
    render(<BottomNav active="dashboard" onNavigate={onNavigate} disabled />)
    await userEvent.click(screen.getByRole('button', { name: '食材' }))
    expect(onNavigate).not.toHaveBeenCalled()
  })
})
