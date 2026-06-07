import { describe, it, expect } from 'vitest'
import { computeSpecDiff, type CompareColumn } from '@/features/compare/diff'
import type { SpecKey, SpecValue, Source } from '@/types/car'

const source: Source = {
  type: 'manufacturer',
  label: 'メーカー公式',
  retrievedAt: '2026-06-07',
  confidence: 'medium',
}

function sv(key: SpecKey, normalized: number, display: string): SpecValue {
  return { key, valueNormalized: normalized, valueDisplay: display, unit: '', source, confidence: 'medium' }
}

function col(id: string, entries: SpecValue[]): CompareColumn {
  return { id, title: id, specs: new Map(entries.map((e) => [e.key, e])) }
}

describe('computeSpecDiff', () => {
  it('いずれかの列にある諸元キーのみを行にする', () => {
    const rows = computeSpecDiff([
      col('a', [sv('weight_kg', 990, '990 kg')]),
      col('b', [sv('power_kw', 97, '97 kW')]),
    ])
    const keys = rows.map((r) => r.key)
    expect(keys).toContain('weight_kg')
    expect(keys).toContain('power_kw')
  })

  it('数値項目で最大/最小をハイライトする', () => {
    const rows = computeSpecDiff([
      col('a', [sv('weight_kg', 990, '990 kg')]),
      col('b', [sv('weight_kg', 1110, '1,110 kg')]),
      col('c', [sv('weight_kg', 1060, '1,060 kg')]),
    ])
    const row = rows.find((r) => r.key === 'weight_kg')!
    expect(row.cells[0].highlight).toBe('min') // 990
    expect(row.cells[1].highlight).toBe('max') // 1110
    expect(row.cells[2].highlight).toBeUndefined() // 1060
  })

  it('欠損セルは差分計算から除外する（最小と誤判定しない）', () => {
    const rows = computeSpecDiff([
      col('a', [sv('weight_kg', 990, '990 kg')]),
      col('b', []), // 欠損
    ])
    const row = rows.find((r) => r.key === 'weight_kg')!
    expect(row.cells[1].spec).toBeUndefined()
    // 値が1つしかない → ハイライトなし
    expect(row.cells[0].highlight).toBeUndefined()
    expect(row.allMissing).toBe(false)
  })

  it('全列同値ならハイライトしない', () => {
    const rows = computeSpecDiff([
      col('a', [sv('seating', 2, '2 名')]),
      col('b', [sv('seating', 2, '2 名')]),
    ])
    const row = rows.find((r) => r.key === 'seating')!
    expect(row.cells.every((c) => c.highlight === undefined)).toBe(true)
  })
})
