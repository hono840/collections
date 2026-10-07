// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

// proxy.ts: Supabase session refresh + auth redirects (S-7) + per-request nonce CSP (S-5).

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> }
type CookieMethods = {
  getAll: () => { name: string; value: string }[]
  setAll: (cookies: CookieToSet[], headers: Record<string, string>) => void
}

const mocks = vi.hoisted(() => ({
  claims: null as { sub: string } | null,
  refreshedCookies: null as CookieToSet[] | null,
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: CookieMethods }) => ({
    auth: {
      getClaims: async () => {
        if (mocks.refreshedCookies) {
          options.cookies.setAll(mocks.refreshedCookies, { 'Cache-Control': 'private, no-cache, no-store' })
        }
        return { data: mocks.claims ? { claims: mocks.claims } : null, error: null }
      },
    },
  }),
}))

import { proxy } from './proxy'

function requestTo(path: string) {
  return new NextRequest(`http://127.0.0.1:3000${path}`)
}

function nonceOf(policy: string | null): string | undefined {
  return policy?.match(/'nonce-([A-Za-z0-9+/=]+)'/)?.[1]
}

function scriptSrcOf(policy: string | null): string[] {
  const directive = policy
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('script-src '))
  return directive ? directive.split(/\s+/).slice(1) : []
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
  mocks.claims = null
  mocks.refreshedCookies = null
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('proxy — nonce-based CSP (S-5)', () => {
  it("sets Content-Security-Policy with a nonce and 'strict-dynamic' and no 'unsafe-inline' in script-src", async () => {
    mocks.claims = { sub: 'user-1' }

    const response = await proxy(requestTo('/roads'))
    const policy = response.headers.get('content-security-policy')

    expect(policy).not.toBeNull()
    expect(nonceOf(policy)).toBeDefined()
    const scriptSrc = scriptSrcOf(policy)
    expect(scriptSrc).toContain("'strict-dynamic'")
    expect(scriptSrc).toContain(`'nonce-${nonceOf(policy)}'`)
    expect(scriptSrc).not.toContain("'unsafe-inline'")
  })

  it('uses a different nonce for every request', async () => {
    mocks.claims = { sub: 'user-1' }

    const first = await proxy(requestTo('/roads'))
    const second = await proxy(requestTo('/roads'))

    const firstNonce = nonceOf(first.headers.get('content-security-policy'))
    const secondNonce = nonceOf(second.headers.get('content-security-policy'))
    expect(firstNonce).toBeDefined()
    expect(secondNonce).toBeDefined()
    expect(firstNonce).not.toBe(secondNonce)
  })

  it('forwards the nonce as the x-nonce request header and the CSP as a request header (Next.js reads it while rendering)', async () => {
    mocks.claims = { sub: 'user-1' }

    const response = await proxy(requestTo('/roads'))
    const policy = response.headers.get('content-security-policy')

    // NextResponse.next({ request: { headers } }) encodes overridden request headers like this.
    expect(response.headers.get('x-middleware-request-x-nonce')).toBe(nonceOf(policy))
    expect(response.headers.get('x-middleware-request-content-security-policy')).toBe(policy)
  })

  it('keeps the CSP and x-nonce when Supabase refreshes the session cookies', async () => {
    mocks.claims = { sub: 'user-1' }
    mocks.refreshedCookies = [{ name: 'sb-access-token', value: 'fresh', options: { path: '/' } }]

    const response = await proxy(requestTo('/roads'))
    const policy = response.headers.get('content-security-policy')

    expect(response.cookies.get('sb-access-token')?.value).toBe('fresh')
    expect(nonceOf(policy)).toBeDefined()
    expect(response.headers.get('x-middleware-request-x-nonce')).toBe(nonceOf(policy))
  })

  it('sets the CSP on the public login page too', async () => {
    const response = await proxy(requestTo('/login'))

    expect(response.headers.get('location')).toBeNull()
    expect(nonceOf(response.headers.get('content-security-policy'))).toBeDefined()
  })
})

describe('proxy — public paths (S-7)', () => {
  it.each([
    '/login',
    '/login/',
    '/login/help',
    '/auth/confirm',
    '/auth/confirm?token_hash=abc&type=email',
    // ch.21: the PKCE magic link lands here before any session exists.
    '/auth/callback',
    '/auth/callback?code=abc',
  ])(
    'lets a signed-out request to %s through',
    async (path) => {
      const response = await proxy(requestTo(path))
      expect(response.headers.get('location')).toBeNull()
    },
  )

  it.each(['/loginfoo', '/login-admin', '/auth', '/authx', '/roads', '/'])(
    'redirects a signed-out request to %s to /login?next=…',
    async (path) => {
      const response = await proxy(requestTo(path))

      const location = response.headers.get('location')
      expect(location).not.toBeNull()
      const url = new URL(location!)
      expect(url.pathname).toBe('/login')
      expect(url.searchParams.get('next')).toBe(path)
    },
  )

  it('does not redirect a signed-in user away from /auth/callback (ch.21)', async () => {
    mocks.claims = { sub: 'user-1' }
    const response = await proxy(requestTo('/auth/callback?code=abc'))
    expect(response.headers.get('location')).toBeNull()
  })

  it('sends a signed-in user from /login to /roads', async () => {
    mocks.claims = { sub: 'user-1' }
    const response = await proxy(requestTo('/login'))
    expect(new URL(response.headers.get('location')!).pathname).toBe('/roads')
  })

  it('does not treat /loginfoo as the login page for a signed-in user', async () => {
    mocks.claims = { sub: 'user-1' }
    const response = await proxy(requestTo('/loginfoo'))
    expect(response.headers.get('location')).toBeNull()
  })
})
