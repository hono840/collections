/**
 * 推し国診断の永続データ型（localStorage に保存）。
 * zod スキーマは src/lib/storage/schema.ts と対で定義する。
 */
import type { CountryCode } from './team'

export interface DiagnosisResult {
  version: 1
  /** 推し国（第1候補） */
  topTeamCode: CountryCode
  /** 上位候補（共有・再表示用） */
  ranking: CountryCode[]
  /** 回答スナップショット（questionId → optionId。再診断比較用） */
  answers: Record<string, string>
  /** 完了日時（ISO 8601） */
  completedAt: string
}

/** 学習進捗（閲覧済みレッスン・用語） */
export interface LearningProgress {
  version: 1
  readRuleSlugs: string[]
  seenTermSlugs: string[]
}
