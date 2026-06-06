/**
 * localStorage 各キーの zod スキーマ。
 * 読み出し時の検証専用。スキーマ不一致・破損・旧バージョンは握り潰す（safe-storage 側で null 化）。
 */
import { z } from 'zod'

/** 推し国（FIFA国コード文字列） */
export const favoriteTeamSchema = z.string().min(1)

/** 勝敗予想 */
export const predictionPickSchema = z.enum(['home', 'draw', 'away'])

export const predictionStoreSchema = z.object({
  version: z.literal(1),
  picks: z.record(z.string(), predictionPickSchema),
  updatedAt: z.string(),
})

/** 診断結果 */
export const diagnosisResultSchema = z.object({
  version: z.literal(1),
  topTeamCode: z.string().min(1),
  ranking: z.array(z.string()),
  answers: z.record(z.string(), z.string()),
  completedAt: z.string(),
})

/** 学習進捗 */
export const learningProgressSchema = z.object({
  version: z.literal(1),
  readRuleSlugs: z.array(z.string()),
  seenTermSlugs: z.array(z.string()),
})

/** テーマ */
export const themeSchema = z.enum(['light', 'dark', 'system'])

/**
 * zod から推論した型。ドメイン型（PredictionStore 等）と構造一致する。
 * フック・safe-storage はこれらを利用する。
 */
export type FavoriteTeamSchema = z.infer<typeof favoriteTeamSchema>
export type PredictionStoreSchema = z.infer<typeof predictionStoreSchema>
export type DiagnosisResultSchema = z.infer<typeof diagnosisResultSchema>
export type LearningProgressSchema = z.infer<typeof learningProgressSchema>
export type ThemeSchema = z.infer<typeof themeSchema>
