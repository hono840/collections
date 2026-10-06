// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// createDrive / updateDrive (architecture US-03 / US-04 / US-09 record edit; ch.3.2, 4, 7, 7.1, 8).
// Contract (src/features/drives/actions.ts, 'use server'):
//   createDrive(roadId: string, input: DriveInput): Promise<ActionResult<never>>
//   updateDrive(driveId: string, input: DriveInput): Promise<ActionResult<never>>
//   - getUserId() first; signed out -> 'unauthorized' without touching the DB
//   - malformed roadId / driveId -> 'not_found' ('ページが見つかりません', M-24) without touching the DB
//   - server re-validates with driveInputSchema; failure -> 'validation' + fieldErrors from toFieldErrors()
//     (keys like 'drivenOn', 'ratingOverall', 'roadInfo.items.toll.memo'), message '入力内容を確認してください'
//   - createDrive first reads roads (id) for roadId; no row (RLS hides other users' roads) -> 'not_found', no insert
//   - drives row: road_id (create only), driven_on, vehicle_type, weather, rating_overall, rating_scenery,
//     rating_road_surface, rating_ease_of_driving, traffic, memo. NEVER user_id / visibility / id.
//   - updateDrive never sends road_id (immutable; also blocked by column grant + trigger). The update
//     selects 'id, road_id' and redirects to that road. 0 rows (other user's / deleted drive) -> 'not_found'.
//   - road_info row (when input.roadInfo is non-null): confirmed_on = roadInfo.confirmedOn ?? drivenOn,
//     <item> / <item>_memo columns: motorcycle_ban, night_closure, winter_closure, toll, parking, toilet,
//     michi_no_eki, observatory (+ _memo). create: insert with drive_id. update: update ... eq('drive_id'),
//     and insert with drive_id when no row was updated (no upsert: the drive_id column has no UPDATE grant).
//     roadInfo null on update -> delete from road_info where drive_id = driveId. Never user_id.
//   - createDrive: when the road_info insert fails, the new drive is deleted again (no half-saved record)
//     and 'unexpected' with M-31 is returned.
//   - Postgres errors: 42501 / PGRST116 -> 'not_found'; 23514 'driven_on_in_future' -> 'validation' with
//     fieldErrors { drivenOn: ['未来の日付は選べません'] }; 23514 'confirmed_on_in_future' -> 'validation' with
//     fieldErrors { 'roadInfo.confirmedOn': ['未来の日付は選べません'] }; anything else -> 'unexpected' (M-31)
//   - success: revalidatePath('/roads') and `/roads/${roadId}`, then redirect(`/roads/${roadId}`) outside try

const ROAD_ID = '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b'
const DRIVE_ID = '0a0b0c0d-1e1f-4a2b-8c3d-4e5f6a7b8c9d'
const M31 = '保存できませんでした。もう一度お試しください。'
const M24 = 'ページが見つかりません'

type Result = { data: unknown; error: unknown }
type Call = { table: string; method: string; args: unknown[] }

const mocks = vi.hoisted(() => {
  const calls: Call[] = []
  // `${table}.${operation}` -> queued results (the last one repeats). operation = select | insert | update | delete
  const results = new Map<string, Result[]>()
  const WRITE_METHODS = ['insert', 'update', 'delete', 'upsert']

  function nextResult(key: string): Result {
    const queue = results.get(key)
    if (!queue || queue.length === 0) return { data: null, error: null }
    return queue.length > 1 ? queue.shift()! : queue[0]
  }

  function makeBuilder(table: string) {
    let operation = 'select'
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'match', 'in', 'order', 'limit']) {
      builder[method] = vi.fn((...args: unknown[]) => {
        calls.push({ table, method, args })
        if (WRITE_METHODS.includes(method)) operation = method
        return builder
      })
    }
    const resolve = () => Promise.resolve(nextResult(`${table}.${operation}`))
    builder.single = vi.fn(() => {
      calls.push({ table, method: 'single', args: [] })
      return resolve()
    })
    builder.maybeSingle = vi.fn(() => {
      calls.push({ table, method: 'maybeSingle', args: [] })
      return resolve()
    })
    builder.then = (onFulfilled: (value: Result) => unknown, onRejected: (reason: unknown) => unknown) =>
      resolve().then(onFulfilled, onRejected)
    return builder
  }

  const from = vi.fn((table: string) => makeBuilder(table))
  const getClaims = vi.fn()
  const redirect = vi.fn((path: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { digest: `NEXT_REDIRECT;replace;${path};307;` })
  })
  return { calls, results, from, getClaims, redirect, revalidatePath: vi.fn() }
})

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect, notFound: vi.fn() }))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ getAll: () => [], set: vi.fn() })) }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getClaims: mocks.getClaims }, from: mocks.from })),
}))

