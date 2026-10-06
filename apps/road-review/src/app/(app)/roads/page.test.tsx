import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { RoadSummary } from '@/types/road'

// /roads (S-05, US-06). Server Component page:
//   listRoadSummaries() -> RoadsIndexTemplate(actions="道を登録" link, map=<RoadsMap roads>, list=<RoadList roads>)
// The map and the list receive the same roads (marker count == list count).

const mocks = vi.hoisted(() => ({ listRoadSummaries: vi.fn(), roadsMapProps: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/features/roads/queries', () => ({
  listRoadSummaries: mocks.listRoadSummaries,
  getRoad: vi.fn(),
}))
vi.mock('@/components/organisms/RoadsMap', () => ({
  RoadsMap: (props: { roads: RoadSummary[] }) => {
    mocks.roadsMapProps(props)
    return <div data-testid="roads-map" data-count={props.roads.length} />
  },
}))

import RoadsPage, { metadata } from './page'

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
]

async function renderPage() {
  const element = await RoadsPage()
  return render(element)
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('/roads page', () => {
  it('keeps the page title', () => {
    expect(metadata.title).toBe('道の一覧')
  })

  it('shows the heading and a "道を登録" action to /roads/new', async () => {
    mocks.listRoadSummaries.mockResolvedValue(roads)
    await renderPage()
    expect(screen.getByRole('heading', { level: 1, name: '道の一覧' })).toBeInTheDocument()
    const registerLinks = screen.getAllByRole('link', { name: '道を登録' })
    expect(registerLinks.length).toBeGreaterThanOrEqual(1)
    for (const link of registerLinks) expect(link).toHaveAttribute('href', '/roads/new')
  })

  it('with 0 roads shows the E-01 empty state and no list', async () => {
    mocks.listRoadSummaries.mockResolvedValue([])
    await renderPage()
    expect(screen.getByText(E01)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: '道のリスト' })).not.toBeInTheDocument()
  })

  it('with roads shows the list and the map with the same roads (counts match)', async () => {
    mocks.listRoadSummaries.mockResolvedValue(roads)
    await renderPage()

    const list = screen.getByRole('list', { name: '道のリスト' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByTestId('roads-map')).toHaveAttribute('data-count', '2')
    expect(mocks.roadsMapProps).toHaveBeenLastCalledWith({ roads })
    expect(screen.queryByText(E01)).not.toBeInTheDocument()
  })

  it('no longer shows the Sprint 1 placeholder text', async () => {
    mocks.listRoadSummaries.mockResolvedValue(roads)
    await renderPage()
    expect(screen.queryByText('道の一覧と登録は準備中です。')).not.toBeInTheDocument()
  })
})
