/**
 * サイト全体で共有するメタ情報（architecture §8.2 / §11.4）。
 * OGP / canonical / sitemap / robots / manifest / 構造化データが同じ真実源を参照するため、
 * NEXT_PUBLIC_SITE_URL の解決ロジックとブランド文言をここに一元化する。
 * 未設定時は本番ドメインにフォールバックし、末尾スラッシュは除去する。
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://genka-dentaku.com').replace(/\/$/, '')

/** ブランド名（ヘッダー・manifest・構造化データ）。 */
export const SITE_NAME = '原価電卓'

/** 既定ページタイトル（トップ）。テンプレートは `%s | 原価電卓`。 */
export const SITE_TITLE = '原価電卓 — 飲食店のメニュー原価計算ツール'

/** サブタイトル（OG / フッター補助）。 */
export const SITE_SUBTITLE = '飲食店のメニュー原価計算ツール'

/** ディスクリプション（H1 原文固定・architecture §8.1）。 */
export const SITE_DESCRIPTION = '仕入れ値を1つ直すだけで、全メニューの原価率が即再計算。'

/** 本番ドメイン表示用（OG のクレジット等・スキーム無し）。 */
export const SITE_DOMAIN = SITE_URL.replace(/^https?:\/\//, '')

/**
 * オンページ SEO キーワード（GTM の意図別クラスタ由来・seo-specialist が精緻化）。
 * ツール/商用・インフレ/ペイン・高WTP計画層・情報系トップファネルを横断する。
 */
export const SITE_KEYWORDS = [
  '原価計算',
  '飲食店 原価計算',
  'メニュー 原価計算',
  '原価率 計算',
  '原価計算 ツール 無料',
  '原価計算 エクセル',
  'レシピ 原価 計算',
  '食材費 高騰 対策',
  '飲食店 値上げ',
  'メニュー 値上げ タイミング',
  '飲食店 開業 原価率',
  '原価率とは',
] as const
