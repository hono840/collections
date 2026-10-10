// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// vercel.json is the single source of response headers and redirects (static export has no server).
// ADR road-review-adr-static-export §3.3, §5.1, §6 / ARCH v3 §6.

type Header = { key: string; value: string }
const vercelConfig = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))
const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
const nodeVersion = readFileSync(new URL('../../.node-version', import.meta.url), 'utf8').trim()

const allHeaders: Header[] = vercelConfig.headers.flatMap((rule: { headers: Header[] }) => rule.headers)
const headerValue = (key: string) => allHeaders.find((header) => header.key === key)?.value ?? ''
const cspDirectives = headerValue('Content-Security-Policy')
  .split(';')
  .map((directive) => directive.trim())

describe('vercel.json (deploy out/ as plain static files)', () => {
  it('bypasses the Next.js builder and serves the post-processed out/', () => {
    expect(vercelConfig.framework).toBeNull()
    expect(vercelConfig.buildCommand).toBe('pnpm build')
    expect(vercelConfig.outputDirectory).toBe('out')
  })

  it('installs from the lockfile without lifecycle scripts (same as CI)', () => {
    expect(vercelConfig.installCommand).toBe('pnpm install --frozen-lockfile --ignore-scripts')
  })

  it('uses trailing slashes like next.config (never false: it would 308 /x/ -> /x)', () => {
    expect(vercelConfig.trailingSlash).toBe(true)
  })

  it('redirects the v1 list /roads/ to /favorites/ (temporary)', () => {
    expect(vercelConfig.redirects).toContainEqual({ source: '/roads/', destination: '/favorites/', permanent: false })
  })

  it('only uses redirect sources with a trailing slash (trailingSlash runs first and would shadow them)', () => {
    for (const redirect of vercelConfig.redirects) expect(redirect.source).toMatch(/\/$/)
  })

  it('applies the security headers to every path', () => {
    expect(vercelConfig.headers).toHaveLength(1)
    expect(vercelConfig.headers[0].source).toBe('/(.*)')
    expect(headerValue('Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains')
    expect(headerValue('X-Content-Type-Options')).toBe('nosniff')
    expect(headerValue('X-Frame-Options')).toBe('DENY')
    expect(headerValue('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(headerValue('Cross-Origin-Opener-Policy')).toBe('same-origin')
    expect(headerValue('Permissions-Policy')).toBe('geolocation=(), camera=(), microphone=(), payment=()')
  })

  it('keeps the header CSP to the agreed directives', () => {
    expect(cspDirectives).toEqual([
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://cyberjapandata.gsi.go.jp",
      "font-src 'self'",
      "connect-src 'self'",
      "worker-src 'self'",
      "manifest-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ])
  })
})

describe('package.json scripts and engines', () => {
  it('runs the CSP post-processing inside build (postbuild is skipped by --ignore-scripts)', () => {
    expect(packageJson.scripts.build).toBe(
      'next build && node scripts/csp/inject-meta-csp.mjs out && node scripts/csp/verify-out.mjs out',
    )
    expect(packageJson.scripts.prebuild).toBeUndefined()
    expect(packageJson.scripts.postbuild).toBeUndefined()
  })

  it('serves the static out/ with the vercel.json emulation on start', () => {
    expect(packageJson.scripts.start).toMatch(/^node scripts\/serve-static\.mjs out\b/)
  })

  it('writes a JSON test report for the CI skip check', () => {
    expect(packageJson.scripts['test:ci']).toContain('--reporter=json')
    expect(packageJson.scripts['test:ci']).toContain('--outputFile.json=reports/vitest.json')
  })

  it('pins the Node major to .node-version (Vercel auto-upgrades on ">=")', () => {
    const major = nodeVersion.split('.')[0]
    expect(packageJson.engines.node).toBe(`${major}.x`)
  })
})
