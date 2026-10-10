import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ROAD_TYPE_LABELS } from '@/lib/constants/labels'
import type { RoadType } from '@/types/road'
import { RoadTypeBadge } from './RoadTypeBadge'
import { RoadTypeSymbol } from './RoadTypeSymbol'

const roadTypeCases: Array<[RoadType, string]> = [
  ['pass', '峠'],
  ['skyline', 'スカイライン'],
  ['coastal', '海岸線'],
  ['forest', '林道'],
  ['other', 'その他'],
]

describe('RoadTypeBadge', () => {
  it.each(roadTypeCases)('roadType="%s" always shows the text label "%s" (never color only)', (roadType, label) => {
    render(<RoadTypeBadge roadType={roadType} />)
    expect(screen.getByText(label)).toBeInTheDocument()
    expect(ROAD_TYPE_LABELS[roadType]).toBe(label)
  })

  it.each(roadTypeCases)('roadType="%s" renders a decorative symbol hidden from assistive technology', (roadType) => {
    const { container } = render(<RoadTypeBadge roadType={roadType} />)
    const symbols = container.querySelectorAll('svg')
    expect(symbols).toHaveLength(1)
    expect(symbols[0]).toHaveAttribute('aria-hidden', 'true')
  })

  it('accessible text content is exactly the label (the symbol adds no text)', () => {
    const { container } = render(<RoadTypeBadge roadType="coastal" />)
    expect(container.firstElementChild).toHaveTextContent(/^海岸線$/)
  })

  it('merges a custom className', () => {
    const { container } = render(<RoadTypeBadge roadType="pass" className="custom-class" />)
    expect(container.firstElementChild).toHaveClass('custom-class')
  })
})

describe('RoadTypeSymbol', () => {
  it.each(roadTypeCases)('roadType="%s" renders an aria-hidden, non-focusable svg with drawing content', (roadType) => {
    const { container } = render(<RoadTypeSymbol roadType={roadType} />)
    const symbol = container.querySelector('svg')
    expect(symbol).not.toBeNull()
    expect(symbol).toHaveAttribute('aria-hidden', 'true')
    expect(symbol).toHaveAttribute('focusable', 'false')
    expect(symbol?.childElementCount).toBeGreaterThan(0)
  })

  it('draws a different shape for each road type', () => {
    const shapes = roadTypeCases.map(([roadType]) => {
      const { container, unmount } = render(<RoadTypeSymbol roadType={roadType} />)
      const markup = container.querySelector('svg')?.innerHTML ?? ''
      unmount()
      return markup
    })
    expect(new Set(shapes).size).toBe(roadTypeCases.length)
  })

  it('merges a custom className', () => {
    const { container } = render(<RoadTypeSymbol roadType="forest" className="size-5" />)
    expect(container.querySelector('svg')).toHaveClass('size-5')
  })
})
