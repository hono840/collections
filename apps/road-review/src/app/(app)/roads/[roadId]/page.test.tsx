import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

// /roads/[roadId] (S-06, minimal for Sprint 2). Server Component page:
//   getRoad(roadId) -> null => notFound() (missing id, other user's id, malformed id: same 404, US-01)
//   found => h1 name, type label, prefecture name, "開始地点: 設定済み" / "終了地点: 未設定|設定済み",
//            an "編集" link to /roads/<id>/edit, and the M-08 note for 林道.

const mocks = vi.hoisted(() => ({
  getRoad: vi.fn(),
  listDrives: vi.fn(),
  getLatestRoadInfo: vi.fn(),
  notFound: vi.fn(() => {
    throw Object.assign(new Error('NEXT_HTTP_ERROR_FALLBACK;404'), { digest: 'NEXT_HTTP_ERROR_FALLBACK;404' })
  }),
}))

vi.mock('server-only', () => ({}))
vi.mock('leaflet', async () => (await import('../../../../../tests/helpers/leaflet-mock')).leafletModule)
vi.mock('next/navigation', () => ({ notFound: mocks.notFound, redirect: vi.fn() }))
vi.mock('@/features/roads/queries', () => ({ getRoad: mocks.getRoad, listRoadSummaries: vi.fn() }))
// Sprint 3: the detail page also loads the drives and the latest road info.
vi.mock('@/features/drives/queries', () => ({
  listDrives: mocks.listDrives,
  getLatestRoadInfo: mocks.getLatestRoadInfo,
  getDrive: vi.fn(),
}))

import RoadDetailPage from './page'

const ROAD_ID = '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b'
const M08 =
  '林道は、舗装されていない区間や道幅の狭い区間があったり、一般車両の通行止めや季節による閉鎖が行われていたりする場合があります。お出かけ前に道路管理者の情報を確認し、通行止めの道には入らないでください。'

const road = {
  id: ROAD_ID,
  name: '碓氷峠',
  prefectureCode: 10,
  roadType: 'pass' as const,
  start: { lat: 36.35, lng: 138.7 },
  end: null,
  createdAt: '2026-10-07T03:00:00+00:00',
  updatedAt: '2026-10-07T03:00:00+00:00',
}

const EMPTY_LATEST = {
  motorcycleBan: null,
  nightClosure: null,
  winterClosure: null,
  toll: null,
  parking: null,
  toilet: null,
  michiNoEki: null,
  observatory: null,
}

beforeEach(() => {
  mocks.listDrives.mockResolvedValue([])
  mocks.getLatestRoadInfo.mockResolvedValue(EMPTY_LATEST)
})

