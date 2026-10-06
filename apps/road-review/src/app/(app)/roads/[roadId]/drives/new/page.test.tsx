import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// /roads/[roadId]/drives/new (UX S-08, architecture US-03 / US-04; PRD US-06). Server Component page:
//   getRoad(roadId) -> null => notFound() (missing / other user's / malformed id: same 404)
//   found => FormPageTemplate title "走行記録を追加" + DriveForm mode="create" with roadId, roadName,
//            roadType and defaultDrivenOn = todayInTokyo() computed on the server (JST)
//   metadata.title = '走行記録を追加'

const mocks = vi.hoisted(() => ({
  getRoad: vi.fn(),
  notFound: vi.fn(() => {
    throw Object.assign(new Error('NEXT_HTTP_ERROR_FALLBACK;404'), { digest: 'NEXT_HTTP_ERROR_FALLBACK;404' })
  }),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/navigation', () => ({ notFound: mocks.notFound, redirect: vi.fn() }))
vi.mock('@/features/roads/queries', () => ({ getRoad: mocks.getRoad, listRoadSummaries: vi.fn() }))
vi.mock('@/features/drives/actions', () => ({ createDrive: vi.fn(), updateDrive: vi.fn() }))

import NewDrivePage, { metadata } from './page'

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
  const element = await NewDrivePage({ params: Promise.resolve({ roadId }) })
  return render(element)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  // 2026-10-07 00:30 JST while UTC is still 2026-10-06
  vi.setSystemTime(new Date('2026-10-06T15:30:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('/roads/[roadId]/drives/new page', () => {
  it('has the page title', () => {
    expect(metadata.title).toBe('走行記録を追加')
  })

  it('loads the road by the route param and shows the h1 and the road name', async () => {
    mocks.getRoad.mockResolvedValue(road)
    await renderPage()
    expect(mocks.getRoad).toHaveBeenCalledWith(ROAD_ID)
    expect(screen.getByRole('heading', { level: 1, name: '走行記録を追加' })).toBeInTheDocument()
    expect(screen.getByText('碓氷峠')).toBeInTheDocument()
  })

  it('shows the safety banner (M-01) on the record form', async () => {
    mocks.getRoad.mockResolvedValue(road)
    await renderPage()
    const notes = screen.getAllByRole('note')
    expect(notes[0]).toHaveTextContent('運転中は操作しないでください')
  })

  it('defaults 走行日 to today in JST', async () => {
    mocks.getRoad.mockResolvedValue(road)
    await renderPage()
    expect(screen.getByLabelText(/走行日/)).toHaveValue('2026-10-07')
  })

  it('shows the forest road note for 林道', async () => {
    mocks.getRoad.mockResolvedValue({ ...road, roadType: 'forest' })
    await renderPage()
    expect(screen.getByText(M08)).toBeInTheDocument()
  })

  it('calls notFound() when the road is missing or not visible', async () => {
    mocks.getRoad.mockResolvedValue(null)
    await expect(renderPage('11111111-2222-4333-8444-555555555555')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    expect(mocks.notFound).toHaveBeenCalled()
  })
})
