// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// listDrives / getDrive / getLatestRoadInfo (architecture US-04 / US-07 / US-09; ch.3.2 補足, 3.3, 7).
// Contract (src/features/drives/queries.ts, 'server-only'; types in src/types/drive.ts):
//   type Drive = { id; roadId; drivenOn: string; vehicleType: 'car'|'motorcycle'|null;
//                  weather: 'sunny'|'cloudy'|'rain'|'snow'|'other'|null; ratingOverall: number;
//                  ratingScenery: number|null; ratingRoadSurface: number|null; ratingEaseOfDriving: number|null;
//                  traffic: 'few'|'normal'|'many'|null; memo: string; createdAt: string; updatedAt: string }
//                  (never user_id / visibility)
//   type RoadInfoValues = { confirmedOn: string; items: Record<RoadInfoItem, { status; memo }> }
//   type DriveWithRoadInfo = Drive & { roadInfo: RoadInfoValues | null }
//   listDrives(roadId): Promise<Drive[]>
//     - from('drives').eq('road_id', roadId), order driven_on desc, then created_at desc (US-07)
//     - malformed id / signed out -> [] without querying; DB error -> throws
//   getDrive(roadId, driveId): Promise<DriveWithRoadInfo | null>
//     - filters BOTH id = driveId and road_id = roadId (a drive of another road -> null -> 404, PRD 6)
//     - embeds road_info; malformed ids / signed out / hidden -> null; DB error -> throws
//   getLatestRoadInfo(roadId): Promise<LatestRoadInfo>
//     - from('road_info') with an inner join on drives filtered by drives.road_id = roadId
//     - rows -> pickLatestRoadInfo() (per item, newest confirmed_on, then created_at)
//     - malformed id / signed out -> every item null, without querying; DB error -> throws

const ROAD_ID = '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b'
const DRIVE_ID = '0a0b0c0d-1e1f-4a2b-8c3d-4e5f6a7b8c9d'
const DRIVE_ID_2 = '1a1b1c1d-2e2f-4a3b-8c4d-5e6f7a8b9c0d'

const mocks = vi.hoisted(() => {
  const state: { listResult: { data: unknown; error: unknown } } = { listResult: { data: [], error: null } }
  const maybeSingle = vi.fn()
  const single = vi.fn()
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'order', 'limit', 'in']) {
    builder[method] = vi.fn(() => builder)
  }
  builder.maybeSingle = maybeSingle
  builder.single = single
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

import { getDrive, getLatestRoadInfo, listDrives } from './queries'

const driveRow = {
  id: DRIVE_ID,
  user_id: 'user-a',
  road_id: ROAD_ID,
  driven_on: '2026-09-14',
  vehicle_type: 'motorcycle',
  weather: 'sunny',
  rating_overall: 4,
  rating_scenery: 5,
  rating_road_surface: null,
  rating_ease_of_driving: 3,
  traffic: 'few',
  memo: '紅葉がきれいだった',
  visibility: 'private',
  created_at: '2026-09-14T09:00:00+00:00',
  updated_at: '2026-09-15T09:00:00+00:00',
}

const expectedDrive = {
  id: DRIVE_ID,
  roadId: ROAD_ID,
  drivenOn: '2026-09-14',
  vehicleType: 'motorcycle',
  weather: 'sunny',
  ratingOverall: 4,
  ratingScenery: 5,
  ratingRoadSurface: null,
  ratingEaseOfDriving: 3,
  traffic: 'few',
  memo: '紅葉がきれいだった',
  createdAt: '2026-09-14T09:00:00+00:00',
  updatedAt: '2026-09-15T09:00:00+00:00',
}

