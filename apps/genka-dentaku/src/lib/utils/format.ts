/**
 * 表示フォーマッタ（architecture §12.3・design-spec §2.5）。
 * すべて Intl 標準 API を使い date-fns 等の追加依存を持たない。
 * 丸めは呼び出し側（domain/rounding）で済ませた「表示用の確定値」を受け取る前提（architecture §0.5 / §5.4）。
 */

const yenFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
})

const percent1Formatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

/** 金額を日本円表記に。例: 980 → 「￥980」（丸め済み整数を前提）。 */
export function formatYen(value: number): string {
  return yenFormatter.format(value)
}

/** 原価率など「％（小数第1位）」表記に。例: 24.8 → 「24.8%」 / 30 → 「30.0%」。 */
export function formatPercent1(percent: number): string {
  return `${percent1Formatter.format(percent)}%`
}

/** ISO文字列 / epoch / Date を日本語ロケールの日付表記に。例: 「2026年7月9日」。 */
export function formatDate(date: string | number | Date): string {
  const d = date instanceof Date ? date : new Date(date)
  return dateFormatter.format(d)
}
