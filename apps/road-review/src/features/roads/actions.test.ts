// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// createRoad / updateRoad (US-02, US-09 road edit; architecture 7, 7.1, 7.2, 8).
// Contract:
//   createRoad(input: RoadInput): Promise<ActionResult<never>>   (success -> redirect('/roads/<id>'))
//   updateRoad(roadId: string, input: RoadInput): Promise<ActionResult<never>>
//   - same zod schema as the client (roadInputSchema); errors -> code 'validation' + fieldErrors
//   - getUserId() first; signed out -> 'unauthorized' without touching the DB
//   - never sends user_id / visibility (DB default auth.uid() + RLS decide ownership)
//   - revalidatePath('/roads') and `/roads/${id}`, then redirect outside try
//   - D-3 (architecture ch.19.1): the BEFORE INSERT trigger raises 'road_limit_exceeded' (SQLSTATE P0001)
//     when the user already has 500 roads -> { ok: false, error: { code: 'limit_exceeded',
//     message: '登録できる道は500件までです' } } (new ActionErrorCode 'limit_exceeded')

const ROAD_ID = '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b'
const OTHER_ROAD_ID = '11111111-2222-4333-8444-555555555555'

const mocks = vi.hoisted(() => {
  const single = vi.fn()
  const maybeSingle = vi.fn()
  const builder: Record<string, ReturnType<typeof vi.fn>> = {}
  for (const method of ['insert', 'update', 'select', 'eq', 'match']) {
    builder[method] = vi.fn(() => builder)
  }
  builder.single = single
  builder.maybeSingle = maybeSingle
  const from = vi.fn(() => builder)
  const getClaims = vi.fn()
  const redirect = vi.fn((path: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { digest: `NEXT_REDIRECT;replace;${path};307;` })
  })
  return { builder, single, maybeSingle, from, getClaims, redirect, revalidatePath: vi.fn() }
})

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect, notFound: vi.fn() }))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ getAll: () => [], set: vi.fn() })) }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getClaims: mocks.getClaims }, from: mocks.from })),
}))

import { createRoad, updateRoad } from './actions'

const validInput = {
  name: '  碓氷峠  ',
  prefectureCode: 10,
  roadType: 'pass' as const,
  start: { lat: 36.3512345678, lng: 138.7 },
  end: { lat: 36.4, lng: 138.65 },
}

const expectedRow = {
  name: '碓氷峠',
  prefecture_code: 10,
  road_type: 'pass',
  start_lat: 36.351235,
  start_lng: 138.7,
  end_lat: 36.4,
  end_lng: 138.65,
}

function singleWriteResult() {
  // Implementations may finish with .single() or .maybeSingle(); both return the row.
  mocks.single.mockResolvedValue({ data: { id: ROAD_ID }, error: null })
  mocks.maybeSingle.mockResolvedValue({ data: { id: ROAD_ID }, error: null })
}

function writtenPayload(method: 'insert' | 'update') {
  expect(mocks.builder[method]).toHaveBeenCalledTimes(1)
  const [payload] = mocks.builder[method].mock.calls[0]
  return (Array.isArray(payload) ? payload[0] : payload) as Record<string, unknown>
}

