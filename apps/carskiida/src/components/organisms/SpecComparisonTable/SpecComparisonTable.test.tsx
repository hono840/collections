import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SpecComparisonTable } from './SpecComparisonTable'
import type { CompareColumn } from '@/features/compare/diff'
import type { SpecKey, SpecValue, Source } from '@/types/car'

const source: Source = {
  type: 'manufacturer',
  label: 'メーカー公式',
  retrievedAt: '2026-06-07',
  confidence: 'medium',
}
function sv(key: SpecKey, n: number, d: string): SpecValue {
  return { key, valueNormalized: n, valueDisplay: d, unit: '', source, confidence: 'medium' }
}
function col(id: string, title: string, entries: SpecValue[]): CompareColumn {
  return { id, title, specs: new Map(entries.map((e) => [e.key, e])) }
}

describe('SpecComparisonTable', () => {
  it('1台以下なら案内文を表示する', () => {
    render(<SpecComparisonTable columns={[col('a', 'A', [])]} />)
    expect(screen.getByText(/2 台以上を選択/)).toBeInTheDocument()
  })

  it('列見出しに対象車名を表示する', () => {
    render(
      <SpecComparisonTable
        columns={[
          col('a', 'ロードスター ND', [sv('weight_kg', 990, '990 kg')]),
          col('b', 'ロードスター NC', [sv('weight_kg', 1110, '1,110 kg')]),
        ]}
      />
    )
    expect(screen.getByText('ロードスター ND')).toBeInTheDocument()
    expect(screen.getByText('ロードスター NC')).toBeInTheDocument()
  })

  it('最大値に▲、最小値に▼を表示する', () => {
    render(
      <SpecComparisonTable
        columns={[
          col('a', 'A', [sv('weight_kg', 990, '990 kg')]),
          col('b', 'B', [sv('weight_kg', 1110, '1,110 kg')]),
        ]}
      />
    )
    expect(screen.getByLabelText('最大')).toBeInTheDocument()
    expect(screen.getByLabelText('最小')).toBeInTheDocument()
  })

  it('欠損列は「—」を表示する', () => {
    render(
      <SpecComparisonTable
        columns={[
          col('a', 'A', [sv('power_kw', 97, '97 kW')]),
          col('b', 'B', []),
        ]}
      />
    )
    expect(screen.getAllByTitle('データなし').length).toBeGreaterThan(0)
  })
})
