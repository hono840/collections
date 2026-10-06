// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  // Chainable query builder: select().eq().maybeSingle()
  const builder: Record<string, ReturnType<typeof vi.fn>> = {}
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.maybeSingle = maybeSingle
  const from = vi.fn(() => builder)
  const getClaims = vi.fn()
  return { builder, maybeSingle, from, getClaims }
})

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ getAll: () => [], set: vi.fn() })) }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getClaims: mocks.getClaims }, from: mocks.from })),
}))

import { getUserSettings } from './queries'

beforeEach(() => {
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: 'user-a' } }, error: null })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getUserSettings()', () => {
  it('returns the acknowledged timestamp of the signed-in user', async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { safety_notice_acknowledged_at: '2026-10-07T03:00:00+00:00' },
      error: null,
    })

    const settings = await getUserSettings()

    expect(mocks.from).toHaveBeenCalledWith('user_settings')
    expect(mocks.builder.select).toHaveBeenCalledWith(
      expect.stringContaining('safety_notice_acknowledged_at'),
    )
    expect(mocks.builder.eq).toHaveBeenCalledWith('user_id', 'user-a')
    expect(settings).toEqual({ safetyNoticeAcknowledgedAt: '2026-10-07T03:00:00+00:00' })
  })

  it('treats a missing row as "not acknowledged yet"', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    await expect(getUserSettings()).resolves.toEqual({ safetyNoticeAcknowledgedAt: null })
  })

  it('returns null when signed out (without querying)', async () => {
    mocks.getClaims.mockResolvedValue({ data: null, error: null })

    await expect(getUserSettings()).resolves.toBeNull()
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('throws when the query fails (handled by error.tsx)', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'boom' } })
    await expect(getUserSettings()).rejects.toThrow()
  })
})
