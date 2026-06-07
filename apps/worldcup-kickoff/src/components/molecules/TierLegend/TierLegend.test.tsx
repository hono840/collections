import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TierLegend } from './TierLegend'
import {
  TIER_DISCLAIMER_JA,
  TIER_META,
  TIER_ORDER,
} from '@/lib/constants/tiers'

describe('TierLegend', () => {
  it('3つの tier のラベルが表示される', () => {
    render(<TierLegend />)
    expect(screen.getByText('優勝候補')).toBeInTheDocument()
    expect(screen.getByText('ダークホース')).toBeInTheDocument()
    expect(screen.getByText('チャレンジャー')).toBeInTheDocument()
  })

  it('各 tier の意味（summaryJa）が表示される', () => {
    render(<TierLegend />)
    for (const tier of TIER_ORDER) {
      expect(screen.getByText(TIER_META[tier].summaryJa)).toBeInTheDocument()
    }
  })

  it('各 tier の基準（criteriaJa）が表示される', () => {
    render(<TierLegend />)
    for (const tier of TIER_ORDER) {
      expect(screen.getByText(TIER_META[tier].criteriaJa)).toBeInTheDocument()
    }
  })

  it('主観・目安である旨の注記が表示される', () => {
    render(<TierLegend />)
    expect(screen.getByText(TIER_DISCLAIMER_JA)).toBeInTheDocument()
  })

  it('TIER_ORDER の順（優勝候補→ダークホース→チャレンジャー）で並ぶ', () => {
    const { container } = render(<TierLegend />)
    const labels = TIER_ORDER.map((tier) => TIER_META[tier].label)
    // 各ラベルの DOM 出現位置を取得し、TIER_ORDER 通りの並びかを確認する
    const text = container.textContent ?? ''
    const positions = labels.map((label) => text.indexOf(label))
    expect(positions.every((p) => p >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })
})
