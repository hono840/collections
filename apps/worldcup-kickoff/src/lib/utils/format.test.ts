import { describe, it, expect } from 'vitest'
import {
  formatScore,
  formatScoreWithPenalties,
  formatRank,
  formatGroup,
  formatPoints,
  formatGoalDifference,
} from './format'

describe('formatScore', () => {
  it('結果ありは "2 - 1"', () => {
    expect(formatScore({ home: 2, away: 1 })).toBe('2 - 1')
  })
  it('未実施は "vs"', () => {
    expect(formatScore(null)).toBe('vs')
  })
})

describe('formatScoreWithPenalties', () => {
  it('PKなしは通常スコア', () => {
    expect(formatScoreWithPenalties({ score: { home: 1, away: 0 } })).toBe(
      '1 - 0',
    )
  })
  it('PKありはPK表記を付ける', () => {
    expect(
      formatScoreWithPenalties({
        score: { home: 1, away: 1 },
        penalties: { home: 4, away: 3 },
      }),
    ).toBe('1 - 1 (PK 4-3)')
  })
})

describe('順位・グループ・勝点', () => {
  it('formatRank', () => {
    expect(formatRank(1)).toBe('1位')
    expect(formatRank(4)).toBe('4位')
  })
  it('formatGroup', () => {
    expect(formatGroup('A')).toBe('グループA')
  })
  it('formatPoints', () => {
    expect(formatPoints(7)).toBe('勝点7')
  })
})

describe('formatGoalDifference', () => {
  it('正は + を付ける', () => {
    expect(formatGoalDifference(3)).toBe('+3')
  })
  it('負はそのまま', () => {
    expect(formatGoalDifference(-2)).toBe('-2')
  })
  it('0は "0"', () => {
    expect(formatGoalDifference(0)).toBe('0')
  })
})
