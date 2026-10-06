// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  class RedirectSignal extends Error {
    constructor(public readonly url: string) {
      super(`NEXT_REDIRECT:${url}`)
    }
  }
  const cookieJar = new Map<string, string>()
  const cookieStore = {
    get: vi.fn((name: string) =>
      cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined,
    ),
    getAll: vi.fn(() => [...cookieJar].map(([name, value]) => ({ name, value }))),
    set: vi.fn(),
    delete: vi.fn(),
  }
  return {
    RedirectSignal,
    cookieJar,
    cookieStore,
    verifyOtp: vi.fn(),
    redirect: vi.fn((url: string) => {
      throw new RedirectSignal(url)
    }),
  }
})

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => mocks.cookieStore) }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { verifyOtp: mocks.verifyOtp } })),
}))

import { GET } from './route'

function confirmRequest(query: string) {
  return new NextRequest(`http://127.0.0.1:3000/auth/confirm${query}`)
}

async function runAndCaptureRedirect(query: string): Promise<string> {
  try {
    await GET(confirmRequest(query))
  } catch (error) {
    if (error instanceof mocks.RedirectSignal) return error.url
    throw error
  }
  throw new Error('GET /auth/confirm must end with redirect()')
}

beforeEach(() => {
  mocks.cookieJar.clear()
  mocks.verifyOtp.mockResolvedValue({ data: { session: {} }, error: null })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /auth/confirm', () => {
  it('verifies token_hash with type "email" and redirects to rr_next', async () => {
    mocks.cookieJar.set('rr_next', '/roads/abc')

    const location = await runAndCaptureRedirect('?token_hash=hash-123&type=email')

    expect(mocks.verifyOtp).toHaveBeenCalledWith({ type: 'email', token_hash: 'hash-123' })
    expect(mocks.cookieStore.delete).toHaveBeenCalledWith('rr_next')
    expect(location).toBe('/roads/abc')
  })

  it('redirects to /roads when rr_next is missing', async () => {
    expect(await runAndCaptureRedirect('?token_hash=hash-123&type=email')).toBe('/roads')
  })

  it.each(['https://evil.example.com', '//evil.example.com', '/.//evil.example.com'])(
    'passes rr_next=%j through safeNextPath (falls back to /roads)',
    async (value) => {
      mocks.cookieJar.set('rr_next', value)
      expect(await runAndCaptureRedirect('?token_hash=hash-123&type=email')).toBe('/roads')
    },
  )

  it.each(['magiclink', 'signup', 'recovery', 'invite', 'email_change', ''])(
    'rejects type=%j without calling verifyOtp',
    async (type) => {
      const location = await runAndCaptureRedirect(`?token_hash=hash-123&type=${type}`)

      expect(mocks.verifyOtp).not.toHaveBeenCalled()
      expect(location).toBe('/login?error=link_invalid')
    },
  )

  it('rejects a request without token_hash', async () => {
    const location = await runAndCaptureRedirect('?type=email')
    expect(mocks.verifyOtp).not.toHaveBeenCalled()
    expect(location).toBe('/login?error=link_invalid')
  })

  it('does not accept the PKCE ?code= parameter', async () => {
    const location = await runAndCaptureRedirect('?code=abc')
    expect(mocks.verifyOtp).not.toHaveBeenCalled()
    expect(location).toBe('/login?error=link_invalid')
  })

  it('redirects to /login?error=link_invalid when the link is expired or used', async () => {
    mocks.cookieJar.set('rr_next', '/roads/abc')
    mocks.verifyOtp.mockResolvedValue({
      data: { session: null },
      error: Object.assign(new Error('Email link is invalid or has expired'), {
        status: 403,
        code: 'otp_expired',
      }),
    })

    const location = await runAndCaptureRedirect('?token_hash=used&type=email')

    expect(location).toBe('/login?error=link_invalid')
    expect(mocks.cookieStore.delete).not.toHaveBeenCalled()
  })
})
