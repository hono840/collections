/**
 * localStorage キー定数。命名規約（wck:<kebab-case-feature>）の単一情報源。
 * ハードコード禁止。すべてここから参照する。
 */
const PREFIX = 'wck'

export const STORAGE_KEYS = {
  favoriteTeam: `${PREFIX}:favorite-team`,
  predictions: `${PREFIX}:predictions`,
  diagnosisResult: `${PREFIX}:diagnosis-result`,
  learningProgress: `${PREFIX}:learning-progress`,
  theme: `${PREFIX}:theme`,
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
