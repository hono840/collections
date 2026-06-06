/**
 * ルール解説レッスンに関するドメイン型。
 */

/** レッスン本文のブロック（簡易Markdown相当） */
export type RuleBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'callout'; tone: 'info' | 'tip'; text: string }

/** インタラクティブ要素の種別 */
export type RuleInteractive = 'offside-sim' | null

export interface RuleLesson {
  /** URL: /rules/[slug] */
  slug: string
  titleJa: string
  /** 一覧表示順 */
  order: number
  /** 所要目安（分） */
  estimatedMinutes: number
  /** 見出し+本文のブロック配列 */
  bodyBlocks: RuleBlock[]
  /** 埋め込むインタラクティブ要素（無ければ null） */
  interactive: RuleInteractive
  /** 関連用語スラッグ */
  relatedTermSlugs: string[]
}
