// @vitest-environment node
import { describe, expect, it } from 'vitest'
import nextConfig from '../../next.config'

// Static export (ARCH v2 3 / ADR static export). Headers / redirects live in vercel.json
// (see vercel-config.test.ts); framework:null ignores next.config, so both must agree on trailingSlash.

describe('next.config.ts (static export)', () => {
  it('exports static files to out/', () => {
    expect(nextConfig.output).toBe('export')
  })

  it('uses trailing slashes so /road/ maps to out/road/index.html', () => {
    expect(nextConfig.trailingSlash).toBe(true)
  })

  it('does not use the server-side image optimizer', () => {
    expect(nextConfig.images?.unoptimized).toBe(true)
  })

  it('does not define server-only features (headers / redirects / rewrites)', () => {
    expect(nextConfig.headers).toBeUndefined()
    expect(nextConfig.redirects).toBeUndefined()
    expect(nextConfig.rewrites).toBeUndefined()
  })
})
