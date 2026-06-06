/**
 * 表示フォーマットユーティリティ（スコア・順位・グループ表示など）。
 */
import type { GroupId, Match } from '@/lib/domain'

/**
 * スコア表示。未実施は "vs"。
 * 例: { home: 2, away: 1 } → "2 - 1"
 */
export function formatScore(score: Match['score']): string {
  if (!score) return 'vs'
  return `${score.home} - ${score.away}`
}

/**
 * PK戦込みのスコア表示。
 * 例: score 1-1, pk 4-3 → "1 - 1 (PK 4-3)"
 */
export function formatScoreWithPenalties(match: Pick<Match, 'score' | 'penalties'>): string {
  const base = formatScore(match.score)
  if (!match.penalties) return base
  return `${base} (PK ${match.penalties.home}-${match.penalties.away})`
}

/** 順位の序数（日本語）。例: 1 → "1位" */
export function formatRank(rank: number): string {
  return `${rank}位`
}

/** グループ表示ラベル。例: "A" → "グループA" */
export function formatGroup(id: GroupId): string {
  return `グループ${id}`
}

/** 勝点表示。例: 7 → "勝点7" */
export function formatPoints(points: number): string {
  return `勝点${points}`
}

/** 得失点差の符号付き表示。例: 3 → "+3", -2 → "-2", 0 → "0" */
export function formatGoalDifference(diff: number): string {
  if (diff > 0) return `+${diff}`
  return String(diff)
}