beforeEach(() => {
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: 'user-a' } }, error: null })
  singleWriteResult()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('createRoad()', () => {
  it('inserts the validated row into roads and redirects to the new detail page', async () => {
    await expect(createRoad(validInput)).rejects.toThrow('NEXT_REDIRECT')

    expect(mocks.from).toHaveBeenCalledWith('roads')
    expect(writtenPayload('insert')).toEqual(expectedRow)
    expect(mocks.redirect).toHaveBeenCalledWith(`/roads/${ROAD_ID}`)
  })

  it('revalidates the list and the new detail page before redirecting', async () => {
    await expect(createRoad(validInput)).rejects.toThrow('NEXT_REDIRECT')

    expect(mocks.revalidatePath).toHaveBeenCalledWith('/roads')
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/roads/${ROAD_ID}`)
    const lastRevalidate = Math.max(...mocks.revalidatePath.mock.invocationCallOrder)
    expect(mocks.redirect.mock.invocationCallOrder[0]).toBeGreaterThan(lastRevalidate)
  })

  it('stores a missing end pin as end_lat/end_lng = null', async () => {
    await expect(createRoad({ ...validInput, end: null })).rejects.toThrow('NEXT_REDIRECT')
    expect(writtenPayload('insert')).toMatchObject({ end_lat: null, end_lng: null })
  })

  it('never sends user_id or visibility, even if the client smuggles them in', async () => {
    const tampered = { ...validInput, user_id: 'user-b', visibility: 'public' } as typeof validInput
    await expect(createRoad(tampered)).rejects.toThrow('NEXT_REDIRECT')

    const payload = writtenPayload('insert')
    expect(payload).not.toHaveProperty('user_id')
    expect(payload).not.toHaveProperty('visibility')
  })

  it('returns validation fieldErrors (server re-validates) and does not touch the DB', async () => {
    const result = await createRoad({
      name: '道'.repeat(51),
      prefectureCode: null as unknown as number,
      roadType: 'other',
      start: null,
      end: null,
    })

    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.redirect).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'validation',
        fieldErrors: {
          name: ['50文字以内で入力してください'],
          prefectureCode: ['都道府県を選んでください'],
          start: ['地図を動かして開始地点のピンを置いてください'],
        },
      },
    })
  })

  it('rejects an unknown road_type sent directly to the server', async () => {
    const result = await createRoad({ ...validInput, roadType: 'forest_road' as 'forest' })
    expect(mocks.from).not.toHaveBeenCalled()
    expect(result).toMatchObject({ ok: false, error: { code: 'validation' } })
  })

  it('returns unauthorized and does not touch the DB when signed out', async () => {
    mocks.getClaims.mockResolvedValue({ data: null, error: null })

    const result = await createRoad(validInput)

    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.redirect).not.toHaveBeenCalled()
    expect(result).toMatchObject({ ok: false, error: { code: 'unauthorized' } })
  })

  it('returns the M-31 message when the insert fails (no redirect, no revalidate)', async () => {
    mocks.single.mockResolvedValue({ data: null, error: { code: '23514', message: 'check' } })
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { code: '23514', message: 'check' } })

    const result = await createRoad(validInput)

    expect(mocks.redirect).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'unexpected', message: '保存できませんでした。もう一度お試しください。' },
    })
  })
})

describe('createRoad() road limit (D-3)', () => {
  it('maps the road_limit_exceeded DB error to limit_exceeded with the 500-roads message', async () => {
    const limitError = { code: 'P0001', message: 'road_limit_exceeded', details: null, hint: null }
    mocks.single.mockResolvedValue({ data: null, error: limitError })
    mocks.maybeSingle.mockResolvedValue({ data: null, error: limitError })

    const result = await createRoad(validInput)

    expect(mocks.redirect).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
    expect(result).toEqual({
      ok: false,
      error: { code: 'limit_exceeded', message: '登録できる道は500件までです' },
    })
  })

  it('other P0001 errors stay "unexpected" (only road_limit_exceeded is the limit)', async () => {
    const otherError = { code: 'P0001', message: 'something_else', details: null, hint: null }
    mocks.single.mockResolvedValue({ data: null, error: otherError })
    mocks.maybeSingle.mockResolvedValue({ data: null, error: otherError })

    const result = await createRoad(validInput)

    expect(result).toMatchObject({ ok: false, error: { code: 'unexpected' } })
  })
})

describe('updateRoad()', () => {
  it('updates the road by id with the validated row and redirects to its detail page', async () => {
    await expect(updateRoad(ROAD_ID, validInput)).rejects.toThrow('NEXT_REDIRECT')

    expect(mocks.from).toHaveBeenCalledWith('roads')
    expect(writtenPayload('update')).toEqual(expectedRow)
    expect(mocks.builder.eq).toHaveBeenCalledWith('id', ROAD_ID)
    expect(mocks.redirect).toHaveBeenCalledWith(`/roads/${ROAD_ID}`)
  })

  it('revalidates /roads and /roads/<id>', async () => {
    await expect(updateRoad(ROAD_ID, validInput)).rejects.toThrow('NEXT_REDIRECT')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/roads')
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/roads/${ROAD_ID}`)
  })

  it('can clear the end pin (end: null -> end_lat/end_lng null)', async () => {
    await expect(updateRoad(ROAD_ID, { ...validInput, end: null })).rejects.toThrow('NEXT_REDIRECT')
    expect(writtenPayload('update')).toMatchObject({ end_lat: null, end_lng: null })
  })

  it('never sends user_id (cannot hand the road to someone else)', async () => {
    const tampered = { ...validInput, user_id: 'user-b' } as typeof validInput
    await expect(updateRoad(ROAD_ID, tampered)).rejects.toThrow('NEXT_REDIRECT')
    expect(writtenPayload('update')).not.toHaveProperty('user_id')
  })

  it("returns not_found when RLS hides the row (other user's road / deleted): 0 rows updated", async () => {
    mocks.single.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: '0 rows' } })
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })

    const result = await updateRoad(OTHER_ROAD_ID, validInput)

    expect(mocks.redirect).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
    expect(result).toMatchObject({ ok: false, error: { code: 'not_found' } })
  })

  it('returns not_found for a malformed id without touching the DB', async () => {
    const result = await updateRoad('not-a-uuid', validInput)
    expect(mocks.from).not.toHaveBeenCalled()
    expect(result).toMatchObject({ ok: false, error: { code: 'not_found' } })
  })

  it('returns validation fieldErrors with the same rules as create', async () => {
    const result = await updateRoad(ROAD_ID, { ...validInput, name: '   ' })
    expect(mocks.from).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'validation', fieldErrors: { name: ['道の名前を入力してください'] } },
    })
  })

  it('returns unauthorized when signed out', async () => {
    mocks.getClaims.mockResolvedValue({ data: null, error: { message: 'no session' } })
    const result = await updateRoad(ROAD_ID, validInput)
    expect(mocks.from).not.toHaveBeenCalled()
    expect(result).toMatchObject({ ok: false, error: { code: 'unauthorized' } })
  })

  it('returns the M-31 message on an unexpected DB error', async () => {
    mocks.single.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'boom' } })
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'boom' } })

    const result = await updateRoad(ROAD_ID, validInput)

    expect(mocks.redirect).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'unexpected', message: '保存できませんでした。もう一度お試しください。' },
    })
  })
})
