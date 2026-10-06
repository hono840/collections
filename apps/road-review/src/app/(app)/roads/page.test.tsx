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

// ---------------------------------------------------------------------------
// Sprint 3: collection summary on /roads (PRD US-11 items 1-3, CTO brief: shown on /roads this sprint).
// Contract: the page derives the stats from the SAME listRoadSummaries() result with
// buildCollectionStats() (no second query; getCollectionStats() is for a future /collection page),
// and renders <CollectionSummary> (region "走った道のコレクション") only when at least one road exists
// (0 roads -> only E-01). RoadsIndexTemplate gains an optional `summary` slot for it.
// ---------------------------------------------------------------------------

describe('/roads page collection summary (Sprint 3)', () => {
  function drivenRoad(id: string, name: string, prefectureCode: number, roadType: RoadSummary['roadType'], driveCount: number) {
    return {
      ...road(id, name),
      prefectureCode,
      roadType,
      driveCount,
      lastDrivenOn: driveCount > 0 ? '2026-09-14' : null,
      lastRatingOverall: driveCount > 0 ? 4 : null,
      averageOverall: driveCount > 0 ? 4 : null,
    } as RoadSummary
  }

  const collectionRoads = [
    drivenRoad('6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b', '峠A', 20, 'pass', 2),
    drivenRoad('11111111-2222-4333-8444-555555555555', '峠B', 20, 'pass', 1),
    drivenRoad('22222222-3333-4444-8555-666666666666', 'スカイラインC', 22, 'skyline', 0),
  ]

  it('shows 走った道 / 種別ごとの本数 / 走った都道府県 computed from the listed roads (PRD example)', async () => {
    mocks.listRoadSummaries.mockResolvedValue(collectionRoads)
    await renderPage()

    const region = screen.getByRole('region', { name: '走った道のコレクション' })
    expect(region).toHaveTextContent(/走った道\s*2\s*本/)
    const types = within(within(region).getByRole('list', { name: '種別ごとの本数' })).getAllByRole('listitem')
    expect(types[0]).toHaveTextContent(/峠\s*2\s*本/)
    expect(types[1]).toHaveTextContent(/スカイライン\s*0\s*本/)
    expect(region).toHaveTextContent(/走った都道府県\s*1\s*\/\s*47/)
    expect(mocks.listRoadSummaries).toHaveBeenCalledTimes(1)
  })

  it('with roads but no drives yet shows the E-06 message', async () => {
    mocks.listRoadSummaries.mockResolvedValue(roads)
    await renderPage()
    expect(screen.getByText('まだ走った道はありません。走行記録を追加するとここに数えられます')).toBeInTheDocument()
  })

  it('with 0 roads there is no collection summary (E-01 only)', async () => {
    mocks.listRoadSummaries.mockResolvedValue([])
    await renderPage()
    expect(screen.queryByRole('region', { name: '走った道のコレクション' })).not.toBeInTheDocument()
  })
})