function roadInfoRow(overrides: Record<string, unknown> = {}) {
  return {
    drive_id: DRIVE_ID,
    user_id: 'user-a',
    confirmed_on: '2026-09-14',
    motorcycle_ban: 'yes',
    motorcycle_ban_memo: '土日のみ',
    night_closure: null,
    night_closure_memo: '',
    winter_closure: 'unknown',
    winter_closure_memo: '',
    toll: 'free',
    toll_memo: '',
    parking: null,
    parking_memo: '',
    toilet: 'yes',
    toilet_memo: '',
    michi_no_eki: null,
    michi_no_eki_memo: '',
    observatory: 'no',
    observatory_memo: '',
    created_at: '2026-09-14T09:00:00+00:00',
    updated_at: '2026-09-14T09:00:00+00:00',
    ...overrides,
  }
}

const expectedRoadInfoItems = {
  motorcycleBan: { status: 'yes', memo: '土日のみ' },
  nightClosure: { status: null, memo: '' },
  winterClosure: { status: 'unknown', memo: '' },
  toll: { status: 'free', memo: '' },
  parking: { status: null, memo: '' },
  toilet: { status: 'yes', memo: '' },
  michiNoEki: { status: null, memo: '' },
  observatory: { status: 'no', memo: '' },
}

beforeEach(() => {
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: 'user-a' } }, error: null })
  mocks.state.listResult = { data: [driveRow], error: null }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('listDrives(roadId)', () => {
  it("reads the road's drives newest first (driven_on desc, then created_at desc)", async () => {
    await listDrives(ROAD_ID)

    expect(mocks.from).toHaveBeenCalledWith('drives')
    expect(mocks.builder.eq).toHaveBeenCalledWith('road_id', ROAD_ID)
    const orderCalls = mocks.builder.order.mock.calls
    expect(orderCalls[0]).toEqual(['driven_on', expect.objectContaining({ ascending: false })])
    expect(orderCalls[1]).toEqual(['created_at', expect.objectContaining({ ascending: false })])
  })

  it('maps rows to camelCase drives without user_id / visibility', async () => {
    const drives = await listDrives(ROAD_ID)
    expect(drives).toEqual([expectedDrive])
    expect(drives[0]).not.toHaveProperty('userId')
    expect(drives[0]).not.toHaveProperty('visibility')
  })

  it('does not select user_id / visibility at all', async () => {
    await listDrives(ROAD_ID)
    const selected = String(mocks.builder.select.mock.calls[0]?.[0] ?? '')
    expect(selected).not.toMatch(/user_id|visibility|\*/)
  })

  it('returns [] when there are no drives', async () => {
    mocks.state.listResult = { data: [], error: null }
    await expect(listDrives(ROAD_ID)).resolves.toEqual([])
  })

  it.each(['not-a-uuid', '', `${ROAD_ID}x`])('malformed id %j -> [] without querying', async (roadId) => {
    await expect(listDrives(roadId)).resolves.toEqual([])
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('signed out -> [] without querying', async () => {
    mocks.getClaims.mockResolvedValue({ data: null, error: null })
    await expect(listDrives(ROAD_ID)).resolves.toEqual([])
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('throws on a DB error (error.tsx)', async () => {
    mocks.state.listResult = { data: null, error: { code: 'XX000', message: 'boom' } }
    await expect(listDrives(ROAD_ID)).rejects.toThrow()
  })
})

describe('getDrive(roadId, driveId)', () => {
  it('filters by both the drive id and the road id (a drive of another road is a 404)', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { ...driveRow, road_info: roadInfoRow() }, error: null })
    await getDrive(ROAD_ID, DRIVE_ID)

    expect(mocks.from).toHaveBeenCalledWith('drives')
    expect(mocks.builder.eq).toHaveBeenCalledWith('id', DRIVE_ID)
    expect(mocks.builder.eq).toHaveBeenCalledWith('road_id', ROAD_ID)
    expect(String(mocks.builder.select.mock.calls[0]?.[0])).toContain('road_info')
  })

  it('returns the drive with its road info as camelCase', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { ...driveRow, road_info: roadInfoRow() }, error: null })
    await expect(getDrive(ROAD_ID, DRIVE_ID)).resolves.toEqual({
      ...expectedDrive,
      roadInfo: { confirmedOn: '2026-09-14', items: expectedRoadInfoItems },
    })
  })

  it('roadInfo is null when the drive has no road_info row (object or empty array form)', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { ...driveRow, road_info: null }, error: null })
    expect((await getDrive(ROAD_ID, DRIVE_ID))?.roadInfo).toBeNull()

    mocks.maybeSingle.mockResolvedValue({ data: { ...driveRow, road_info: [] }, error: null })
    expect((await getDrive(ROAD_ID, DRIVE_ID))?.roadInfo).toBeNull()
  })

  it('accepts the one-element array form of the embed too', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { ...driveRow, road_info: [roadInfoRow()] }, error: null })
    expect((await getDrive(ROAD_ID, DRIVE_ID))?.roadInfo?.items.toll).toEqual({ status: 'free', memo: '' })
  })

  it('null when RLS hides the drive or it belongs to another road', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    await expect(getDrive(ROAD_ID, DRIVE_ID)).resolves.toBeNull()
  })

  it.each([
    ['not-a-uuid', DRIVE_ID],
    [ROAD_ID, 'not-a-uuid'],
    ['', ''],
  ])('malformed ids (%j, %j) -> null without querying', async (roadId, driveId) => {
    await expect(getDrive(roadId, driveId)).resolves.toBeNull()
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('signed out -> null without querying', async () => {
    mocks.getClaims.mockResolvedValue({ data: null, error: null })
    await expect(getDrive(ROAD_ID, DRIVE_ID)).resolves.toBeNull()
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('throws on an unexpected DB error', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'boom' } })
    await expect(getDrive(ROAD_ID, DRIVE_ID)).rejects.toThrow()
  })
})

