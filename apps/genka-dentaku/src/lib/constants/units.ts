/**
 * 単位プリセット（architecture §3 / §5.1・PRD 0.4）。
 * 重量・容量は固定単位で係数換算可。個数系は自由文字列（個≠枚≠束…換算不可・同一単位のみ相互利用）。
 * STEP 2 の `@/lib/domain/schema.ts` はこれらを単一の正として参照する。
 */

/** 重量の固定単位（g 基準・1kg=1000g）。 */
export const WEIGHT_UNITS = ['g', 'kg'] as const

/** 容量の固定単位（ml 基準・1L=1000ml）。 */
export const VOLUME_UNITS = ['ml', 'L'] as const

/** 個数系のプリセット（換算なし・同一単位のみ相互利用可）。カスタム入力も許容する。 */
export const COUNT_UNIT_PRESETS = [
  '個',
  '枚',
  '束',
  '本',
  '袋',
  '玉',
  '丁',
  '合',
  '杯',
  '尾',
  'パック',
] as const
