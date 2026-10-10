import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { RoadSummary } from '@/types/road'
import { RoadList } from './RoadList'

// RoadList (US-06). Server organism. Contract: RoadList({ roads: RoadSummary[] })
// - 0 roads -> EmptyState E-01 + "道を登録" link to /roads/new
// - otherwise <ul aria-label="道のリスト"> with one <li> (RoadListItem) per road, order preserved

const E01 = 'まだ道が登録されていません。最初の道を登録しましょう'

function road(id: string, name: string): RoadSummary {
  return {
    id,
    name,
    prefectureCode: 10,
    roadType: 'pass',
    start: { lat: 36.35, lng: 138.7 },
    end: null,
    createdAt: '2026-10-07T03:00:00+00:00',
    lastDrivenOn: null,
    lastRatingOverall: null,
    driveCount: 0,
  }
}

const roads = [
  road('6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b', '碓氷峠'),
  road('11111111-2222-4333-8444-555555555555', '房総フラワーライン'),
  road('22222222-3333-4444-8555-666666666666', '伊豆スカイライン'),
]

describe('RoadList', () => {
  it('shows the E-01 empty state with a "道を登録" link when there are no roads', () => {
    render(<RoadList roads={[]} />)
    expect(screen.getByText(E01)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '道を登録' })).toHaveAttribute('href', '/roads/new')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('lists one item per road, keeping the given order', () => {
    render(<RoadList roads={roads} />)
    const list = screen.getByRole('list', { name: '道のリスト' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items.map((item) => within(item).getByRole('link').textContent)).toEqual([
      expect.stringContaining('碓氷峠'),
      expect.stringContaining('房総フラワーライン'),
      expect.stringContaining('伊豆スカイライン'),
    ])
  })

  it('links every item to its detail page', () => {
    render(<RoadList roads={roads} />)
    for (const item of roads) {
      expect(screen.getByRole('link', { name: new RegExp(item.name) })).toHaveAttribute(
        'href',
        `/roads/${item.id}`,
      )
    }
  })

  it('does not show the empty state when roads exist', () => {
    render(<RoadList roads={roads} />)
    expect(screen.queryByText(E01)).not.toBeInTheDocument()
  })
})