import { createDrive, updateDrive } from './actions'

function setResult(key: string, ...queue: Result[]) {
  mocks.results.set(key, queue)
}

function callsOf(table: string, method: string): Call[] {
  return mocks.calls.filter((call) => call.table === table && call.method === method)
}

function payloadOf(table: string, method: 'insert' | 'update'): Record<string, unknown> {
  const found = callsOf(table, method)
  expect(found, `${table}.${method} calls`).toHaveLength(1)
  const [payload] = found[0].args
  return (Array.isArray(payload) ? payload[0] : payload) as Record<string, unknown>
}

function eqArgs(table: string): unknown[][] {
  return callsOf(table, 'eq').map((call) => call.args)
}

const ALL_ITEMS_NONE = {
  motorcycleBan: { status: null, memo: '' },
  nightClosure: { status: null, memo: '' },
  winterClosure: { status: null, memo: '' },
  toll: { status: null, memo: '' },
  parking: { status: null, memo: '' },
  toilet: { status: null, memo: '' },
  michiNoEki: { status: null, memo: '' },
  observatory: { status: null, memo: '' },
}

const validInput = {
  drivenOn: '2026-09-14',
  vehicleType: 'motorcycle' as const,
  weather: 'sunny' as const,
  ratingOverall: 4,
  ratingScenery: 5,
  ratingRoadSurface: null,
  ratingEaseOfDriving: 3,
  traffic: 'few' as const,
  memo: '紅葉がきれいだった',
  roadInfo: null,
}

const roadInfoInput = {
  confirmedOn: null,
  items: {
    ...ALL_ITEMS_NONE,
    motorcycleBan: { status: 'yes' as const, memo: ' 土日のみ ' },
    toll: { status: 'free' as const, memo: '' },
    parking: { status: 'yes' as const, memo: '約20台' },
    toilet: { status: 'unknown' as const, memo: '' },
    observatory: { status: null, memo: '書いたけど記録しない' },
  },
}

const expectedDriveColumns = {
  driven_on: '2026-09-14',
  vehicle_type: 'motorcycle',
  weather: 'sunny',
  rating_overall: 4,
  rating_scenery: 5,
  rating_road_surface: null,
  rating_ease_of_driving: 3,
  traffic: 'few',
  memo: '紅葉がきれいだった',
}

