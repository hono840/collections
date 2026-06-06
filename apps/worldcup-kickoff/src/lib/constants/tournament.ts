/**
 * 大会全体の定数。日付・タイムゾーン・グループID・ステージラベルの単一情報源。
 */
import type { GroupId, MatchStage } from '@/lib/domain'

/**
 * 開幕第1戦のキックオフ（UTC）。
 * 2026-06-11 13:00 UTC-6（メキシコシティ）= 2026-06-11 19:00 UTC。
 */
export const KICKOFF_DATE = '2026-06-11T19:00:00.000Z'

/**
 * 決勝（UTC）。2026-07-19。
 */
export const FINAL_DATE = '2026-07-19T19:00:00.000Z'

/** 表示タイムゾーン（日本時間） */
export const DISPLAY_TZ = 'Asia/Tokyo'

/** グループID配列（A〜L） */
export const GROUP_IDS: readonly GroupId[] = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
] as const

/** ステージ → 日本語ラベル写像 */
export const STAGE_LABELS: Record<MatchStage, string> = {
  group: 'グループステージ',
  round32: 'ラウンド32',
  round16: 'ラウンド16',
  quarter: '準々決勝',
  semi: '準決勝',
  third: '3位決定戦',
  final: '決勝',
}

/** グループID → 表示ラベル（例: "グループA"） */
export function groupLabel(id: GroupId): string {
  return `グループ${id}`
}
