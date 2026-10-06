// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---- mocks (hoisted so vi.mock factories can use them) ----
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
  const auth = {
    signInWithOtp: vi.fn(),
    verifyOtp: vi.fn(),
    signOut: vi.fn(),
    getClaims: vi.fn(),
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
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: mocks.auth })),
}))

import { requestMagicLink, signOut, verifyOtpCode } from './actions'

function formDataOf(entries: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(entries)) formData.set(key, value)
  return formData
}

function authError(status: number, code: string, message = code) {
  return Object.assign(new Error(message), { name: 'AuthApiError', status, code })
}

beforeEach(() => {
  mocks.cookieJar.clear()
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://road.example.com')
  vi.stubEnv('VERCEL_URL', '')
  mocks.auth.signInWithOtp.mockResolvedValue({ data: {}, error: null })
  mocks.auth.verifyOtp.mockResolvedValue({ data: { session: {} }, error: null })
  mocks.auth.signOut.mockResolvedValue({ error: null })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

describe('requestMagicLink (prevState, formData) — login form action', () => {
  it('sends the OTP email without creating users and redirecting back to the site origin', async () => {
    const result = await requestMagicLink(null, formDataOf({ email: 'hiro@example.com' }))

    expect(mocks.auth.signInWithOtp).toHaveBeenCalledTimes(1)
    expect(mocks.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'hiro@example.com',
      options: expect.objectContaining({
        shouldCreateUser: false,
        emailRedirectTo: 'https://road.example.com',
      }),
    })
    expect(result).toEqual({ ok: true, data: { email: 'hiro@example.com' } })
  })

  it('trims the email before sending', async () => {
    await requestMagicLink(null, formDataOf({ email: '  hiro@example.com ' }))
    expect(mocks.auth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'hiro@example.com' }),
    )
  })

  it('drops a trailing slash from NEXT_PUBLIC_SITE_URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://road.example.com/')
    await requestMagicLink(null, formDataOf({ email: 'hiro@example.com' }))
    expect(mocks.auth.signInWithOtp.mock.calls[0][0].options.emailRedirectTo).toBe(
      'https://road.example.com',
    )
  })

  it('falls back to https://${VERCEL_URL} on Preview when NEXT_PUBLIC_SITE_URL is empty', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    vi.stubEnv('VERCEL_URL', 'road-review-git-feat.vercel.app')
    await requestMagicLink(null, formDataOf({ email: 'hiro@example.com' }))
    expect(mocks.auth.signInWithOtp.mock.calls[0][0].options.emailRedirectTo).toBe(
      'https://road-review-git-feat.vercel.app',
    )
  })

  it('rejects an invalid email with a validation error and does not send mail', async () => {
    const result = await requestMagicLink(null, formDataOf({ email: 'not-an-email' }))

    expect(mocks.auth.signInWithOtp).not.toHaveBeenCalled()
    expect(mocks.cookieStore.set).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'validation',
        fieldErrors: { email: ['メールアドレスの形式が正しくありません'] },
      },
    })
  })

  it('stores safeNextPath(next) in a 10-minute httpOnly rr_next cookie', async () => {
    await requestMagicLink(null, formDataOf({ email: 'hiro@example.com', next: '/roads/abc?tab=1' }))

    expect(mocks.cookieStore.set).toHaveBeenCalledWith(
      'rr_next',
      '/roads/abc?tab=1',
      expect.objectContaining({ httpOnly: true, maxAge: 600, path: '/', sameSite: 'lax' }),
    )
  })

  it.each(['https://evil.example', '//evil.example', '/\\evil.example'])(
    'replaces an unsafe next %j with /roads in the cookie',
    async (next) => {
      await requestMagicLink(null, formDataOf({ email: 'hiro@example.com', next }))
      expect(mocks.cookieStore.set).toHaveBeenCalledWith('rr_next', '/roads', expect.anything())
    },
  )

  it('uses /roads in the cookie when next is missing', async () => {
    await requestMagicLink(null, formDataOf({ email: 'hiro@example.com' }))
    expect(mocks.cookieStore.set).toHaveBeenCalledWith('rr_next', '/roads', expect.anything())
  })

  it.each([
    ['otp_disabled', 422, 'Signups not allowed for otp'],
    ['user_not_found', 400, 'User not found'],
    ['signup_disabled', 422, 'Signups not allowed for this instance'],
  ])(
    'returns the same success result for an unknown user (%s) — no account enumeration',
    async (code, status, message) => {
      mocks.auth.signInWithOtp.mockResolvedValue({ data: {}, error: authError(status, code, message) })

      const result = await requestMagicLink(null, formDataOf({ email: 'stranger@example.com' }))

      expect(result).toEqual({ ok: true, data: { email: 'stranger@example.com' } })
    },
  )

  it.each([
    [429, 'over_email_send_rate_limit'],
    [429, 'over_request_rate_limit'],
    [429, 'unknown_429_code'],
  ])('maps a rate-limit error (%i %s) to rate_limited with the M-30 message', async (status, code) => {
    mocks.auth.signInWithOtp.mockResolvedValue({ data: {}, error: authError(status, code) })

    const result = await requestMagicLink(null, formDataOf({ email: 'hiro@example.com' }))

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'rate_limited', message: '時間をおいてもう一度お試しください' },
    })
  })

  it('maps any other send error to unexpected with the same M-30 message', async () => {
    mocks.auth.signInWithOtp.mockResolvedValue({ data: {}, error: authError(500, 'unexpected_failure') })

    const result = await requestMagicLink(null, formDataOf({ email: 'hiro@example.com' }))

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'unexpected', message: '時間をおいてもう一度お試しください' },
    })
  })
})

