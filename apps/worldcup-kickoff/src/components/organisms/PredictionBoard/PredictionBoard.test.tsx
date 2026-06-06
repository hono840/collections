import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PredictionBoard, type PredictionMatchView } from './PredictionBoard'

const matches: PredictionMatchView[] = [
  {
    matchId: 'wc-001',
    phase: 'group',
    home: { flagEmoji: '🇯🇵', nameJa: '日本' },
    away: { flagEmoji: '🇧🇷', nameJa: 'ブラジル' },
    kickoffUtc: '2026-06-11T18:00:00Z',
    stadiumName: 'スタジアムA',
    roundLabelJa: 'グループステージ',
    predictable: true,
  },
  {
    matchId: 'wc-200',
    phase: 'knockout',
    home: null,
    away: null,
    homePlaceholder: 'A組1位',
    awayPlaceholder: 'B組2位',
    kickoffUtc: '2026-07-01T18:00:00Z',
    stadiumName: 'スタジアムB',
    roundLabelJa: 'ベスト16',
    predictable: false,
  },
]

afterEach(() => {
  localStorage.clear()
})

describe('PredictionBoard', () => {
  it('予想可能な試合数を分母に進捗を表示する', () => {
    render(<PredictionBoard matches={matches} />)
    // predictable は1件のみ → 0/1
    expect(screen.getByText('/1 試合')).toBeInTheDocument()
  })

  it('予想可能カードには勝敗予想ボタンを表示する', () => {
    render(<PredictionBoard matches={matches} />)
    expect(
      screen.getByRole('group', { name: '勝敗予想' }),
    ).toBeInTheDocument()
  })

  it('未確定の決勝Tカードはロック文言を表示し予想不可', () => {
    render(<PredictionBoard matches={matches} />)
    expect(
      screen.getByText('対戦カードが決まると予想できます'),
    ).toBeInTheDocument()
  })

  it('予想を押すと進捗（progressbar の値）が増える', async () => {
    const user = userEvent.setup()
    render(<PredictionBoard matches={matches} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '0')
    const group = screen.getByRole('group', { name: '勝敗予想' })
    await user.click(within(group).getByText('日本'))
    expect(bar).toHaveAttribute('aria-valuenow', '1')
  })

  it('決勝Tフィルタでグループ試合を隠す', async () => {
    const user = userEvent.setup()
    render(<PredictionBoard matches={matches} />)
    await user.click(screen.getByRole('radio', { name: '決勝T' }))
    expect(screen.queryByRole('group', { name: '勝敗予想' })).not.toBeInTheDocument()
    expect(
      screen.getByText('対戦カードが決まると予想できます'),
    ).toBeInTheDocument()
  })
})
