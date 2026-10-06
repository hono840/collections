import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RatingMeter } from './RatingMeter'

// RatingMeter (design spec 4-2 "表示だけの場合"; replaces the RatingStars idea - no stars).
// Contract: RatingMeter({ value: number | null; label: string; size?: 'sm' | 'md'; className? })
//   - role="img" with aria-label = label (the caller composes e.g. "総合評価 平均4.3" or "総合評価 4")
//   - always 5 cells (aria-hidden), each with data-filled="true" | "false"
//   - filled cells = meterFillCount(value) (round half up of the displayed value: 4.3 -> 4, 4.5 -> 5, 2.5 -> 3)
//   - value null -> renders nothing (no empty meter, design 4-4)
//   - no star glyphs

function cells(container: HTMLElement) {
  return Array.from(container.querySelectorAll('[data-filled]'))
}

function filledCount(container: HTMLElement) {
  return cells(container).filter((cell) => cell.getAttribute('data-filled') === 'true').length
}

describe('RatingMeter', () => {
  it('is an image named by the label', () => {
    render(<RatingMeter value={4.3} label="総合評価 平均4.3" />)
    expect(screen.getByRole('img', { name: '総合評価 平均4.3' })).toBeInTheDocument()
  })

  it.each([
    [4.3, 4],
    [4.5, 5],
    [2.5, 3],
    [1, 1],
    [5, 5],
    [3, 3],
  ])('value %d fills %d of 5 cells', (value, expected) => {
    const { container } = render(<RatingMeter value={value} label="総合評価" />)
    expect(cells(container)).toHaveLength(5)
    expect(filledCount(container)).toBe(expected)
  })

  it('cells are decorative (the label carries the value)', () => {
    const { container } = render(<RatingMeter value={2} label="総合評価 2" />)
    for (const cell of cells(container)) expect(cell.closest('[aria-hidden="true"], [role="img"]')).not.toBeNull()
  })

  it('renders nothing for null (no empty meter)', () => {
    const { container } = render(<RatingMeter value={null} label="総合評価" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('uses no star glyphs', () => {
    const { container } = render(<RatingMeter value={4} label="総合評価 4" size="md" />)
    expect(container.textContent ?? '').not.toMatch(/[★☆⭐]/)
  })
})
