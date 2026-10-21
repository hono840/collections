import { describe, it, expect } from 'vitest'
import { toExTax, toIncTax } from './tax'

describe('toExTax', () => {
  it('converts tax-inclusive input to ex-tax (8% / 10%)', () => {
    expect(toExTax(216, true, 8)).toBeCloseTo(200, 10)
    expect(toExTax(990, true, 10)).toBeCloseTo(900, 10)
  })
  it('passes ex-tax input through unchanged', () => {
    expect(toExTax(200, false, 8)).toBe(200)
    expect(toExTax(818.18, false, 10)).toBe(818.18)
  })
  it('keeps full precision for the karaage sell price (900 incl 10% -> 818.18…)', () => {
    expect(toExTax(900, true, 10)).toBeCloseTo(818.1818181818, 8)
  })
})

describe('toIncTax', () => {
  it('adds tax back to an ex-tax value', () => {
    expect(toIncTax(200, 8)).toBeCloseTo(216, 10)
    expect(toIncTax(900, 10)).toBeCloseTo(990, 10)
  })
  it('round-trips with toExTax', () => {
    expect(toIncTax(toExTax(216, true, 8), 8)).toBeCloseTo(216, 8)
    expect(toIncTax(toExTax(900, true, 10), 10)).toBeCloseTo(900, 8)
  })
})
