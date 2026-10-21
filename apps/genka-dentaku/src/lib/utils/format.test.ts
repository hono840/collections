import { describe, it, expect } from 'vitest'
import { formatYen, formatPercent1, formatDate } from './format'

/**
 * STEP 1 のスモークテスト（vitest の疎通確認）。
 * Intl の通貨記号（¥/￥）はロケール/ICU 版で揺れるため、記号ではなく桁とフォーマット則を検証する。
 */
describe('format utils (smoke)', () => {
  it('formatYen は金額を含み小数を付けない', () => {
    const out = formatYen(980)
    expect(out).toContain('980')
    expect(out).not.toContain('.')
  })

  it('formatPercent1 は小数第1位に整形して % を付ける', () => {
    expect(formatPercent1(24.8)).toBe('24.8%')
    expect(formatPercent1(30)).toBe('30.0%')
  })

  it('formatDate は日本語ロケールの年月日を返す', () => {
    // ローカル日付で構築し、タイムゾーン変換のブレを避ける（2026年7月9日）。
    const out = formatDate(new Date(2026, 6, 9))
    expect(out).toContain('2026年')
    expect(out).toContain('7月')
    expect(out).toContain('9日')
  })
})
