/**
 * 勝敗予想の永続データ型（localStorage に保存）。
 * zod スキーマは src/lib/storage/schema.ts と対で定義する。
 */

/** 予想の選択肢 */
export type PredictionPick = 'home' | 'draw' | 'away'

export interface PredictionStore {
  version: 1
  /** matchId → 予想 */
  picks: Record<string, PredictionPick>
  /** 最終更新（ISO 8601） */
  updatedAt: string
}
