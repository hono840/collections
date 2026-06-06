import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FavoriteToggle } from './FavoriteToggle'
import { FavoriteTeamProvider } from '@/components/providers/FavoriteTeamProvider'

beforeEach(() => {
  localStorage.clear()
})

function renderWithProvider(ui: React.ReactElement) {
  return render(<FavoriteTeamProvider>{ui}</FavoriteTeamProvider>)
}

describe('FavoriteToggle', () => {
  it('初期は推し国でない（aria-pressed=false）', () => {
    renderWithProvider(<FavoriteToggle teamCode="JPN" nameJa="日本" />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('クリックで推し国になる（aria-pressed=true）', async () => {
    const user = userEvent.setup()
    renderWithProvider(<FavoriteToggle teamCode="JPN" nameJa="日本" />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('推し国は localStorage に保存される', async () => {
    const user = userEvent.setup()
    renderWithProvider(<FavoriteToggle teamCode="JPN" nameJa="日本" />)
    await user.click(screen.getByRole('button'))
    expect(localStorage.getItem('wck:favorite-team')).toContain('JPN')
  })

  it('再クリックで推し国が外れる', async () => {
    const user = userEvent.setup()
    renderWithProvider(<FavoriteToggle teamCode="JPN" nameJa="日本" />)
    const btn = screen.getByRole('button')
    await user.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    await user.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  it('aria-label に国名が含まれる', () => {
    renderWithProvider(<FavoriteToggle teamCode="JPN" nameJa="日本" />)
    expect(
      screen.getByRole('button', { name: /日本を推し国にする/ }),
    ).toBeInTheDocument()
  })

  it('showLabel でテキストが併記される', () => {
    renderWithProvider(
      <FavoriteToggle teamCode="JPN" nameJa="日本" showLabel />,
    )
    expect(screen.getByText('推す')).toBeInTheDocument()
  })
})
