import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GenerationExplorer } from './GenerationExplorer'
import type { Generation, Source } from '@/types/car'

const source: Source = {
  type: 'manufacturer',
  label: 'マツダ公式',
  retrievedAt: '2026-06-07',
  confidence: 'medium',
}

const generations: Generation[] = [
  {
    id: 'nd',
    ordinal: 4,
    code: 'ND',
    nameJa: '4代目 ND型',
    yearFrom: 2015,
    isCurated: true,
    narrativeMd: 'NDの解説',
    production: [],
    grades: [
      {
        id: 'nd-s',
        name: 'S',
        specs: [
          { key: 'weight_kg', valueNormalized: 990, valueDisplay: '990 kg', unit: 'kg', source, confidence: 'medium' },
        ],
        parts: [{ id: 'e', category: 'engine', nameJa: '直4 1.5L', source }],
      },
    ],
  },
  {
    id: 'nc',
    ordinal: 3,
    code: 'NC',
    nameJa: '3代目 NC型',
    yearFrom: 2005,
    yearTo: 2015,
    isCurated: true,
    narrativeMd: 'NCの解説',
    production: [],
    grades: [
      {
        id: 'nc-rs',
        name: 'RS',
        specs: [
          { key: 'weight_kg', valueNormalized: 1110, valueDisplay: '1,110 kg', unit: 'kg', source, confidence: 'medium' },
        ],
        parts: [{ id: 'e2', category: 'engine', nameJa: '直4 2.0L', source }],
      },
    ],
  },
]

describe('GenerationExplorer', () => {
  it('初期状態で最初の世代（ND）の内容を表示する', () => {
    render(<GenerationExplorer generations={generations} />)
    expect(screen.getByText('NDの解説')).toBeInTheDocument()
    expect(screen.getByText('990 kg')).toBeInTheDocument()
  })

  it('別の世代を選ぶと内容が切り替わる', async () => {
    const user = userEvent.setup()
    render(<GenerationExplorer generations={generations} />)
    await user.click(screen.getByText('3代目 NC型'))
    expect(screen.getByText('NCの解説')).toBeInTheDocument()
    expect(screen.getByText('1,110 kg')).toBeInTheDocument()
  })
})
