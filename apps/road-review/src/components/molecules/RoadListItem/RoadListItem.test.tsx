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

// ---------------------------------------------------------------------------
// Sprint 3 (architecture 15 Sprint 3 "RoadListItem の最終走行日・総合評価"; PRD US-07; design spec 4-4):
//   RoadSummary gains averageOverall: number | null (rounded to 1 decimal by the query).
//   With drives the card shows "最終 YYYY-MM-DD", "記録 N件", "総合 平均 X.X" (one decimal) and a
//   RatingMeter named "総合評価 平均X.X". Without drives: only "走行記録なし" (no meter, no 最終).
// ---------------------------------------------------------------------------

describe('RoadListItem with drives (Sprint 3)', () => {
  const drivenRoad: RoadSummary = {
    ...baseRoad,
    lastDrivenOn: '2026-09-14',
    lastRatingOverall: 5,
    driveCount: 3,
    averageOverall: 4.3,
  } as RoadSummary

  it('shows the last driven date as "最終 YYYY-MM-DD"', () => {
    render(<RoadListItem road={drivenRoad} />)
    expect(screen.getByText('最終 2026-09-14')).toBeInTheDocument()
  })

  it('shows the drive count "記録 3件"', () => {
    render(<RoadListItem road={drivenRoad} />)
    expect(screen.getByRole('link')).toHaveTextContent('記録 3件')
  })

  it('shows the overall average with one decimal: "総合 平均 4.3"', () => {
    render(<RoadListItem road={drivenRoad} />)
    expect(screen.getByRole('link')).toHaveTextContent(/総合\s*平均\s*4\.3/)
  })

  it('a whole-number average still shows one decimal (4 -> 4.0)', () => {
    render(<RoadListItem road={{ ...drivenRoad, averageOverall: 4 } as RoadSummary} />)
    expect(screen.getByRole('link')).toHaveTextContent(/総合\s*平均\s*4\.0/)
  })

  it('has a rating meter named "総合評価 平均4.3"', () => {
    render(<RoadListItem road={drivenRoad} />)
    expect(screen.getByRole('img', { name: '総合評価 平均4.3' })).toBeInTheDocument()
  })

  it('does not show "走行記録なし" when there are drives', () => {
    render(<RoadListItem road={drivenRoad} />)
    expect(screen.queryByText('走行記録なし')).not.toBeInTheDocument()
  })

  it('without drives: no meter image, no average, no 最終', () => {
    render(<RoadListItem road={{ ...baseRoad, averageOverall: null } as RoadSummary} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByRole('link')).not.toHaveTextContent('平均')
    expect(screen.getByText('走行記録なし')).toBeInTheDocument()
  })
})
