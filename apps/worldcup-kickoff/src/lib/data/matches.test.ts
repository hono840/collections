import { describe, it, expect } from 'vitest'
import { computeStandings, groupMatchesByDate } from './matches'
import type { Match } from '@/lib/domain'

function makeMatch(partial: Partial<Match> & Pick<Match, 'id'>): Match {
  return {
    id: partial.id,
    stage: partial.stage ?? 'group',
    groupId: partial.groupId ?? 'A',
    kickoffUtc: partial.kickoffUtc ?? '2026-06-11T19:00:00.000Z',
    homeTeamCode: partial.homeTeamCode ?? null,
    awayTeamCode: partial.awayTeamCode ?? null,
    homePlaceholderJa: partial.homePlaceholderJa,
    awayPlaceholderJa: partial.awayPlaceholderJa,
    stadiumId: partial.stadiumId ?? 'mexico-city',
    score: partial.score ?? null,
    penalties: partial.penalties,
    roundLabelJa: partial.roundLabelJa ?? 'グループステージ',
  }
}

describe('computeStandings', () => {
  it('結果未定（score=null）は全0', () => {
    const matches = [
      makeMatch({ id: 'm1', homeTeamCode: 'AAA', awayTeamCode: 'BBB' }),
    ]
    const standings = computeStandings(matches, ['AAA', 'BBB'])
    expect(standings).toHaveLength(2)
    for (const s of standings) {
      expect(s.played).toBe(0)
      expect(s.points).toBe(0)
    }
  })

  it('勝点 勝3/分1/負0 を正しく計算', () => {
    // AAA勝, BBB負, CCC分, DDD分
    const matches = [
      makeMatch({
        id: 'm1',
        homeTeamCode: 'AAA',
        awayTeamCode: 'BBB',
        score: { home: 2, away: 0 },
      }),
      makeMatch({
        id: 'm2',
        homeTeamCode: 'CCC',
        awayTeamCode: 'DDD',
        score: { home: 1, away: 1 },
      }),
    ]
    const standings = computeStandings(matches, ['AAA', 'BBB', 'CCC', 'DDD'])
    const byCode = Object.fromEntries(standings.map((s) => [s.teamCode, s]))
    expect(byCode.AAA.points).toBe(3)
    expect(byCode.AAA.won).toBe(1)
    expect(byCode.BBB.points).toBe(0)
    expect(byCode.BBB.lost).toBe(1)
    expect(byCode.CCC.points).toBe(1)
    expect(byCode.CCC.drawn).toBe(1)
    expect(byCode.DDD.points).toBe(1)
  })

  it('得失点差・総得点を集計', () => {
    const matches = [
      makeMatch({
        id: 'm1',
        homeTeamCode: 'AAA',
        awayTeamCode: 'BBB',
        score: { home: 3, away: 1 },
      }),
    ]
    const standings = computeStandings(matches, ['AAA', 'BBB'])
    const aaa = standings.find((s) => s.teamCode === 'AAA')!
    const bbb = standings.find((s) => s.teamCode === 'BBB')!
    expect(aaa.goalsFor).toBe(3)
    expect(aaa.goalsAgainst).toBe(1)
    expect(aaa.goalDifference).toBe(2)
    expect(bbb.goalDifference).toBe(-2)
  })

  it('順位は 勝点→得失点差→総得点 の順で決まる', () => {
    // 総当たり: A=7点(2勝1分), B=4点(1勝1分1敗)など合成
    const matches = [
      // AAA 2-0 BBB
      makeMatch({ id: 'm1', homeTeamCode: 'AAA', awayTeamCode: 'BBB', score: { home: 2, away: 0 } }),
      // AAA 1-1 CCC
      makeMatch({ id: 'm2', homeTeamCode: 'AAA', awayTeamCode: 'CCC', score: { home: 1, away: 1 } }),
      // AAA 3-0 DDD
      makeMatch({ id: 'm3', homeTeamCode: 'AAA', awayTeamCode: 'DDD', score: { home: 3, away: 0 } }),
      // BBB 2-1 CCC
      makeMatch({ id: 'm4', homeTeamCode: 'BBB', awayTeamCode: 'CCC', score: { home: 2, away: 1 } }),
      // BBB 0-0 DDD
      makeMatch({ id: 'm5', homeTeamCode: 'BBB', awayTeamCode: 'DDD', score: { home: 0, away: 0 } }),
      // CCC 1-0 DDD
      makeMatch({ id: 'm6', homeTeamCode: 'CCC', awayTeamCode: 'DDD', score: { home: 1, away: 0 } }),
    ]
    const standings = computeStandings(matches, ['AAA', 'BBB', 'CCC', 'DDD'])
    // AAA: 勝点7(W2 D1), 得失+5
    expect(standings[0].teamCode).toBe('AAA')
    expect(standings[0].rank).toBe(1)
    expect(standings[0].points).toBe(7)
    expect(standings[0].goalDifference).toBe(5)
    // ranks are 1..4 unique
    expect(standings.map((s) => s.rank)).toEqual([1, 2, 3, 4])
  })

  it('勝点同点は得失点差で上位を決める', () => {
    // AAA と BBB がともに勝点3、AAAの方が得失点差が大きい
    const matches = [
      makeMatch({ id: 'm1', homeTeamCode: 'AAA', awayTeamCode: 'CCC', score: { home: 5, away: 0 } }),
      makeMatch({ id: 'm2', homeTeamCode: 'BBB', awayTeamCode: 'DDD', score: { home: 1, away: 0 } }),
    ]
    const standings = computeStandings(matches, ['AAA', 'BBB', 'CCC', 'DDD'])
    expect(standings[0].teamCode).toBe('AAA')
    expect(standings[1].teamCode).toBe('BBB')
  })
})

describe('groupMatchesByDate', () => {
  it('JST日付でグルーピングし日付昇順に並べる', () => {
    const matches = [
      // 6/11 19:00 UTC → JST 6/12
      makeMatch({ id: 'm1', kickoffUtc: '2026-06-11T19:00:00.000Z' }),
      // 6/12 01:00 UTC → JST 6/12（同日）
      makeMatch({ id: 'm2', kickoffUtc: '2026-06-12T01:00:00.000Z' }),
      // 6/12 20:00 UTC → JST 6/13
      makeMatch({ id: 'm3', kickoffUtc: '2026-06-12T20:00:00.000Z' }),
    ]
    const groups = groupMatchesByDate(matches)
    expect(groups).toHaveLength(2)
    expect(groups[0].dateKey).toBe('2026-06-12')
    expect(groups[0].matches.map((m) => m.id)).toEqual(['m1', 'm2'])
    expect(groups[1].dateKey).toBe('2026-06-13')
    expect(groups[1].matches.map((m) => m.id)).toEqual(['m3'])
  })

  it('見出しは日本語の曜日付き', () => {
    const groups = groupMatchesByDate([
      makeMatch({ id: 'm1', kickoffUtc: '2026-06-11T19:00:00.000Z' }),
    ])
    expect(groups[0].headingJa).toBe('6月12日(金)')
  })
})
