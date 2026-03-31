import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  calculateBudgetProgress,
  getBudgetStatus,
  getDaysRemainingInMonth,
} from '@/lib/utils/budget'

describe('getBudgetStatus', () => {
  it('75% 未満は safe を返す', () => {
    expect(getBudgetStatus(0)).toBe('safe')
    expect(getBudgetStatus(50)).toBe('safe')
    expect(getBudgetStatus(74)).toBe('safe')
  })

  it('75% 以上 100% 未満は warning を返す', () => {
    expect(getBudgetStatus(75)).toBe('warning')
    expect(getBudgetStatus(90)).toBe('warning')
    expect(getBudgetStatus(99)).toBe('warning')
  })

  it('100% 以上は danger を返す', () => {
    expect(getBudgetStatus(100)).toBe('danger')
    expect(getBudgetStatus(150)).toBe('danger')
  })
})

describe('calculateBudgetProgress', () => {
  it('予算に対する進捗率とステータスを返す', () => {
    const result = calculateBudgetProgress(5000, 10000)
    expect(result.percentage).toBe(50)
    expect(result.status).toBe('safe')
  })

  it('予算超過の場合は danger を返す', () => {
    const result = calculateBudgetProgress(12000, 10000)
    expect(result.percentage).toBe(120)
    expect(result.status).toBe('danger')
  })

  it('予算の 75% 使用で warning を返す', () => {
    const result = calculateBudgetProgress(7500, 10000)
    expect(result.percentage).toBe(75)
    expect(result.status).toBe('warning')
  })

  it('予算が 0 の場合は none を返す', () => {
    const result = calculateBudgetProgress(1000, 0)
    expect(result.percentage).toBe(0)
    expect(result.status).toBe('none')
  })

  it('予算が負の場合は none を返す', () => {
    const result = calculateBudgetProgress(1000, -100)
    expect(result.percentage).toBe(0)
    expect(result.status).toBe('none')
  })

  it('支出が 0 の場合は 0% safe を返す', () => {
    const result = calculateBudgetProgress(0, 10000)
    expect(result.percentage).toBe(0)
    expect(result.status).toBe('safe')
  })

  it('パーセンテージが四捨五入される', () => {
    const result = calculateBudgetProgress(3333, 10000)
    expect(result.percentage).toBe(33)
  })
})

describe('getDaysRemainingInMonth', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('月初なら残り日数が多い', () => {
    vi.useFakeTimers()
    // 2024年3月1日
    vi.setSystemTime(new Date(2024, 2, 1))
    expect(getDaysRemainingInMonth()).toBe(30)
  })

  it('月末なら残り日数が 0', () => {
    vi.useFakeTimers()
    // 2024年3月31日
    vi.setSystemTime(new Date(2024, 2, 31))
    expect(getDaysRemainingInMonth()).toBe(0)
  })

  it('月中なら適切な残り日数を返す', () => {
    vi.useFakeTimers()
    // 2024年3月15日 -> 31 - 15 = 16日
    vi.setSystemTime(new Date(2024, 2, 15))
    expect(getDaysRemainingInMonth()).toBe(16)
  })

  it('2月 (閏年) でも正しく計算される', () => {
    vi.useFakeTimers()
    // 2024年2月1日 (閏年) -> 29 - 1 = 28日
    vi.setSystemTime(new Date(2024, 1, 1))
    expect(getDaysRemainingInMonth()).toBe(28)
  })
})
