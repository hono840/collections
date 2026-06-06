import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PredictionButton } from './PredictionButton'

beforeEach(() => {
  localStorage.clear()
})

describe('PredictionButton', () => {
  it('勝/分/敗の3択が表示される', () => {
    render(
      <PredictionButton
        matchId="wc-001"
        homeLabel="日本"
        awayLabel="ブラジル"
      />,
    )
    expect(screen.getByRole('button', { name: '日本' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '引き分け' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ブラジル' })).toBeInTheDocument()
  })

  it('初期状態はどれも未選択（aria-pressed=false）', () => {
    render(<PredictionButton matchId="wc-001" />)
    for (const btn of screen.getAllByRole('button')) {
      expect(btn).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('クリックでその選択が aria-pressed=true になる', async () => {
    const user = userEvent.setup()
    render(<PredictionButton matchId="wc-001" homeLabel="日本" />)
    await user.click(screen.getByRole('button', { name: '日本' }))
    expect(screen.getByRole('button', { name: '日本' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('同じ選択を再度クリックすると取り消される', async () => {
    const user = userEvent.setup()
    render(<PredictionButton matchId="wc-001" homeLabel="日本" />)
    const btn = screen.getByRole('button', { name: '日本' })
    await user.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    await user.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  it('予想は localStorage に永続化される', async () => {
    const user = userEvent.setup()
    render(<PredictionButton matchId="wc-042" drawLabel="引き分け" />)
    await user.click(screen.getByRole('button', { name: '引き分け' }))
    const raw = localStorage.getItem('wck:predictions')
    expect(raw).not.toBeNull()
    expect(raw).toContain('wc-042')
    expect(raw).toContain('draw')
  })

  it('group ロールに予想ラベルが付く', () => {
    render(<PredictionButton matchId="wc-001" />)
    expect(
      screen.getByRole('group', { name: '勝敗予想' }),
    ).toBeInTheDocument()
  })
})
