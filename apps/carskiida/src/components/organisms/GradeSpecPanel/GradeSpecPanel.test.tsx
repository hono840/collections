import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GradeSpecPanel } from './GradeSpecPanel'
import type { Grade, Source } from '@/types/car'

const source: Source = {
  type: 'manufacturer',
  label: 'マツダ公式',
  retrievedAt: '2026-06-07',
  confidence: 'medium',
}

const grades: Grade[] = [
  {
    id: 'g1',
    name: 'S',
    specs: [
      { key: 'weight_kg', valueNormalized: 990, valueDisplay: '990 kg', unit: 'kg', source, confidence: 'medium' },
      { key: 'power_kw', valueNormalized: 97, valueDisplay: '97 kW (132 PS)', unit: 'kW', source, confidence: 'medium' },
    ],
    parts: [],
  },
  {
    id: 'g2',
    name: 'RS',
    specs: [
      { key: 'weight_kg', valueNormalized: 1060, valueDisplay: '1,060 kg', unit: 'kg', source, confidence: 'medium' },
      // power 欠損
    ],
    parts: [],
  },
]

describe('GradeSpecPanel', () => {
  it('グレード名を列ヘッダーに表示する', () => {
    render(<GradeSpecPanel grades={grades} />)
    expect(screen.getByRole('columnheader', { name: 'S' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'RS' })).toBeInTheDocument()
  })

  it('諸元ラベルと値を表示する', () => {
    render(<GradeSpecPanel grades={grades} />)
    expect(screen.getByText('車両重量')).toBeInTheDocument()
    expect(screen.getByText('990 kg')).toBeInTheDocument()
    expect(screen.getByText('1,060 kg')).toBeInTheDocument()
  })

  it('各値に出典バッジを表示する', () => {
    render(<GradeSpecPanel grades={grades} />)
    expect(screen.getAllByText('OEM').length).toBeGreaterThan(0)
  })

  it('あるグレードで欠損している項目は「—」で表示する', () => {
    render(<GradeSpecPanel grades={grades} />)
    // power は RS で欠損 → ダッシュが少なくとも1つ
    expect(screen.getAllByTitle('データなし').length).toBeGreaterThan(0)
  })
})
