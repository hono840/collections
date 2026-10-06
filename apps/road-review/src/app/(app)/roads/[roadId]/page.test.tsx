import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// /roads/[roadId] (S-06, minimal for Sprint 2). Server Component page:
//   getRoad(roadId) -> null => notFound() (missing id, other user's id, malformed id: same 404, US-01)
//   found => h1 name, type label, prefecture name, "開始地点: 設定済み" / "終了地点: 未設定|設定済み",
//            an "編集" link to /roads/<id>/edit, and the M-08 note for 林道.

const mocks = vi.hoisted(() => ({
  getRoad: vi.fn(),
  notFound: vi.fn(() => {
    throw Object.assign(new Error('NEXT_HTTP_ERROR_FALLBACK;404'), { digest: 'NEXT_HTTP_ERROR_FALLBACK;404' })
  }),
}))

vi.mock('server-only', () => ({}))
vi.mock('leaflet', async () => (await import('../../../../../tests/helpers/leaflet-mock')).leafletModule)
vi.mock('next/navigation', () => ({ notFound: mocks.notFound, redirect: vi.fn() }))
vi.mock('@/features/roads/queries', () => ({ getRoad: mocks.getRoad, listRoadSummaries: vi.fn() }))

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
