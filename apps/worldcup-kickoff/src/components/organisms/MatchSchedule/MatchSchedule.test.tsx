import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  MatchSchedule,
  type MatchScheduleItem,
  type MatchScheduleFilter,
} from './MatchSchedule'

const JPN = { flagEmoji: '🇯🇵', nameJa: '日本' }
const BRA = { flagEmoji: '🇧🇷', nameJa: 'ブラジル' }
const ARG = { flagEmoji: '🇦🇷', nameJa: 'アルゼンチン' }

// 2026-06-11T19:00:00Z は JST で 6/12、2026-06-12T19:00:00Z は JST で 6/13
const ITEMS: MatchScheduleItem[] = [
  {
    id: 'wc-001',
    stage: 'group',
    groupId: 'A',
    kickoffUtc: '2026-06-11T19:00:00.000Z',
    home: JPN,
    away: BRA,
    stadiumName: 'メットライフ・スタジアム',
    roundLabelJa: 'グループステージ',
    score: null,
  },
  {
    id: 'wc-002',
    stage: 'group',
    groupId: 'B',
    kickoffUtc: '2026-06-12T19:00:00.000Z',
    home: ARG,
    away: JPN,
    stadiumName: 'ソーファイ・スタジアム',
    roundLabelJa: 'グループステージ',
    score: null,
  },
  {
    id: 'wc-073',
    stage: 'round32',
    groupId: null,
    kickoffUtc: '2026-06-28T19:00:00.000Z',
    home: null,
    away: null,
    homePlaceholder: 'A組1位',
    awayPlaceholder: 'B組2位',
    stadiumName: null,
    roundLabelJa: 'ラウンド32',
    score: null,
  },
]

const FILTERS: MatchScheduleFilter[] = [
  { value: 'all', label: 'すべて' },
  { value: 'A', label: 'A組' },
  { value: 'B', label: 'B組' },
  { value: 'knockout', label: '決勝T' },
]

describe('MatchSchedule', () => {
  it('全試合が日付グルーピングで表示される', () => {
    render(<MatchSchedule matches={ITEMS} filters={FILTERS} />)
    // 日本は wc-001(home) と wc-002(away) の2試合に登場するため、各カードの
    // チーム名ラベルとして2つ描画される（getByText は完全一致のため sr-only の
    // "日本 対 ブラジル" 等の対戦概要は対象外）。
    expect(screen.getAllByText('日本')).toHaveLength(2)
    // アルゼンチンは wc-002 のみに登場するため1つ。
    expect(screen.getAllByText('アルゼンチン')).toHaveLength(1)
    // 未確定枠（ラウンド32）のプレースホルダも描画される。
    expect(screen.getByText('A組1位')).toBeInTheDocument()
  })

  it('日付見出しが描画される', () => {
    render(<MatchSchedule matches={ITEMS} filters={FILTERS} />)
    // 2026-06-11T19:00Z → JST 6月12日(金)
    expect(screen.getByText('6月12日(金)')).toBeInTheDocument()
  })

  it('グループ絞り込みで該当試合のみ表示される', async () => {
    const user = userEvent.setup()
    render(<MatchSchedule matches={ITEMS} filters={FILTERS} />)
    await user.click(screen.getByRole('radio', { name: 'A組' }))
    expect(screen.getByText('ブラジル')).toBeInTheDocument()
    expect(screen.queryByText('アルゼンチン')).not.toBeInTheDocument()
  })

  it('決勝Tフィルタでノックアウト試合のみ表示される', async () => {
    const user = userEvent.setup()
    render(<MatchSchedule matches={ITEMS} filters={FILTERS} />)
    await user.click(screen.getByRole('radio', { name: '決勝T' }))
    expect(screen.getByText('A組1位')).toBeInTheDocument()
    expect(screen.queryByText('ブラジル')).not.toBeInTheDocument()
  })

  it('該当試合がない区分では空状態を表示する', async () => {
    const user = userEvent.setup()
    const onlyGroupA: MatchScheduleItem[] = [ITEMS[0]]
    render(<MatchSchedule matches={onlyGroupA} filters={FILTERS} />)
    await user.click(screen.getByRole('radio', { name: 'B組' }))
    expect(screen.getByText('該当する試合がありません')).toBeInTheDocument()
  })
})
