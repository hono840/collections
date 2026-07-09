import { describe, it, expect } from 'vitest'
import { recommendedSellExTax, simulatedRate } from './simulation'
import { ceilToUnit, ratioToPercent1 } from './rounding'

describe('recommendedSellExTax (cost / (r/100))', () => {
  it('¥203 at target 30% -> 676.67 full precision (PRD 4.d)', () => {
    const v = recommendedSellExTax(203, 30)
    expect(v).not.toBeNull()
    expect(v as number).toBeCloseTo(676.6667, 4)
  })
  it('null-guards non-positive cost or target rate (zero-division)', () => {
    expect(recommendedSellExTax(203, 0)).toBeNull()
    expect(recommendedSellExTax(0, 30)).toBeNull()
    expect(recommendedSellExTax(-1, 30)).toBeNull()
  })
})

describe('simulatedRate (cost / newSell)', () => {
  it('null when the new sell price is <= 0', () => {
    expect(simulatedRate(203, 0)).toBeNull()
    expect(simulatedRate(203, -5)).toBeNull()
  })

  it('applied flow: ceil to ¥10 -> ¥680 -> effective rate ≈ 29.9% (safe side)', () => {
    const rec = recommendedSellExTax(203, 30) as number
    const sell = ceilToUnit(rec, 10)
    expect(sell).toBe(680)
    expect(ratioToPercent1(simulatedRate(203, sell) as number)).toBe(29.9)
  })

  it('applied flow: ceil to ¥50 -> ¥700 -> effective rate ≈ 29.0%', () => {
    const rec = recommendedSellExTax(203, 30) as number
    const sell = ceilToUnit(rec, 50)
    expect(sell).toBe(700)
    expect(ratioToPercent1(simulatedRate(203, sell) as number)).toBe(29)
  })
})
