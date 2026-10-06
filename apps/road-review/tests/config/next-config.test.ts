// @vitest-environment node
import { describe, expect, it } from 'vitest'
import nextConfig from '../../next.config'

// S-5: the CSP now comes from src/proxy.ts (per-request nonce). next.config.ts
// keeps only the static security headers.

async function headerKeysForAllRoutes(): Promise<Map<string, string>> {
  const rules = (await nextConfig.headers?.()) ?? []
  const allRoutes = rules.find((rule) => rule.source === '/(.*)')
  return new Map((allRoutes?.headers ?? []).map(({ key, value }) => [key.toLowerCase(), value]))
}

describe('next.config.ts headers (S-5)', () => {
  it('no longer sets Content-Security-Policy (proxy sets it with a nonce)', async () => {
    const rules = (await nextConfig.headers?.()) ?? []
    const keys = rules.flatMap((rule) => rule.headers.map(({ key }) => key.toLowerCase()))
    expect(keys).not.toContain('content-security-policy')
    expect(keys).not.toContain('content-security-policy-report-only')
  })

  it('keeps the other security headers', async () => {
    const headers = await headerKeysForAllRoutes()
    expect(headers.get('x-content-type-options')).toBe('nosniff')
    expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
    expect(headers.get('x-frame-options')).toBe('DENY')
    expect(headers.get('permissions-policy')).toContain('geolocation=()')
  })
})