describe('getLatestRoadInfo(roadId)', () => {
  it("reads road_info joined to the road's drives", async () => {
    mocks.state.listResult = { data: [], error: null }
    await getLatestRoadInfo(ROAD_ID)

    expect(mocks.from).toHaveBeenCalledWith('road_info')
    expect(String(mocks.builder.select.mock.calls[0]?.[0])).toMatch(/drives!inner/)
    expect(mocks.builder.eq).toHaveBeenCalledWith('drives.road_id', ROAD_ID)
  })

  it('picks the newest value per item (by confirmed_on, then created_at), regardless of row order', async () => {
    mocks.state.listResult = {
      data: [
        roadInfoRow({ drive_id: DRIVE_ID, confirmed_on: '2026-05-01', motorcycle_ban: 'yes', toll: 'paid', toll_memo: '500円' }),
        roadInfoRow({
          drive_id: DRIVE_ID_2,
          confirmed_on: '2026-09-01',
          motorcycle_ban: 'no',
          motorcycle_ban_memo: '',
          toll: null,
          toll_memo: '',
          created_at: '2026-09-01T00:00:00+00:00',
        }),
      ],
      error: null,
    }

    const latest = await getLatestRoadInfo(ROAD_ID)

    expect(latest.motorcycleBan).toEqual({ status: 'no', memo: '', confirmedOn: '2026-09-01' })
    // The newer record skipped toll (記録しない), so the older value stays.
    expect(latest.toll).toEqual({ status: 'paid', memo: '500円', confirmedOn: '2026-05-01' })
    expect(latest.parking).toBeNull()
  })

  it('no rows -> every item null', async () => {
    mocks.state.listResult = { data: [], error: null }
    const latest = await getLatestRoadInfo(ROAD_ID)
    expect(Object.values(latest)).toHaveLength(8)
    expect(Object.values(latest).every((value) => value === null)).toBe(true)
  })

  it('malformed id / signed out -> every item null without querying', async () => {
    const malformed = await getLatestRoadInfo('nope')
    expect(Object.values(malformed).every((value) => value === null)).toBe(true)

    mocks.getClaims.mockResolvedValue({ data: null, error: null })
    const signedOut = await getLatestRoadInfo(ROAD_ID)
    expect(Object.values(signedOut).every((value) => value === null)).toBe(true)
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('throws on a DB error', async () => {
    mocks.state.listResult = { data: null, error: { code: 'XX000', message: 'boom' } }
    await expect(getLatestRoadInfo(ROAD_ID)).rejects.toThrow()
  })
})
