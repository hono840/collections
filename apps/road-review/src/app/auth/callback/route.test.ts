// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ch.21: login uses Supabase's default Magic Link email + PKCE.
// GET /auth/callback?code=… exchanges the code for a session. The PKCE code_verifier
// only exists in the cookies of the browser that requested the link, so a GET
// exchange cannot be abused for login CSRF (the goal of 18.1 S-6 still holds).
//
// Contract:
//   - `export async function GET(request: NextRequest)` in src/app/auth/callback/route.ts
//   - reads/deletes rr_next through `cookies()` from next/headers
//   - success: delete rr_next, redirect to safeNextPath(rr_next) (default /roads)
//   - missing/empty code or exchange error: redirect to /login?error=link_invalid, keep rr_next
//   - redirect may be a returned NextResponse (Location header) or next/navigation redirect()

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
    has: vi.fn((name: string) => cookieJar.has(name)),
    set: vi.fn(),
    delete: vi.fn(),
  }
  const auth = {
    exchangeCodeForSession: vi.fn(),
    verifyOtp: vi.fn(),
  }
  return {
    RedirectSignal,
    cookieJar,
    cookieStore,
    auth,
    redirect: vi.fn((url: string) => {
      throw new RedirectSignal(url)
    }),
  }
})

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => mocks.cookieStore) }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: mocks.auth })),
}))

import { GET } from './route'

const ORIGIN = 'http://localhost:3000'
const LINK_INVALID_PATH = '/login?error=link_invalid'

function requestTo(pathWithQuery: string) {
  return new NextRequest(`${ORIGIN}${pathWithQuery}`)
}

/** Calls GET and returns the same-origin redirect target as "path?query". */
async function callbackRedirect(pathWithQuery: string): Promise<string> {
  let location: string | null
  try {
    const response = await GET(requestTo(pathWithQuery))
    expect(response.status).toBeGreaterThanOrEqual(300)
    expect(response.status).toBeLessThan(400)
    location = response.headers.get('location')
  } catch (error) {
    if (error instanceof mocks.RedirectSignal) location = error.url
    else throw error
  }
  expect(location).not.toBeNull()
  const target = new URL(location!, ORIGIN)
  // Never leaves the site, whatever the cookie says.
  expect(target.origin).toBe(ORIGIN)
  return `${target.pathname}${target.search}`
}

function authError(status: number, code: string, message = code) {
  return Object.assign(new Error(message), { name: 'AuthApiError', status, code })
}

beforeEach(() => {
  mocks.cookieJar.clear()
  mocks.auth.exchangeCodeForSession.mockResolvedValue({
    data: { session: { access_token: 'token' }, user: { id: 'user-1' } },
    error: null,
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /auth/callback (ch.21 PKCE magic link)', () => {
  it('exchanges ?code= for a session, deletes rr_next and redirects to it', async () => {
    mocks.cookieJar.set('rr_next', '/roads/abc?tab=1')

    const location = await callbackRedirect('/auth/callback?code=X')

    expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1)
    expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledWith('X')
    expect(mocks.cookieStore.delete).toHaveBeenCalledWith('rr_next')
    expect(location).toBe('/roads/abc?tab=1')
  })

  it('redirects to /roads when rr_next is missing', async () => {
    const location = await callbackRedirect('/auth/callback?code=X')
    expect(location).toBe('/roads')
  })

  it.each(['//evil.example.com', 'https://evil.example.com', '/\\evil.example.com', '/.//evil.example.com'])(
    'passes rr_next=%j through safeNextPath (falls back to /roads)',
    async (value) => {
      mocks.cookieJar.set('rr_next', value)
      expect(await callbackRedirect('/auth/callback?code=X')).toBe('/roads')
    },
  )

  it('redirects to /login?error=link_invalid and keeps rr_next when the exchange fails', async () => {
    mocks.cookieJar.set('rr_next', '/roads/abc')
    mocks.auth.exchangeCodeForSession.mockResolvedValue({
      data: { session: null, user: null },
      error: authError(400, 'flow_state_not_found', 'invalid flow state, no valid flow state found'),
    })

    const location = await callbackRedirect('/auth/callback?code=expired')

    expect(location).toBe(LINK_INVALID_PATH)
    expect(mocks.cookieStore.delete).not.toHaveBeenCalled()
  })

  it('treats a missing PKCE code_verifier (link opened in another browser) as link_invalid', async () => {
    mocks.cookieJar.set('rr_next', '/roads/abc')
    mocks.auth.exchangeCodeForSession.mockResolvedValue({
      data: { session: null, user: null },
      error: Object.assign(new Error('PKCE code verifier not found in storage.'), {
        name: 'AuthPKCECodeVerifierMissingError',
        status: 400,
        code: 'pkce_code_verifier_not_found',
      }),
    })

    expect(await callbackRedirect('/auth/callback?code=X')).toBe(LINK_INVALID_PATH)
    expect(mocks.cookieStore.delete).not.toHaveBeenCalled()
  })

  it.each(['/auth/callback', '/auth/callback?code=', '/auth/callback?error=access_denied&error_code=otp_expired'])(
    'redirects %s to /login?error=link_invalid without exchanging anything',
    async (path) => {
      mocks.cookieJar.set('rr_next', '/roads/abc')

      const location = await callbackRedirect(path)

      expect(location).toBe(LINK_INVALID_PATH)
      expect(mocks.auth.exchangeCodeForSession).not.toHaveBeenCalled()
      expect(mocks.cookieStore.delete).not.toHaveBeenCalled()
    },
  )

  it('does not accept ?token_hash= alone (that flow belongs to /auth/confirm, POST only)', async () => {
    const location = await callbackRedirect('/auth/callback?token_hash=hash-123&type=email')

    expect(location).toBe(LINK_INVALID_PATH)
    expect(mocks.auth.exchangeCodeForSession).not.toHaveBeenCalled()
    expect(mocks.auth.verifyOtp).not.toHaveBeenCalled()
  })

  it('ignores a ?next= query parameter (only the httpOnly rr_next cookie decides the target)', async () => {
    const location = await callbackRedirect('/auth/callback?code=X&next=/roads/other')
    expect(location).toBe('/roads')
  })
})