async function renderPage(roadId = ROAD_ID) {
  const element = await RoadDetailPage({ params: Promise.resolve({ roadId }) })
  return render(element)
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('/roads/[roadId] page', () => {
  it('loads the road by the route param', async () => {
    mocks.getRoad.mockResolvedValue(road)
    await renderPage()
    expect(mocks.getRoad).toHaveBeenCalledWith(ROAD_ID)
  })

  it('shows the name as h1, the type label and the prefecture name', async () => {
    mocks.getRoad.mockResolvedValue(road)
    await renderPage()
    expect(screen.getByRole('heading', { level: 1, name: '碓氷峠' })).toBeInTheDocument()
    expect(screen.getByText('峠')).toBeInTheDocument()
    expect(screen.getByText('群馬県')).toBeInTheDocument()
  })

  it('describes the pins in text (map alternative)', async () => {
    mocks.getRoad.mockResolvedValue(road)
    await renderPage()
    expect(screen.getByText(/開始地点: 設定済み/)).toBeInTheDocument()
    expect(screen.getByText(/終了地点: 未設定/)).toBeInTheDocument()
  })

  it('says 終了地点: 設定済み when the end pin exists', async () => {
    mocks.getRoad.mockResolvedValue({ ...road, end: { lat: 36.4, lng: 138.65 } })
    await renderPage()
    expect(screen.getByText(/終了地点: 設定済み/)).toBeInTheDocument()
  })

  it('links to the edit page', async () => {
    mocks.getRoad.mockResolvedValue(road)
    await renderPage()
    expect(screen.getByRole('link', { name: /編集/ })).toHaveAttribute('href', `/roads/${ROAD_ID}/edit`)
  })

  it('shows the M-08 note only for 林道', async () => {
    mocks.getRoad.mockResolvedValue(road)
    const { unmount } = await renderPage()
    expect(screen.queryByText(M08)).not.toBeInTheDocument()
    unmount()

    mocks.getRoad.mockResolvedValue({ ...road, roadType: 'forest' })
    await renderPage()
    expect(screen.getByText(M08)).toBeInTheDocument()
    expect(screen.getByText('注意')).toBeInTheDocument()
  })

  it("calls notFound() when the road is missing or belongs to another user (getRoad -> null)", async () => {
    mocks.getRoad.mockResolvedValue(null)
    await expect(renderPage('11111111-2222-4333-8444-555555555555')).rejects.toThrow(
      'NEXT_HTTP_ERROR_FALLBACK;404',
    )
    expect(mocks.notFound).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Sprint 3: the completed road detail (architecture 15 Sprint 3; PRD US-08; UX S-06; RoadDetailTemplate).
//   loads listDrives(roadId) and getLatestRoadInfo(roadId) (in parallel with or after getRoad)
//   header: "走った回数 N回・最後 YYYY-MM-DD" (only when N > 0)
//   RatingSummary (評価のまとめ) when there are drives, RoadInfoSummary (道の情報 + M-06) always,
//   DriveList (newest first; 0 -> E-03), a "走行記録を追加" link to /roads/<id>/drives/new
// ---------------------------------------------------------------------------

const M06 = 'これはあなた自身の記録で、公式情報ではありません。お出かけ前に道路管理者の公式情報を確認してください。'
const E03 = 'まだ走行記録がありません。ドライブのあと、落ち着いた場所で印象を書き残しましょう。'

function drive(id: string, drivenOn: string, ratingOverall: number, memo: string) {
  return {
    id,
    roadId: ROAD_ID,
    drivenOn,
    vehicleType: null,
    weather: null,
    ratingOverall,
    ratingScenery: null,
    ratingRoadSurface: null,
    ratingEaseOfDriving: null,
    traffic: 'few' as const,
    memo,
    createdAt: `${drivenOn}T01:00:00Z`,
    updatedAt: `${drivenOn}T01:00:00Z`,
  }
}

const drives = [
  drive('00000000-0000-4000-8000-000000000002', '2026-09-14', 5, '新しい記録'),
  drive('00000000-0000-4000-8000-000000000001', '2026-05-03', 4, '古い記録'),
]

describe('/roads/[roadId] page (Sprint 3: drives, ratings, road info)', () => {
  it('loads the drives and the latest road info of this road', async () => {
    mocks.getRoad.mockResolvedValue(road)
    await renderPage()
    expect(mocks.listDrives).toHaveBeenCalledWith(ROAD_ID)
    expect(mocks.getLatestRoadInfo).toHaveBeenCalledWith(ROAD_ID)
  })

  it('always offers "走行記録を追加" linking to the record form', async () => {
    mocks.getRoad.mockResolvedValue(road)
    mocks.listDrives.mockResolvedValue(drives)
    await renderPage()
    const links = screen.getAllByRole('link', { name: '走行記録を追加' })
    expect(links.length).toBeGreaterThanOrEqual(1)
    for (const link of links) expect(link).toHaveAttribute('href', `/roads/${ROAD_ID}/drives/new`)
  })

  it('0 drives: E-03 and no rating summary', async () => {
    mocks.getRoad.mockResolvedValue(road)
    await renderPage()
    expect(screen.getByText(E03)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: '評価のまとめ' })).not.toBeInTheDocument()
    expect(screen.queryByText(/走った回数/)).not.toBeInTheDocument()
  })

  it('with drives: the header says "走った回数 2回・最後 2026-09-14"', async () => {
    mocks.getRoad.mockResolvedValue(road)
    mocks.listDrives.mockResolvedValue(drives)
    await renderPage()
    expect(screen.getByText('走った回数 2回・最後 2026-09-14')).toBeInTheDocument()
  })

  it('with drives: the rating summary shows the overall average and the traffic counts', async () => {
    mocks.getRoad.mockResolvedValue(road)
    mocks.listDrives.mockResolvedValue(drives)
    await renderPage()
    const summary = screen.getByRole('list', { name: '評価のまとめ' })
    expect(summary).toHaveTextContent('4.5（2件の平均）')
    expect(summary).toHaveTextContent('少 2・普通 0・多 0')
  })

  it('lists the drives newest first', async () => {
    mocks.getRoad.mockResolvedValue(road)
    mocks.listDrives.mockResolvedValue([...drives].reverse())
    await renderPage()
    const items = within(screen.getByRole('list', { name: '走行記録' })).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('新しい記録')
    expect(items[1]).toHaveTextContent('古い記録')
  })

  it('always shows the road info section with the M-06 note (even when nothing is recorded)', async () => {
    mocks.getRoad.mockResolvedValue(road)
    await renderPage()
    const region = screen.getByRole('region', { name: /道の情報/ })
    expect(within(region).getByText(M06)).toBeInTheDocument()
  })

  it('shows the latest road info values with their confirmation dates', async () => {
    mocks.getRoad.mockResolvedValue(road)
    mocks.listDrives.mockResolvedValue(drives)
    mocks.getLatestRoadInfo.mockResolvedValue({
      ...EMPTY_LATEST,
      motorcycleBan: { status: 'yes', memo: '土日のみ', confirmedOn: '2026-09-14' },
    })
    await renderPage()
    expect(screen.getByRole('region', { name: /道の情報/ })).toHaveTextContent('あり（土日のみ）・確認日 2026-09-14')
  })

  it('does not show the safety banner on the detail page (UX 7: only on the record form)', async () => {
    mocks.getRoad.mockResolvedValue(road)
    await renderPage()
    expect(screen.queryByText('運転中は操作しないでください')).not.toBeInTheDocument()
  })

  it('a missing road is still a 404', async () => {
    mocks.getRoad.mockResolvedValue(null)
    await expect(renderPage()).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
  })
})
