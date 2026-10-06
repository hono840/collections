// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// listRoadSummaries / getRoad (US-06, US-01 404; architecture 3.5, 7, 7.3).
// Contract (types live in src/types/road.ts so UI layers can import them without touching features/):
//   type LatLng = { lat: number; lng: number }
//   type Road = { id; name; prefectureCode; roadType; start: LatLng; end: LatLng | null; createdAt; updatedAt }
//   type RoadSummary = { id; name; prefectureCode; roadType; start: LatLng; end: LatLng | null;
//                        createdAt; lastDrivenOn: string | null; lastRatingOverall: number | null; driveCount: number }
//   listRoadSummaries(): Promise<RoadSummary[]>  - signed out -> [] (no query); DB error -> throws
//   getRoad(roadId: string): Promise<Road | null> - malformed id / signed out / hidden by RLS -> null
// Sprint 2 reads the roads table directly (road_summaries view arrives in Sprint 3).

const ROAD_ID = '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b'

const mocks = vi.hoisted(() => {
  const state: { listResult: { data: unknown; error: unknown } } = {
    listResult: { data: [], error: null },
  }
  const maybeSingle = vi.fn()
  const single = vi.fn()
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'order', 'limit']) {
    builder[method] = vi.fn(() => builder)
  }
  builder.maybeSingle = maybeSingle
  builder.single = single
  // Awaiting the builder (list query) resolves to state.listResult.
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(state.listResult).then(resolve, reject)
  const from = vi.fn(() => builder)
  const getClaims = vi.fn()
  return { state, builder: builder as Record<string, ReturnType<typeof vi.fn>>, maybeSingle, single, from, getClaims }
})

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ getAll: () => [], set: vi.fn() })) }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getClaims: mocks.getClaims }, from: mocks.from })),
}))

import { getRoad, listRoadSummaries } from './queries'

const rowA = {
  id: ROAD_ID,
  user_id: 'user-a',
  name: '碓氷峠',
  prefecture_code: 10,
  road_type: 'pass',
  start_lat: 36.35,
  start_lng: 138.7,
  end_lat: 36.4,
  end_lng: 138.65,
  visibility: 'private',
  created_at: '2026-10-07T03:00:00+00:00',
  updated_at: '2026-10-08T03:00:00+00:00',
}

const rowB = {
  ...rowA,
  id: '11111111-2222-4333-8444-555555555555',
  name: '房総フラワーライン',
  prefecture_code: 12,
  road_type: 'coastal',
  start_lat: 34.92,
  start_lng: 139.83,
  end_lat: null,
  end_lng: null,
  created_at: '2026-10-06T03:00:00+00:00',
}

beforeEach(() => {
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: 'user-a' } }, error: null })
  mocks.state.listResult = { data: [rowA, rowB], error: null }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('listRoadSummaries()', () => {
  it('reads roads newest first and maps rows to camelCase summaries', async () => {
    const summaries = await listRoadSummaries()

    expect(mocks.from).toHaveBeenCalledWith('roads')
    expect(mocks.builder.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(summaries).toEqual([
      {
        id: ROAD_ID,
        name: '碓氷峠',
        prefectureCode: 10,
        roadType: 'pass',
        start: { lat: 36.35, lng: 138.7 },
        end: { lat: 36.4, lng: 138.65 },
        createdAt: '2026-10-07T03:00:00+00:00',
        lastDrivenOn: null,
        lastRatingOverall: null,
        driveCount: 0,
      },
      {
        id: '11111111-2222-4333-8444-555555555555',
        name: '房総フラワーライン',
        prefectureCode: 12,
        roadType: 'coastal',
        start: { lat: 34.92, lng: 139.83 },
        end: null,
        createdAt: '2026-10-06T03:00:00+00:00',
        lastDrivenOn: null,
        lastRatingOverall: null,
        driveCount: 0,
      },
    ])
  })

  it('does not leak user_id / visibility into the summaries', async () => {
    const [first] = await listRoadSummaries()
    expect(first).not.toHaveProperty('user_id')
    expect(first).not.toHaveProperty('userId')
    expect(first).not.toHaveProperty('visibility')
  })

  it('returns [] for no roads', async () => {
    mocks.state.listResult = { data: [], error: null }
    await expect(listRoadSummaries()).resolves.toEqual([])
  })

  it('returns [] when signed out, without querying', async () => {
    mocks.getClaims.mockResolvedValue({ data: null, error: null })
    await expect(listRoadSummaries()).resolves.toEqual([])
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('throws on a DB error (handled by error.tsx)', async () => {
    mocks.state.listResult = { data: null, error: { code: 'XX000', message: 'boom' } }
    await expect(listRoadSummaries()).rejects.toThrow()
  })
})

describe('getRoad()', () => {
  beforeEach(() => {
    mocks.maybeSingle.mockResolvedValue({ data: rowA, error: null })
  })

  it('returns the road by id as camelCase', async () => {
    const road = await getRoad(ROAD_ID)

    expect(mocks.from).toHaveBeenCalledWith('roads')
    expect(mocks.builder.eq).toHaveBeenCalledWith('id', ROAD_ID)
    expect(road).toEqual({
      id: ROAD_ID,
      name: '碓氷峠',
      prefectureCode: 10,
      roadType: 'pass',
      start: { lat: 36.35, lng: 138.7 },
      end: { lat: 36.4, lng: 138.65 },
      createdAt: '2026-10-07T03:00:00+00:00',
      updatedAt: '2026-10-08T03:00:00+00:00',
    })
  })

  it('maps a road without an end pin to end: null', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: rowB, error: null })
    const road = await getRoad(rowB.id)
    expect(road?.end).toBeNull()
  })

  it("returns null when RLS hides the row (other user's road or deleted id)", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    await expect(getRoad(ROAD_ID)).resolves.toBeNull()
  })

  it.each(['not-a-uuid', '', '../etc', `${ROAD_ID}x`])(
    'returns null for a malformed id %j without querying',
    async (roadId) => {
      await expect(getRoad(roadId)).resolves.toBeNull()
      expect(mocks.from).not.toHaveBeenCalled()
    },
  )

  it('returns null when signed out, without querying', async () => {
    mocks.getClaims.mockResolvedValue({ data: null, error: null })
    await expect(getRoad(ROAD_ID)).resolves.toBeNull()
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('throws on an unexpected DB error', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'boom' } })
    await expect(getRoad(ROAD_ID)).rejects.toThrow()
  })
})
