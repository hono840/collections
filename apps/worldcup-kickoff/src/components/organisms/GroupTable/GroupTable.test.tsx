import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { GroupTable, type GroupTableTeamMeta } from './GroupTable'
import type { GroupStanding } from '@/lib/domain'

function standing(
  teamCode: string,
  rank: number,
  overrides: Partial<GroupStanding> = {},
): GroupStanding {
  return {
    teamCode,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    rank,
    ...overrides,
  }
}

const teamMeta: Record<string, GroupTableTeamMeta> = {
  JPN: { code: 'JPN', nameJa: '日本', flagEmoji: '🇯🇵' },
  BRA: { code: 'BRA', nameJa: 'ブラジル', flagEmoji: '🇧🇷' },
}

describe('GroupTable', () => {
  it('グループラベルが見出しに表示される', () => {
    render(
      <GroupTable label="グループA" standings={[]} teamMeta={teamMeta} />,
    )
    expect(
      screen.getByRole('heading', { name: 'グループA' }),
    ).toBeInTheDocument()
  })

  it('表（table）として描画され各国の行が並ぶ', () => {
    render(
      <GroupTable
        label="グループA"
        standings={[standing('JPN', 1), standing('BRA', 2)]}
        teamMeta={teamMeta}
      />,
    )
    const table = screen.getByRole('table')
    expect(within(table).getByText('日本')).toBeInTheDocument()
    expect(within(table).getByText('ブラジル')).toBeInTheDocument()
  })

  it('全0でも（結果未定でも）表として成立する', () => {
    render(
      <GroupTable
        label="グループA"
        standings={[standing('JPN', 1)]}
        teamMeta={teamMeta}
      />,
    )
    // 順位 1 が表示される
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('日本')).toBeInTheDocument()
  })

  it('teamMeta に無いコードでもフォールバック表示で落ちない', () => {
    render(
      <GroupTable
        label="グループA"
        standings={[standing('XXX', 1)]}
        teamMeta={teamMeta}
      />,
    )
    expect(screen.getByText('XXX')).toBeInTheDocument()
  })
})
