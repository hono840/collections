/**
 * 用語じてんの1エントリに関するドメイン型。
 */

/** 用語のカテゴリ */
export type TermCategory = 'rule' | 'position' | 'tournament' | 'stat'

export interface Term {
  /** URL/アンカー用スラッグ（例: "offside"） */
  slug: string
  /** 用語（例: "オフサイド"） */
  termJa: string
  /** 読み仮名（例: "おふさいど"） */
  reading?: string
  /** 解説本文 */
  definitionJa: string
  /** カテゴリ */
  category: TermCategory
  /** 関連ルールレッスンのスラッグ（任意） */
  relatedRuleSlug?: string
}
