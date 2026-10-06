// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { buildCsp, createNonce } from './csp'

// S-5: nonce-based strict CSP (Next.js 16 guide "content-security-policy", Nonces).

const NONCE = 'bm9uY2UtZm9yLXRlc3Q='
const SUPABASE_URL = 'https://abcdefgh.supabase.co'
const GSI_ORIGIN = 'https://cyberjapandata.gsi.go.jp'

/** "a b; c d" -> Map { a => ['b'], c => ['d'] } */
function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy
      .split(';')
      .map((directive) => directive.trim())
      .filter(Boolean)
      .map((directive) => {
        const [name, ...values] = directive.split(/\s+/)
        return [name, values] as const
      }),
  )
}

describe('buildCsp({ nonce, isDev, supabaseUrl })', () => {
  const production = buildCsp({ nonce: NONCE, isDev: false, supabaseUrl: SUPABASE_URL })
  const development = buildCsp({ nonce: NONCE, isDev: true, supabaseUrl: 'http://127.0.0.1:54321' })

  it('returns a single-line header value', () => {
    expect(production).not.toMatch(/[\r\n]/)
    expect(production).not.toMatch(/\s{2,}/)
  })

  it("script-src is 'self' + the nonce + 'strict-dynamic' and never 'unsafe-inline'", () => {
    const scriptSrc = directives(production).get('script-src')
    expect(scriptSrc).toEqual(expect.arrayContaining(["'self'", `'nonce-${NONCE}'`, "'strict-dynamic'"]))
    expect(scriptSrc).not.toContain("'unsafe-inline'")
    expect(scriptSrc).not.toContain("'unsafe-eval'")
  })

  it("adds 'unsafe-eval' to script-src only in development (React dev tooling)", () => {
    const scriptSrc = directives(development).get('script-src')
    expect(scriptSrc).toContain("'unsafe-eval'")
    expect(scriptSrc).toContain(`'nonce-${NONCE}'`)
    expect(scriptSrc).not.toContain("'unsafe-inline'")
  })

  it('uses the given nonce verbatim', () => {
    const other = buildCsp({ nonce: 'b3RoZXI=', isDev: false, supabaseUrl: SUPABASE_URL })
    expect(other).toContain("'nonce-b3RoZXI='")
    expect(other).not.toContain(NONCE)
  })

  it('allows the Supabase origin (not the full URL) for connect-src and img-src, and GSI tiles for img-src', () => {
    const policy = directives(
      buildCsp({ nonce: NONCE, isDev: false, supabaseUrl: `${SUPABASE_URL}/rest/v1/` }),
    )
    expect(policy.get('connect-src')).toEqual(expect.arrayContaining(["'self'", SUPABASE_URL]))
    expect(policy.get('img-src')).toEqual(expect.arrayContaining(["'self'", 'blob:', 'data:', GSI_ORIGIN, SUPABASE_URL]))
    expect(policy.get('connect-src')).not.toContain(`${SUPABASE_URL}/rest/v1/`)
  })

  it('allows the local Supabase origin in development', () => {
    expect(directives(development).get('connect-src')).toContain('http://127.0.0.1:54321')
  })

  it('keeps the locked-down directives', () => {
    const policy = directives(production)
    expect(policy.get('default-src')).toEqual(["'self'"])
    expect(policy.get('object-src')).toEqual(["'none'"])
    expect(policy.get('base-uri')).toEqual(["'self'"])
    expect(policy.get('form-action')).toEqual(["'self'"])
    expect(policy.get('frame-ancestors')).toEqual(["'none'"])
    expect(policy.get('font-src')).toEqual(["'self'"])
    expect(policy.get('style-src')).toContain("'self'")
  })

  it('upgrades insecure requests only outside development (local Supabase is http)', () => {
    expect(directives(production).has('upgrade-insecure-requests')).toBe(true)
    expect(directives(development).has('upgrade-insecure-requests')).toBe(false)
  })
})

describe('createNonce()', () => {
  it('returns a base64 string', () => {
    const nonce = createNonce()
    expect(nonce).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
    expect(nonce.length).toBeGreaterThanOrEqual(16)
  })

  it('returns a different value every call', () => {
    const nonces = new Set(Array.from({ length: 20 }, () => createNonce()))
    expect(nonces.size).toBe(20)
  })
})
