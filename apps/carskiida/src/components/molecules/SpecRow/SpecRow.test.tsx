import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SpecRow } from './SpecRow'
import type { Source } from '@/types/car'

const source: Source = {
  type: 'manufacturer',
  label: 'マツダ公式',
  retrievedAt: '2026-06-07',
  confidence: 'high',
}

describe('SpecRow', () => {
  it('ラベルと値を表示する', () => {
    render(<SpecRow label="車両重量" value="990 kg" source={source} />)
    expect(screen.getByText('車両重量')).toBeInTheDocument()
    expect(screen.getByText('990 kg')).toBeInTheDocument()
  })

  it('出典が指定されると出典バッジを表示する', () => {
    render(<SpecRow label="出力" value="97 kW" source={source} />)
    expect(screen.getByText('OEM')).toBeInTheDocument()
  })

  it('値が欠損（undefined）なら「データなし」を表示する', () => {
    render(<SpecRow label="燃費" />)
    expect(screen.getByText(/データなし/)).toBeInTheDocument()
  })

  it('値が空文字でも「データなし」を表示する', () => {
    render(<SpecRow label="燃費" value="" source={source} />)
    expect(screen.getByText(/データなし/)).toBeInTheDocument()
    // 欠損時は出典バッジを出さない
    expect(screen.queryByText('OEM')).not.toBeInTheDocument()
  })
})
