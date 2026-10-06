// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// listRoadSummaries / getRoad (US-06, US-01 404; architecture 3.5, 7, 7.3).
// Contract (types live in src/types/road.ts so UI layers can import them without touching features/):
//   type LatLng = { lat: number; lng: number }
//   type Road = { id; name; prefectureCode; roadType; start: LatLng; end: LatLng | null; createdAt; updatedAt }
//   type RoadSummary = { id; name; prefectureCode; roadType; start: LatLng; end: LatLng | null;
//                        createdAt; lastDrivenOn: string | null; lastRatingOverall: number | null; driveCount: number;
//                        averageOverall: number | null }   (averageOverall added in Sprint 3)
//   listRoadSummaries(): Promise<RoadSummary[]>  - signed out -> [] (no query); DB error -> throws
//   getRoad(roadId: string): Promise<Road | null> - malformed id / signed out / hidden by RLS -> null
//   getCollectionStats(): Promise<CollectionStats> (Sprint 3)
// Sprint 3 switches listRoadSummaries to the road_summaries view (architecture 3.5).

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

import { getCollectionStats, getRoad, listRoadSummaries } from './queries'

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

describe('listRoadSummaries() (Sprint 3: road_summaries view)', () => {
  // Sprint 3 contract (architecture 3.3 / 3.5, PRD US-07):
  //   reads the road_summaries view (security_invoker) with the view columns
  //     last_driven_on, last_rating_overall, drive_count, rating_overall_sum
  //   order: last_driven_on desc with nulls last, then created_at desc; .limit(500)
  //   RoadSummary gains averageOverall: number | null = roundedAverage(rating_overall_sum, drive_count)
  const summaryRowA = {
    ...rowA,
    last_driven_on: '2026-09-14',
    last_rating_overall: 5,
    drive_count: 3,
    rating_overall_sum: 13, // 4.333.. -> 4.3
  }
  const summaryRowB = {
    ...rowB,
    last_driven_on: null,
    last_rating_overall: null,
    drive_count: 0,
    rating_overall_sum: null,
  }

  beforeEach(() => {
    mocks.state.listResult = { data: [summaryRowA, summaryRowB], error: null }
  })

  it('reads the road_summaries view, not the roads table', async () => {
    await listRoadSummaries()
    expect(mocks.from).toHaveBeenCalledWith('road_summaries')
    expect(mocks.from).not.toHaveBeenCalledWith('roads')
  })

  it('orders by last driven date (newest first, roads without drives last), then by registration (newest first)', async () => {
    await listRoadSummaries()
    const orderCalls = mocks.builder.order.mock.calls
    expect(orderCalls[0]).toEqual(['last_driven_on', expect.objectContaining({ ascending: false, nullsFirst: false })])
    expect(orderCalls[1]).toEqual(['created_at', expect.objectContaining({ ascending: false })])
  })

  it('maps view rows to summaries with last driven date, last rating, drive count and the rounded average', async () => {
    const summaries = await listRoadSummaries()

    expect(summaries).toEqual([
      {
        id: ROAD_ID,
        name: '碓氷峠',
        prefectureCode: 10,
        roadType: 'pass',
        start: { lat: 36.35, lng: 138.7 },
        end: { lat: 36.4, lng: 138.65 },
        createdAt: '2026-10-07T03:00:00+00:00',
        lastDrivenOn: '2026-09-14',
        lastRatingOverall: 5,
        driveCount: 3,
        averageOverall: 4.3,
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
        averageOverall: null,
      },
    ])
  })

  it('selects the aggregate columns of the view', async () => {
    await listRoadSummaries()
    const selected = String(mocks.builder.select.mock.calls[0]?.[0] ?? '')
    for (const column of ['last_driven_on', 'last_rating_overall', 'drive_count', 'rating_overall_sum']) {
      expect(selected).toContain(column)
    }
    expect(selected).not.toMatch(/user_id|visibility/)
  })

  it('rounds the average the PRD way (sum x 10 / count, half up): 73 over 20 -> 3.7', async () => {
    mocks.state.listResult = { data: [{ ...summaryRowA, drive_count: 20, rating_overall_sum: 73 }], error: null }
    const [first] = await listRoadSummaries()
    expect(first.averageOverall).toBe(3.7)
  })

  it('caps the list at 500 rows (D-3: same as the per-user road limit)', async () => {
    await listRoadSummaries()
    expect(mocks.builder.limit).toHaveBeenCalledWith(500)
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

describe('getCollectionStats() (PRD US-11)', () => {
  // Contract: getCollectionStats(): Promise<CollectionStats> (src/lib/collection/stats.ts)
  //   reads road_summaries (prefecture_code, road_type, drive_count) and returns buildCollectionStats(rows).
  //   signed out -> empty stats without querying; DB error -> throws.
  it('aggregates the view rows (PRD example: 峠A 2件・長野 / 峠B 1件・長野 / スカイラインC 0件・静岡)', async () => {
    mocks.state.listResult = {
      data: [
        { prefecture_code: 20, road_type: 'pass', drive_count: 2 },
        { prefecture_code: 20, road_type: 'pass', drive_count: 1 },
        { prefecture_code: 22, road_type: 'skyline', drive_count: 0 },
      ],
      error: null,
    }

    const stats = await getCollectionStats()

    expect(mocks.from).toHaveBeenCalledWith('road_summaries')
    expect(stats).toEqual({
      drivenRoadCount: 2,
      byRoadType: { pass: 2, skyline: 0, coastal: 0, forest: 0, other: 0 },
      drivenPrefectureCount: 1,
      drivenRoadsByPrefecture: { 20: 2 },
    })
  })

  it('signed out -> zero stats without querying', async () => {
    mocks.getClaims.mockResolvedValue({ data: null, error: null })
    const stats = await getCollectionStats()
    expect(stats.drivenRoadCount).toBe(0)
    expect(stats.drivenPrefectureCount).toBe(0)
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('throws on a DB error', async () => {
    mocks.state.listResult = { data: null, error: { code: 'XX000', message: 'boom' } }
    await expect(getCollectionStats()).rejects.toThrow()
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
