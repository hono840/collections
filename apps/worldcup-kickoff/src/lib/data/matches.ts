/**
 * 試合派生データの純関数（順位計算・日付グルーピング）。
 * ライブAPI差し替え時は computeStandings を置換するだけで済むよう隔離する。
 */
import type { CountryCode, GroupStanding, Match } from '@/lib/domain'
import { jstDateKey, formatDateHeadingJST } from '@/lib/utils/date'

/** 順位表の初期行（全0） */
function emptyStanding(teamCode: CountryCode): GroupStanding {
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
    rank: 0,
  }
}

/**
 * グループ内の試合から順位表を計算する。
 * - score がある試合のみ集計（未実施=null は無視 → MVPでは全0）。
 * - 勝点 勝3/分1/負0、得失点差、順位（勝点→得失点差→総得点）。
 *
 * @param groupMatches グループステージの試合（同一グループに限る前提）
 * @param teamCodes 順位表に並べる国コード（4ヶ国）。未指定なら試合から推定。
 */
export function computeStandings(
  groupMatches: Match[],
  teamCodes?: CountryCode[],
): GroupStanding[] {
  const table = new Map<CountryCode, GroupStanding>()

  const ensure = (code: CountryCode): GroupStanding => {
    let row = table.get(code)
    if (!row) {
      row = emptyStanding(code)
      table.set(code, row)
    }
    return row
  }

  // 並び順保証のため、指定があれば先に全行を作る
  if (teamCodes) {
    for (const code of teamCodes) ensure(code)
  }

  for (const m of groupMatches) {
    if (!m.score || m.homeTeamCode === null || m.awayTeamCode === null) {
      continue
    }
    const home = ensure(m.homeTeamCode)
    const away = ensure(m.awayTeamCode)
    const { home: hg, away: ag } = m.score

    home.played += 1
    away.played += 1
    home.goalsFor += hg
    home.goalsAgainst += ag
    away.goalsFor += ag
    away.goalsAgainst += hg

    if (hg > ag) {
      home.won += 1
      away.lost += 1
      home.points += 3
    } else if (hg < ag) {
      away.won += 1
      home.lost += 1
      away.points += 3
    } else {
      home.drawn += 1
      away.drawn += 1
      home.points += 1
      away.points += 1
    }
  }

  const rows = Array.from(table.values())
  for (const row of rows) {
    row.goalDifference = row.goalsFor - row.goalsAgainst
  }

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDifference !== a.goalDifference) {
      return b.goalDifference - a.goalDifference
    }
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    // 完全同点はチームコードで安定ソート
    return a.teamCode.localeCompare(b.teamCode)
  })

  rows.forEach((row, i) => {
    row.rank = i + 1
  })

  return rows
}

/** 日付ごとにまとめた試合グループ */
export interface MatchDateGroup {
  /** JST日付キー（"YYYY-MM-DD"） */
  dateKey: string
  /** 表示見出し（"6月12日(金)"） */
  headingJa: string
  matches: Match[]
}

/**
 * 試合をJST日付でグルーピングする。日付昇順・各グループ内はキックオフ昇順。
 */
export function groupMatchesByDate(matches: Match[]): MatchDateGroup[] {
  const sorted = [...matches].sort((a, b) =>
    a.kickoffUtc.localeCompare(b.kickoffUtc),
  )
  const groups = new Map<string, Match[]>()
  for (const m of sorted) {
    const key = jstDateKey(m.kickoffUtc)
    const list = groups.get(key)
    if (list) {
      list.push(m)
    } else {
      groups.set(key, [m])
    }
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, list]) => ({
      dateKey,
      headingJa: formatDateHeadingJST(list[0].kickoffUtc),
      matches: list,
    }))
}
