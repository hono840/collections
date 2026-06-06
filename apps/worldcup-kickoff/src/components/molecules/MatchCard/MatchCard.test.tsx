import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MatchCard } from './MatchCard'

const JPN = { flagEmoji: '🇯🇵', nameJa: '日本' }
const BRA = { flagEmoji: '🇧🇷', nameJa: 'ブラジル' }
// 2026-06-11T19:00:00Z は JST で 6/12 4:00
const KICKOFF = '2026-06-11T19:00:00.000Z'

describe('MatchCard', () => {
  it('両チームの国名が表示される', () => {
    render(
      <MatchCard
        home={JPN}
        away={BRA}
        kickoffUtc={KICKOFF}
        roundLabelJa="グループステージ"
      />,
    )
    expect(screen.getByText('日本')).toBeInTheDocument()
    expect(screen.getByText('ブラジル')).toBeInTheDocument()
  })

  it('ステージラベルが表示される', () => {
    render(
      <MatchCard
        home={JPN}
        away={BRA}
        kickoffUtc={KICKOFF}
        roundLabelJa="準々決勝"
      />,
    )
    expect(screen.getByText('準々決勝')).toBeInTheDocument()
  })

  it('JST 時刻が表示される', () => {
    render(
      <MatchCard
        home={JPN}
        away={BRA}
        kickoffUtc={KICKOFF}
        roundLabelJa="グループステージ"
      />,
    )
    expect(screen.getByText('4:00')).toBeInTheDocument()
  })

  it('スコアがあれば表示される', () => {
    render(
      <MatchCard
        home={JPN}
        away={BRA}
        kickoffUtc={KICKOFF}
        roundLabelJa="グループステージ"
        score={{ home: 2, away: 1 }}
      />,
    )
    expect(screen.getByRole('img', { name: '2 対 1' })).toBeInTheDocument()
  })

  it('スコア未確定時は試合前ラベルになる', () => {
    render(
      <MatchCard
        home={JPN}
        away={BRA}
        kickoffUtc={KICKOFF}
        roundLabelJa="グループステージ"
      />,
    )
    expect(screen.getByRole('img', { name: '試合前' })).toBeInTheDocument()
  })

  it('チーム未確定時はプレースホルダ文字列が表示される', () => {
    render(
      <MatchCard
        homePlaceholder="A組1位"
        awayPlaceholder="B組2位"
        kickoffUtc={KICKOFF}
        roundLabelJa="ラウンド32"
      />,
    )
    expect(screen.getByText('A組1位')).toBeInTheDocument()
    expect(screen.getByText('B組2位')).toBeInTheDocument()
  })

  it('会場名が表示される', () => {
    render(
      <MatchCard
        home={JPN}
        away={BRA}
        kickoffUtc={KICKOFF}
        roundLabelJa="グループステージ"
        stadiumName="メットライフ・スタジアム"
      />,
    )
    expect(screen.getByText('メットライフ・スタジアム')).toBeInTheDocument()
  })

  it('children（アクションスロット）が描画される', () => {
    render(
      <MatchCard
        home={JPN}
        away={BRA}
        kickoffUtc={KICKOFF}
        roundLabelJa="グループステージ"
      >
        <button type="button">予想する</button>
      </MatchCard>,
    )
    expect(
      screen.getByRole('button', { name: '予想する' }),
    ).toBeInTheDocument()
  })
})
