import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  PartStructureAccordion,
  aggregateParts,
} from './PartStructureAccordion'
import type { Grade, Source } from '@/types/car'

const source: Source = {
  type: 'wikipedia',
  label: 'Wikipedia',
  retrievedAt: '2026-06-07',
  confidence: 'medium',
}

const grades: Grade[] = [
  {
    id: 'g1',
    name: 'S',
    specs: [],
    parts: [
      { id: 'p1', category: 'engine', nameJa: '直4 1.5L', specSummary: 'P5-VP', source },
      { id: 'p2', category: 'suspension', nameJa: 'ダブルウィッシュボーン', source },
    ],
  },
  {
    id: 'g2',
    name: 'RS',
    specs: [],
    parts: [
      { id: 'p3', category: 'engine', nameJa: '直4 1.5L', specSummary: 'P5-VP', source },
      { id: 'p4', category: 'brake', nameJa: 'ベンチレーテッドディスク', source },
    ],
  },
]

describe('aggregateParts', () => {
  it('カテゴリ別にパーツを集約する', () => {
    const grouped = aggregateParts(grades)
    expect(grouped.has('engine')).toBe(true)
    expect(grouped.has('suspension')).toBe(true)
    expect(grouped.has('brake')).toBe(true)
  })

  it('同名パーツは集約し、搭載グレードをまとめる', () => {
    const grouped = aggregateParts(grades)
    const engine = grouped.get('engine')!
    expect(engine).toHaveLength(1)
    expect(engine[0].grades).toEqual(['S', 'RS'])
  })
})

describe('PartStructureAccordion', () => {
  it('カテゴリ見出しを表示する', () => {
    render(<PartStructureAccordion grades={grades} />)
    expect(screen.getByText('エンジン')).toBeInTheDocument()
    expect(screen.getByText('サスペンション')).toBeInTheDocument()
    expect(screen.getByText('ブレーキ')).toBeInTheDocument()
  })

  it('パーツ名と出典を表示する', () => {
    render(<PartStructureAccordion grades={grades} />)
    expect(screen.getByText('ダブルウィッシュボーン')).toBeInTheDocument()
    expect(screen.getAllByText('Wikipedia').length).toBeGreaterThan(0)
  })

  it('パーツが無い場合は準備中メッセージを表示する', () => {
    render(<PartStructureAccordion grades={[]} />)
    expect(screen.getByText(/収録準備中/)).toBeInTheDocument()
  })
})
