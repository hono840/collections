/**
 * 試合（104試合）に関するドメイン型。
 */
import type { CountryCode } from './team'
import type { GroupId } from './group'

/** 試合のステージ */
export type MatchStage =
  | 'group'
  | 'round32'
  | 'round16'
  | 'quarter'
  | 'semi'
  | 'third'
  | 'final'

export interface Match {
  /** ソース配列順で安定な連番ID（"wc-001"〜"wc-104"）。予想の永続キー */
  id: string
  stage: MatchStage
  /** グループステージのみ設定。決勝Tは null */
  groupId: GroupId | null
  /** キックオフ日時（UTC・ISO 8601） */
  kickoffUtc: string
  /** ホーム国コード。決勝Tの未確定枠は null */
  homeTeamCode: CountryCode | null
  /** アウェイ国コード。決勝Tの未確定枠は null */
  awayTeamCode: CountryCode | null
  /** 未確定枠の日本語ラベル（例: "A組2位"）。確定済みは undefined */
  homePlaceholderJa?: string
  awayPlaceholderJa?: string
  /** 会場ID。引けなかった場合は null */
  stadiumId: string | null
  /** 確定結果（過去試合のみ。未実施は null） */
  score: { home: number; away: number } | null
  /** PK戦結果（任意） */
  penalties?: { home: number; away: number }
  /** 表示用ステージラベル（例: "グループステージ", "準々決勝"） */
  roundLabelJa: string
}
