import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CountryDetailPanel, type CountryMatchView } from './CountryDetailPanel'
import { FavoriteTeamProvider } from '@/components/providers/FavoriteTeamProvider'
import type { Player, Team } from '@/lib/domain'

beforeEach(() => {
  localStorage.clear()
})

const team: Team = {
  code: 'JPN',
  nameEn: 'Japan',
  nameJa: '日本',
  groupId: 'A',
  flagEmoji: '🇯🇵',
  confed: 'AFC',
  region: 'asia',
  style: 'balanced',
  tier: 'darkhorse',
  tierReasonJa: '組織的なサッカーで上位を脅かす力があるからです。',
  blurbJa: 'アジアの強豪、サムライブルー。',
  watchPointJa: '全員で連動する組織的な守備が見どころ。',
  funFactsJa: ['7大会連続出場', '愛称はサムライブルー'],
  vibeJa: ['組織力', '規律'],
}

const players: Player[] = [
  {
    id: 'JPN-1',
    nameJa: '遠藤 航',
    teamCode: 'JPN',
    position: 'MF',
    highlightJa: '中盤の要、守備の達人。',
  },
  {
    id: 'JPN-2',
    nameJa: '冨安 健洋',
    teamCode: 'JPN',
    position: 'DF',
    highlightJa: '複数ポジションをこなす万能DF。',
  },
]

const matches: CountryMatchView[] = [
  {
    id: 'wc-001',
    home: { flagEmoji: '🇯🇵', nameJa: '日本' },
    away: { flagEmoji: '🇧🇷', nameJa: 'ブラジル' },
    kickoffUtc: '2026-06-15T10:00:00.000Z',
    stadiumName: 'SoFi Stadium（ロサンゼルス）',
    roundLabelJa: 'グループステージ',
    score: null,
  },
]

function renderPanel(ui: React.ReactElement) {
  return render(<FavoriteTeamProvider>{ui}</FavoriteTeamProvider>)
}

describe('CountryDetailPanel', () => {
  it('国名が見出しに表示される', () => {
    renderPanel(
      <CountryDetailPanel
        team={team}
        groupLabel="グループA"
        players={players}
        matches={matches}
      />,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: '日本' }),
    ).toBeInTheDocument()
  })

  it('紹介・見どころ・豆知識が表示される', () => {
    renderPanel(
      <CountryDetailPanel
        team={team}
        groupLabel="グループA"
        players={players}
        matches={matches}
      />,
    )
    expect(
      screen.getByText('アジアの強豪、サムライブルー。'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('全員で連動する組織的な守備が見どころ。'),
    ).toBeInTheDocument()
    expect(screen.getByText('7大会連続出場')).toBeInTheDocument()
  })

  it('注目選手がポジション別に表示される', () => {
    renderPanel(
      <CountryDetailPanel
        team={team}
        groupLabel="グループA"
        players={players}
        matches={matches}
      />,
    )
    expect(screen.getByText('遠藤 航')).toBeInTheDocument()
    expect(screen.getByText('冨安 健洋')).toBeInTheDocument()
    // ポジション見出し（DF が MF より前に並ぶ）
    expect(screen.getByText(/DF（ディフェンダー）/)).toBeInTheDocument()
    expect(screen.getByText(/MF（ミッドフィルダー）/)).toBeInTheDocument()
  })

  it('FavoriteToggle で推し国登録ボタンが表示される', () => {
    renderPanel(
      <CountryDetailPanel
        team={team}
        groupLabel="グループA"
        players={players}
        matches={matches}
      />,
    )
    expect(
      screen.getByRole('button', { name: /日本を推し国にする/ }),
    ).toBeInTheDocument()
  })

  it('その国の試合（対戦カード）が表示される', () => {
    renderPanel(
      <CountryDetailPanel
        team={team}
        groupLabel="グループA"
        players={players}
        matches={matches}
      />,
    )
    expect(screen.getByText('ブラジル')).toBeInTheDocument()
  })

  it('選手・試合が空でも空状態を表示して落ちない', () => {
    renderPanel(
      <CountryDetailPanel
        team={team}
        groupLabel="グループA"
        players={[]}
        matches={[]}
      />,
    )
    expect(screen.getByText('試合はまだありません')).toBeInTheDocument()
  })

  it('tier の理由（tierReasonJa）が表示される', () => {
    renderPanel(
      <CountryDetailPanel
        team={team}
        groupLabel="グループA"
        players={players}
        matches={matches}
      />,
    )
    expect(
      screen.getByText('組織的なサッカーで上位を脅かす力があるからです。'),
    ).toBeInTheDocument()
    // 「なぜ◯◯？」の見出し（tier ラベルを含む）
    expect(screen.getByText(/なぜダークホース？/)).toBeInTheDocument()
  })

  it('tier バッジがランク凡例ダイアログのトリガーになっている', () => {
    renderPanel(
      <CountryDetailPanel
        team={team}
        groupLabel="グループA"
        players={players}
        matches={matches}
      />,
    )
    const trigger = screen.getByRole('button', {
      name: /ランクの見方を開く/,
    })
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
