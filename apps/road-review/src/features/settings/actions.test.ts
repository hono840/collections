// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const upsert = vi.fn()
  const from = vi.fn(() => ({ upsert }))
  const getClaims = vi.fn()
  return { upsert, from, getClaims, revalidatePath: vi.fn() }
})

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ getAll: () => [], set: vi.fn() })) }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getClaims: mocks.getClaims }, from: mocks.from })),
}))

import { acknowledgeSafetyNotice } from './actions'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-07T03:00:00.000Z'))
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: 'user-a' } }, error: null })
  mocks.upsert.mockResolvedValue({ data: null, error: null })
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('acknowledgeSafetyNotice()', () => {
  it('upserts safety_notice_acknowledged_at (now) into user_settings on user_id', async () => {
    const result = await acknowledgeSafetyNotice()

    expect(mocks.from).toHaveBeenCalledWith('user_settings')
    expect(mocks.upsert).toHaveBeenCalledTimes(1)
    const [payload, options] = mocks.upsert.mock.calls[0]
    expect(payload).toMatchObject({ safety_notice_acknowledged_at: '2026-10-07T03:00:00.000Z' })
    expect(options).toMatchObject({ onConflict: 'user_id' })
    expect(result).toEqual({ ok: true, data: undefined })
  })

  it('never writes a user_id other than the signed-in user', async () => {
    await acknowledgeSafetyNotice()
    const [payload] = mocks.upsert.mock.calls[0]
    if ('user_id' in payload) expect(payload.user_id).toBe('user-a')
  })

  it('revalidates the whole layout so the dialog disappears everywhere', async () => {
    await acknowledgeSafetyNotice()
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('returns unauthorized and does not touch the DB when signed out', async () => {
    mocks.getClaims.mockResolvedValue({ data: null, error: null })

    const result = await acknowledgeSafetyNotice()

    expect(mocks.from).not.toHaveBeenCalled()
    expect(result).toMatchObject({ ok: false, error: { code: 'unauthorized' } })
  })

  it('returns the M-31 message when saving fails (dialog stays open)', async () => {
    mocks.upsert.mockResolvedValue({ data: null, error: { code: '42501', message: 'rls' } })

    const result = await acknowledgeSafetyNotice()

    expect(mocks.revalidatePath).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'unexpected', message: '保存できませんでした。もう一度お試しください。' },
    })
  })
})