describe('verifyOtpCode (prevState, formData) — 6-digit code form action', () => {
  it('verifies the code with type "email" and redirects to the safe next path from rr_next', async () => {
    mocks.cookieJar.set('rr_next', '/roads/abc')

    await expect(
      verifyOtpCode(null, formDataOf({ email: 'hiro@example.com', token: '123456' })),
    ).rejects.toBeInstanceOf(mocks.RedirectSignal)

    expect(mocks.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'hiro@example.com',
      token: '123456',
      type: 'email',
    })
    expect(mocks.cookieStore.delete).toHaveBeenCalledWith('rr_next')
    expect(mocks.redirect).toHaveBeenCalledWith('/roads/abc')
  })

  it('redirects to /roads when rr_next is missing', async () => {
    await expect(
      verifyOtpCode(null, formDataOf({ email: 'hiro@example.com', token: '123456' })),
    ).rejects.toBeInstanceOf(mocks.RedirectSignal)
    expect(mocks.redirect).toHaveBeenCalledWith('/roads')
  })

  it('re-checks rr_next with safeNextPath (a tampered cookie cannot open-redirect)', async () => {
    mocks.cookieJar.set('rr_next', '//evil.example.com')

    await expect(
      verifyOtpCode(null, formDataOf({ email: 'hiro@example.com', token: '123456' })),
    ).rejects.toBeInstanceOf(mocks.RedirectSignal)
    expect(mocks.redirect).toHaveBeenCalledWith('/roads')
  })

  it.each(['12345', '1234567', '12a456', ''])(
    'rejects a malformed code %j without calling Supabase',
    async (token) => {
      const result = await verifyOtpCode(null, formDataOf({ email: 'hiro@example.com', token }))

      expect(mocks.auth.verifyOtp).not.toHaveBeenCalled()
      expect(mocks.redirect).not.toHaveBeenCalled()
      expect(result).toMatchObject({
        ok: false,
        error: { code: 'validation', fieldErrors: { token: ['6桁の数字を入力してください'] } },
      })
    },
  )

  it('returns a validation error (no redirect) when Supabase says the code is wrong or expired', async () => {
    mocks.auth.verifyOtp.mockResolvedValue({
      data: { session: null },
      error: authError(403, 'otp_expired', 'Token has expired or is invalid'),
    })

    const result = await verifyOtpCode(null, formDataOf({ email: 'hiro@example.com', token: '654321' }))

    expect(mocks.redirect).not.toHaveBeenCalled()
    expect(mocks.cookieStore.delete).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'validation',
        message: 'コードが正しくないか、有効期限が切れています。もう一度お試しください。',
      },
    })
  })

  it('maps a 429 from verifyOtp to rate_limited', async () => {
    mocks.auth.verifyOtp.mockResolvedValue({
      data: { session: null },
      error: authError(429, 'over_request_rate_limit'),
    })

    const result = await verifyOtpCode(null, formDataOf({ email: 'hiro@example.com', token: '654321' }))

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'rate_limited', message: '時間をおいてもう一度お試しください' },
    })
  })
})

describe('signOut', () => {
  it('signs out and redirects to /login', async () => {
    await expect(signOut()).rejects.toBeInstanceOf(mocks.RedirectSignal)

    expect(mocks.auth.signOut).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/login')
  })
})
