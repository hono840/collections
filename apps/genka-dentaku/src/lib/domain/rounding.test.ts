import { describe, it, expect } from 'vitest'
import { roundYen, ratioToPercent1, roundUnitPrice2, ceilToUnit } from './rounding'

describe('roundYen (non-negative half-up integer)', () => {
  it('rounds halves up', () => {
    expect(roundYen(0.5)).toBe(1)
    expect(roundYen(0.49)).toBe(0)
    expect(roundYen(1.5)).toBe(2)
    expect(roundYen(2.4)).toBe(2)
  })
  it('keeps PRD regression amounts', () => {
    expect(roundYen(203)).toBe(203)
    expect(roundYen(818.1818)).toBe(818)
    expect(roundYen(615.1818)).toBe(615)
  })
})

describe('ratioToPercent1 (0..1 -> percent, 1 decimal half-up)', () => {
  it('rounds at the tenth boundary (33.24 -> 33.2, 33.25 -> 33.3)', () => {
    expect(ratioToPercent1(0.3324)).toBe(33.2)
    expect(ratioToPercent1(0.3325)).toBe(33.3)
  })
  it('handles the FP-fragile threshold boundary (35.0 vs 35.1)', () => {
    expect(ratioToPercent1(0.35)).toBe(35)
    expect(ratioToPercent1(0.351)).toBe(35.1)
  })
  it('keeps PRD regression rates', () => {
    expect(ratioToPercent1(0.24811111)).toBe(24.8)
    expect(ratioToPercent1(0.30926)).toBe(30.9)
    expect(ratioToPercent1(0)).toBe(0)
    expect(ratioToPercent1(0.3)).toBe(30)
  })
})

describe('roundUnitPrice2 (2 decimals half-up)', () => {
  it('rounds effective unit prices', () => {
    expect(roundUnitPrice2(0.25)).toBe(0.25)
    expect(roundUnitPrice2(1.3333333)).toBe(1.33)
    expect(roundUnitPrice2(0.125)).toBe(0.13)
    expect(roundUnitPrice2(0.4)).toBe(0.4)
  })
})

describe('ceilToUnit (round up to a yen unit = safe side)', () => {
  it('ceils the recommended sell price to the rounding unit', () => {
    expect(ceilToUnit(676.67, 10)).toBe(680)
    expect(ceilToUnit(676.67, 50)).toBe(700)
    expect(ceilToUnit(676.6666666, 10)).toBe(680)
  })
  it('leaves exact multiples unchanged (no FP overshoot)', () => {
    expect(ceilToUnit(680, 10)).toBe(680)
    expect(ceilToUnit(700, 50)).toBe(700)
    expect(ceilToUnit(0, 10)).toBe(0)
    expect(ceilToUnit(1, 1)).toBe(1)
  })
})
