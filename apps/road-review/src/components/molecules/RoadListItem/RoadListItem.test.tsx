import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { RoadSummary } from '@/types/road'
import { RoadListItem } from './RoadListItem'

// Contract: RoadListItem({ road: RoadSummary }) - Server Component, the whole card is one link to /roads/<id>.
// Sprint 2: drives do not exist yet (lastDrivenOn/lastRatingOverall null, driveCount 0) -> "走行記録なし" (M-25).
// Last driven date / rating rendering is specified in Sprint 3.

const baseRoad: RoadSummary = {
  id: '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b',
  name: '碓氷峠',
  prefectureCode: 10,
  roadType: 'pass',
  start: { lat: 36.35, lng: 138.7 },
  end: null,
  createdAt: '2026-10-07T03:00:00+00:00',
  lastDrivenOn: null,
  lastRatingOverall: null,
  driveCount: 0,
}

describe('RoadListItem', () => {
  it('is a single link to the road detail, named by the road name', () => {
    render(<RoadListItem road={baseRoad} />)
    const link = screen.getByRole('link', { name: /碓氷峠/ })
    expect(link).toHaveAttribute('href', `/roads/${baseRoad.id}`)
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('shows the prefecture name (not the code)', () => {
    render(<RoadListItem road={baseRoad} />)
    expect(screen.getByText('群馬県')).toBeInTheDocument()
  })

  it.each([
    ['pass', '峠'],
    ['skyline', 'スカイライン'],
    ['coastal', '海岸線'],
    ['forest', '林道'],
    ['other', 'その他'],
  ] as const)('shows the road type badge as text: %s -> %s', (roadType, label) => {
    render(<RoadListItem road={{ ...baseRoad, roadType }} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('shows "走行記録なし" when the road has no drives yet', () => {
    render(<RoadListItem road={baseRoad} />)
    expect(screen.getByText('走行記録なし')).toBeInTheDocument()
  })

  it('renders placeholders gracefully: no "最終", no empty meter, no null/undefined/NaN text', () => {
    const { container } = render(<RoadListItem road={baseRoad} />)
    const text = container.textContent ?? ''
    expect(text).not.toContain('最終')
    expect(text).not.toMatch(/null|undefined|NaN/)
    expect(screen.queryByRole('meter')).not.toBeInTheDocument()
  })

  it('escapes the road name (rendered as text, not HTML)', () => {
    const { container } = render(
      <RoadListItem road={{ ...baseRoad, name: '<img src=x onerror=alert(1)>' }} />,
    )
    expect(container.querySelector('img[src="x"]')).toBeNull()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
  })
})
