import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppHeader } from './AppHeader'

describe('AppHeader', () => {
  it('renders the title and the always-on privacy TrustBadge', () => {
    render(<AppHeader title="原価電卓" />)
    expect(screen.getByRole('heading', { name: '原価電卓' })).toBeInTheDocument()
    // Compact TrustBadge is icon-only: the privacy text is the lock's accessible name.
    expect(screen.getByRole('img', { name: 'データは端末内のみ' })).toBeInTheDocument()
  })

  it('shows the back button only when onBack is provided and fires it', async () => {
    const onBack = vi.fn()
    const { rerender } = render(<AppHeader title="ダッシュボード" />)
    expect(screen.queryByRole('button', { name: '戻る' })).not.toBeInTheDocument()

    rerender(<AppHeader title="唐揚げ定食" onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: '戻る' }))
    expect(onBack).toHaveBeenCalledOnce()
  })
})