const expectedRoadInfoColumns = {
  confirmed_on: '2026-09-14', // confirmedOn null -> the drive date
  motorcycle_ban: 'yes',
  motorcycle_ban_memo: '土日のみ',
  night_closure: null,
  night_closure_memo: '',
  winter_closure: null,
  winter_closure_memo: '',
  toll: 'free',
  toll_memo: '',
  parking: 'yes',
  parking_memo: '約20台',
  toilet: 'unknown',
  toilet_memo: '',
  michi_no_eki: null,
  michi_no_eki_memo: '',
  observatory: null,
  observatory_memo: '',
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-06T03:00:00Z')) // 2026-10-06 12:00 JST
  mocks.calls.length = 0
  mocks.results.clear()
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: 'user-a' } }, error: null })
  setResult('roads.select', { data: { id: ROAD_ID }, error: null })
  setResult('drives.insert', { data: { id: DRIVE_ID }, error: null })
  setResult('drives.update', { data: { id: DRIVE_ID, road_id: ROAD_ID }, error: null })
  setResult('drives.delete', { data: null, error: null })
  setResult('road_info.insert', { data: { drive_id: DRIVE_ID }, error: null })
  setResult('road_info.update', { data: { drive_id: DRIVE_ID }, error: null })
  setResult('road_info.delete', { data: null, error: null })
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('createDrive(roadId, input)', () => {
  it('checks the road is visible (own) before inserting', async () => {
    await expect(createDrive(ROAD_ID, validInput)).rejects.toThrow('NEXT_REDIRECT')
    expect(eqArgs('roads')).toContainEqual(['id', ROAD_ID])
    const roadLookup = mocks.calls.findIndex((call) => call.table === 'roads')
    const driveInsert = mocks.calls.findIndex((call) => call.table === 'drives' && call.method === 'insert')
    expect(roadLookup).toBeGreaterThanOrEqual(0)
    expect(roadLookup).toBeLessThan(driveInsert)
  })

  it('inserts exactly the drive columns + road_id and redirects to the road detail page', async () => {
    await expect(createDrive(ROAD_ID, validInput)).rejects.toThrow('NEXT_REDIRECT')

    expect(payloadOf('drives', 'insert')).toEqual({ road_id: ROAD_ID, ...expectedDriveColumns })
    expect(mocks.redirect).toHaveBeenCalledWith(`/roads/${ROAD_ID}`)
  })

  it('revalidates /roads and the road detail before redirecting', async () => {
    await expect(createDrive(ROAD_ID, validInput)).rejects.toThrow('NEXT_REDIRECT')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/roads')
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/roads/${ROAD_ID}`)
    const lastRevalidate = Math.max(...mocks.revalidatePath.mock.invocationCallOrder)
    expect(mocks.redirect.mock.invocationCallOrder[0]).toBeGreaterThan(lastRevalidate)
  })

  it('never sends user_id / visibility / id / speed-like keys, even if the client smuggles them in', async () => {
    const tampered = {
      ...validInput,
      user_id: 'user-b',
      visibility: 'public',
      id: DRIVE_ID,
      speed: 120,
      lapTime: 95,
    } as unknown as typeof validInput
    await expect(createDrive(ROAD_ID, tampered)).rejects.toThrow('NEXT_REDIRECT')
    expect(payloadOf('drives', 'insert')).toEqual({ road_id: ROAD_ID, ...expectedDriveColumns })
  })

  it('without road info, no road_info row is written', async () => {
    await expect(createDrive(ROAD_ID, validInput)).rejects.toThrow('NEXT_REDIRECT')
    expect(mocks.calls.some((call) => call.table === 'road_info')).toBe(false)
  })

  it('with road info, inserts one road_info row for the new drive (confirmed_on defaults to the drive date)', async () => {
    await expect(createDrive(ROAD_ID, { ...validInput, roadInfo: roadInfoInput })).rejects.toThrow('NEXT_REDIRECT')

    expect(payloadOf('road_info', 'insert')).toEqual({ drive_id: DRIVE_ID, ...expectedRoadInfoColumns })
  })

  it('an explicit 確認日 is stored as confirmed_on', async () => {
    const roadInfo = { ...roadInfoInput, confirmedOn: '2026-10-01' }
    await expect(createDrive(ROAD_ID, { ...validInput, roadInfo })).rejects.toThrow('NEXT_REDIRECT')
    expect(payloadOf('road_info', 'insert')).toMatchObject({ confirmed_on: '2026-10-01' })
  })

  it('road_info rows never carry user_id', async () => {
    await expect(createDrive(ROAD_ID, { ...validInput, roadInfo: roadInfoInput })).rejects.toThrow('NEXT_REDIRECT')
    expect(payloadOf('road_info', 'insert')).not.toHaveProperty('user_id')
  })

  it('if the road_info insert fails, deletes the new drive again and returns M-31 (no half-saved record)', async () => {
    setResult('road_info.insert', { data: null, error: { code: 'XX000', message: 'boom' } })

    const result = await createDrive(ROAD_ID, { ...validInput, roadInfo: roadInfoInput })

    expect(result).toEqual({ ok: false, error: { code: 'unexpected', message: M31 } })
    expect(callsOf('drives', 'delete')).toHaveLength(1)
    expect(eqArgs('drives')).toContainEqual(['id', DRIVE_ID])
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it("returns not_found (and inserts nothing) when the road is not visible (other user's road / deleted)", async () => {
    setResult('roads.select', { data: null, error: null })

    const result = await createDrive(ROAD_ID, validInput)

    expect(result).toEqual({ ok: false, error: { code: 'not_found', message: M24 } })
    expect(callsOf('drives', 'insert')).toHaveLength(0)
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('maps an RLS violation on insert (42501) to not_found', async () => {
    setResult('drives.insert', { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } })
    const result = await createDrive(ROAD_ID, validInput)
    expect(result).toMatchObject({ ok: false, error: { code: 'not_found' } })
  })

  it.each(['not-a-uuid', '', `${ROAD_ID}x`, '../roads'])('malformed roadId %j -> not_found without touching the DB', async (roadId) => {
    const result = await createDrive(roadId, validInput)
    expect(result).toMatchObject({ ok: false, error: { code: 'not_found' } })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('returns validation fieldErrors (server re-validates) and does not touch the DB', async () => {
    const result = await createDrive(ROAD_ID, {
      ...validInput,
      drivenOn: '2026-10-07',
      ratingOverall: null as unknown as number,
      memo: 'あ'.repeat(2001),
    })

    expect(mocks.from).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'validation',
        message: '入力内容を確認してください',
        fieldErrors: {
          drivenOn: ['未来の日付は選べません'],
          ratingOverall: ['総合評価を選んでください'],
          memo: ['2000文字以内で入力してください'],
        },
      },
    })
  })

  it.each([0, 6, 2.5, '4'])('rejects 総合 = %j sent directly to the server', async (ratingOverall) => {
    const result = await createDrive(ROAD_ID, { ...validInput, ratingOverall: ratingOverall as number })
    expect(result).toMatchObject({ ok: false, error: { code: 'validation' } })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('nested road info errors keep their dotted path', async () => {
    const roadInfo = {
      ...roadInfoInput,
      items: { ...roadInfoInput.items, toll: { status: 'paid' as const, memo: 'あ'.repeat(201) } },
    }
    const result = await createDrive(ROAD_ID, { ...validInput, roadInfo })
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'validation', fieldErrors: { 'roadInfo.items.toll.memo': ['200文字以内で入力してください'] } },
    })
  })

  it("maps the DB trigger's driven_on_in_future (JST day boundary) to the drivenOn field error", async () => {
    setResult('drives.insert', { data: null, error: { code: '23514', message: 'driven_on_in_future' } })
    const result = await createDrive(ROAD_ID, validInput)
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'validation', fieldErrors: { drivenOn: ['未来の日付は選べません'] } },
    })
  })

  it("maps confirmed_on_in_future to the roadInfo.confirmedOn field error", async () => {
    setResult('road_info.insert', { data: null, error: { code: '23514', message: 'confirmed_on_in_future' } })
    const result = await createDrive(ROAD_ID, { ...validInput, roadInfo: roadInfoInput })
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'validation', fieldErrors: { 'roadInfo.confirmedOn': ['未来の日付は選べません'] } },
    })
  })

  it('returns unexpected (M-31) for other DB errors', async () => {
    setResult('drives.insert', { data: null, error: { code: 'XX000', message: 'boom' } })
    await expect(createDrive(ROAD_ID, validInput)).resolves.toEqual({
      ok: false,
      error: { code: 'unexpected', message: M31 },
    })
  })

  it('returns unauthorized and does not touch the DB when signed out', async () => {
    mocks.getClaims.mockResolvedValue({ data: null, error: null })
    const result = await createDrive(ROAD_ID, validInput)
    expect(result).toMatchObject({ ok: false, error: { code: 'unauthorized' } })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('allows a second record for the same road and day (no uniqueness check in the app)', async () => {
    await expect(createDrive(ROAD_ID, validInput)).rejects.toThrow('NEXT_REDIRECT')
    await expect(createDrive(ROAD_ID, validInput)).rejects.toThrow('NEXT_REDIRECT')
    expect(callsOf('drives', 'insert')).toHaveLength(2)
  })
})

describe('updateDrive(driveId, input)', () => {
  it('updates exactly the editable columns of that drive and redirects to its road', async () => {
    await expect(updateDrive(DRIVE_ID, validInput)).rejects.toThrow('NEXT_REDIRECT')

    expect(payloadOf('drives', 'update')).toEqual(expectedDriveColumns)
    expect(eqArgs('drives')).toContainEqual(['id', DRIVE_ID])
    expect(mocks.redirect).toHaveBeenCalledWith(`/roads/${ROAD_ID}`)
  })

  it('never sends road_id (immutable), user_id or visibility, even when smuggled in', async () => {
    const tampered = {
      ...validInput,
      roadId: '11111111-2222-4333-8444-555555555555',
      road_id: '11111111-2222-4333-8444-555555555555',
      user_id: 'user-b',
      visibility: 'public',
    } as unknown as typeof validInput
    await expect(updateDrive(DRIVE_ID, tampered)).rejects.toThrow('NEXT_REDIRECT')

    const payload = payloadOf('drives', 'update')
    expect(payload).not.toHaveProperty('road_id')
    expect(payload).not.toHaveProperty('user_id')
    expect(payload).not.toHaveProperty('visibility')
    // The redirect target comes from the DB row, not from the client.
    expect(mocks.redirect).toHaveBeenCalledWith(`/roads/${ROAD_ID}`)
  })

  it('revalidates /roads and the road detail', async () => {
    await expect(updateDrive(DRIVE_ID, validInput)).rejects.toThrow('NEXT_REDIRECT')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/roads')
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/roads/${ROAD_ID}`)
  })

  it("returns not_found when no row is updated (other user's drive or deleted)", async () => {
    setResult('drives.update', { data: null, error: null })
    const result = await updateDrive(DRIVE_ID, validInput)
    expect(result).toEqual({ ok: false, error: { code: 'not_found', message: M24 } })
    expect(mocks.calls.some((call) => call.table === 'road_info')).toBe(false)
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it.each([
    { code: '42501', message: 'permission denied' },
    { code: 'PGRST116', message: 'no rows' },
  ])('maps $code to not_found', async (error) => {
    setResult('drives.update', { data: null, error })
    await expect(updateDrive(DRIVE_ID, validInput)).resolves.toMatchObject({ ok: false, error: { code: 'not_found' } })
  })

  it('updates the existing road_info row without touching drive_id', async () => {
    await expect(updateDrive(DRIVE_ID, { ...validInput, roadInfo: roadInfoInput })).rejects.toThrow('NEXT_REDIRECT')

    const payload = payloadOf('road_info', 'update')
    expect(payload).toEqual(expectedRoadInfoColumns)
    expect(eqArgs('road_info')).toContainEqual(['drive_id', DRIVE_ID])
    expect(callsOf('road_info', 'insert')).toHaveLength(0)
    expect(callsOf('road_info', 'upsert')).toHaveLength(0)
  })

  it('inserts a road_info row when the drive had none yet', async () => {
    setResult('road_info.update', { data: null, error: null })
    await expect(updateDrive(DRIVE_ID, { ...validInput, roadInfo: roadInfoInput })).rejects.toThrow('NEXT_REDIRECT')
    expect(payloadOf('road_info', 'insert')).toEqual({ drive_id: DRIVE_ID, ...expectedRoadInfoColumns })
  })

  it('roadInfo null removes the road_info row of that drive', async () => {
    await expect(updateDrive(DRIVE_ID, validInput)).rejects.toThrow('NEXT_REDIRECT')
    expect(callsOf('road_info', 'delete')).toHaveLength(1)
    expect(eqArgs('road_info')).toContainEqual(['drive_id', DRIVE_ID])
  })

  it('validation errors are returned without touching the DB', async () => {
    const result = await updateDrive(DRIVE_ID, { ...validInput, ratingOverall: null as unknown as number })
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'validation', fieldErrors: { ratingOverall: ['総合評価を選んでください'] } },
    })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('maps driven_on_in_future from the DB trigger to the drivenOn field error', async () => {
    setResult('drives.update', { data: null, error: { code: '23514', message: 'driven_on_in_future' } })
    await expect(updateDrive(DRIVE_ID, validInput)).resolves.toMatchObject({
      ok: false,
      error: { code: 'validation', fieldErrors: { drivenOn: ['未来の日付は選べません'] } },
    })
  })

  it('returns M-31 when saving the road info fails', async () => {
    setResult('road_info.update', { data: null, error: { code: 'XX000', message: 'boom' } })
    await expect(updateDrive(DRIVE_ID, { ...validInput, roadInfo: roadInfoInput })).resolves.toEqual({
      ok: false,
      error: { code: 'unexpected', message: M31 },
    })
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it.each(['not-a-uuid', '', `${DRIVE_ID}x`])('malformed driveId %j -> not_found without touching the DB', async (driveId) => {
    await expect(updateDrive(driveId, validInput)).resolves.toMatchObject({ ok: false, error: { code: 'not_found' } })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('returns unauthorized and does not touch the DB when signed out', async () => {
    mocks.getClaims.mockResolvedValue({ data: null, error: null })
    await expect(updateDrive(DRIVE_ID, validInput)).resolves.toMatchObject({ ok: false, error: { code: 'unauthorized' } })
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
