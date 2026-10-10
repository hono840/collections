import { describe, expect, it } from 'vitest'
import { formatAverage, meterFillCount, roundedAverage, summarizeDrives } from './summary'

// Rating averages (PRD US-07 list "総合 平均 X.X", PRD US-08 per-road aggregates, design spec 4-2 RatingMeter).
// Contract (src/lib/ratings/summary.ts, pure, shared by server and UI):
//   roundedAverage(sum: number, count: number): number | null
//     - null when count is 0
//     - Math.round(sum * 10 / count) / 10   ("合計×10 ÷ 件数を整数に四捨五入", PRD US-07)
//   formatAverage(value: number | null): string    - one decimal ('4.0', '3.7'); null -> '—'
//   meterFillCount(value: number | null): number   - cells to fill out of 5 = round half up of the DISPLAYED
//                                                    one-decimal value (4.3 -> 4, 4.5 -> 5, 2.5 -> 3); null -> 0
//   summarizeDrives(drives: Array<{ ratingOverall; ratingScenery; ratingRoadSurface; ratingEaseOfDriving; traffic }>)
//     -> { overall | scenery | roadSurface | easeOfDriving: { average: number | null; count: number },
//          traffic: { few: number; normal: number; many: number } }
//     - null ratings are excluded from both average and count; traffic is counted, never averaged

describe('roundedAverage()', () => {
  it.each([
    [73, 20, 3.7], // 3.65 -> 3.7 (no float drift)
    [12, 3, 4], // 4 -> 4
    [11, 3, 3.7], // 3.666.. -> 3.7
    [10, 3, 3.3], // 3.333.. -> 3.3
    [9, 2, 4.5],
    [5, 1, 5],
    [1, 1, 1],
    [67, 20, 3.4], // 3.35 -> 3.4
  ])('sum %d / count %d -> %d', (sum, count, expected) => {
    expect(roundedAverage(sum, count)).toBe(expected)
  })

  it('returns null for no records', () => {
    expect(roundedAverage(0, 0)).toBeNull()
  })
})

describe('formatAverage()', () => {
  it.each([
    [4, '4.0'],
    [3.7, '3.7'],
    [5, '5.0'],
    [1, '1.0'],
  ])('%d -> %s', (value, expected) => {
    expect(formatAverage(value)).toBe(expected)
  })

  it('null -> "—" (no values)', () => {
    expect(formatAverage(null)).toBe('—')
  })
})

describe('meterFillCount()', () => {
  it.each([
    [4.3, 4],
    [4.5, 5],
    [2.5, 3],
    [4.4, 4],
    [1, 1],
    [5, 5],
    [3, 3],
  ])('%d -> %d cells', (value, expected) => {
    expect(meterFillCount(value)).toBe(expected)
  })

  it('null -> 0 cells', () => {
    expect(meterFillCount(null)).toBe(0)
  })
})

describe('summarizeDrives()', () => {
  const drive = (
    ratingOverall: number,
    extra: Partial<{
      ratingScenery: number | null
      ratingRoadSurface: number | null
      ratingEaseOfDriving: number | null
      traffic: 'few' | 'normal' | 'many' | null
    }> = {},
  ) => ({
    ratingOverall,
    ratingScenery: null,
    ratingRoadSurface: null,
    ratingEaseOfDriving: null,
    traffic: null,
    ...extra,
  })

  it('PRD example: overall 4, 5, 3 -> 4.0 over 3; scenery only one value (2) -> 2.0 over 1', () => {
    const summary = summarizeDrives([drive(4, { ratingScenery: 2 }), drive(5), drive(3)])
    expect(summary.overall).toEqual({ average: 4, count: 3 })
    expect(summary.scenery).toEqual({ average: 2, count: 1 })
  })

  it('axes without values -> average null and count 0', () => {
    const summary = summarizeDrives([drive(4), drive(2)])
    expect(summary.roadSurface).toEqual({ average: null, count: 0 })
    expect(summary.easeOfDriving).toEqual({ average: null, count: 0 })
  })

  it('traffic is counted per level, not averaged', () => {
    const summary = summarizeDrives([
      drive(3, { traffic: 'few' }),
      drive(3, { traffic: 'few' }),
      drive(3, { traffic: 'normal' }),
      drive(3),
    ])
    expect(summary.traffic).toEqual({ few: 2, normal: 1, many: 0 })
  })

  it('uses the same rounding as the list (3.65 -> 3.7)', () => {
    const ratings = [...Array(13).fill(4), ...Array(7).fill(3)] // sum 73, 20 drives
    expect(summarizeDrives(ratings.map((value) => drive(value))).overall).toEqual({ average: 3.7, count: 20 })
  })

  it('no drives -> everything empty', () => {
    expect(summarizeDrives([])).toEqual({
      overall: { average: null, count: 0 },
      scenery: { average: null, count: 0 },
      roadSurface: { average: null, count: 0 },
      easeOfDriving: { average: null, count: 0 },
      traffic: { few: 0, normal: 0, many: 0 },
    })
  })
})
