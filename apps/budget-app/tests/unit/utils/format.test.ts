import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, formatMonthYear } from '@/lib/utils/format'

describe('formatCurrency', () => {
  it('日本円が正しくフォーマットされる', () => {
    const result = formatCurrency(1000)
    // 環境により半角¥または全角￥が使われる
    expect(result).toMatch(/[¥￥]1,000/)
  })

  it('0円が正しくフォーマットされる', () => {
    const result = formatCurrency(0)
    expect(result).toMatch(/[¥￥]0/)
  })

  it('大きな金額がカンマ区切りでフォーマットされる', () => {
    const result = formatCurrency(1234567)
    expect(result).toMatch(/[¥￥]1,234,567/)
  })

  it('負の金額が正しくフォーマットされる', () => {
    const result = formatCurrency(-500)
    expect(result).toContain('500')
  })

  it('JPY では小数点以下が表示されない', () => {
    const result = formatCurrency(1000.5)
    expect(result).toMatch(/[¥￥]1,001/)
    expect(result).not.toContain('.')
  })

  it('USD の場合は小数点以下2桁が表示される', () => {
    const result = formatCurrency(1000, 'USD')
    expect(result).toContain('1,000.00')
  })
})

describe('formatDate', () => {
  it('デフォルトパターンで日付がフォーマットされる', () => {
    const result = formatDate('2024-03-15')
    expect(result).toBe('2024/03/15')
  })

  it('Date オブジェクトも受け付ける', () => {
    const result = formatDate(new Date(2024, 0, 1))
    expect(result).toBe('2024/01/01')
  })

  it('カスタムパターンでフォーマットできる', () => {
    const result = formatDate('2024-12-25', 'MM/dd')
    expect(result).toBe('12/25')
  })
})

describe('formatMonthYear', () => {
  it('年月が日本語形式でフォーマットされる', () => {
    const result = formatMonthYear('2024-03-15')
    expect(result).toBe('2024年3月')
  })

  it('Date オブジェクトも受け付ける', () => {
    const result = formatMonthYear(new Date(2024, 11, 1))
    expect(result).toBe('2024年12月')
  })

  it('1月が正しくフォーマットされる', () => {
    const result = formatMonthYear(new Date(2025, 0, 1))
    expect(result).toBe('2025年1月')
  })
})
