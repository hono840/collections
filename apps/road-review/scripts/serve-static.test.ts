// @vitest-environment node
import { readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { request as httpRequest, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createStaticServer, planRoute, responseHeaders } from './serve-static.mjs'
import { makeOutputDirectory } from './csp/test-fixtures'

const vercelConfig = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))

describe('planRoute (same order as Vercel: trailingSlash first, then redirects)', () => {
  it.each([
    ['/roads', '', { status: 308, location: '/roads/' }],
    ['/roads/', '', { status: 307, location: '/favorites/' }],
    ['/favorites', '?sort=new', { status: 308, location: '/favorites/?sort=new' }],
    ['/road/view', '', { status: 308, location: '/road/view/' }],
    ['/manifest.webmanifest/', '', { status: 308, location: '/manifest.webmanifest' }],
  ])('%s%s redirects', (pathname, search, expected) => {
    expect(planRoute(pathname, search, vercelConfig)).toEqual({ kind: 'redirect', ...expected })
  })

  it.each(['/', '/favorites/', '/_next/static/chunks/main.js', '/index.txt', '/.well-known/security.txt'])(
    '%s is served as a file',
    (pathname) => {
      expect(planRoute(pathname, '', vercelConfig)).toEqual({ kind: 'file' })
    },
  )

  it('rejects source patterns it cannot emulate', () => {
    const config = { redirects: [{ source: '/old/:slug/', destination: '/', permanent: false }] }
    expect(() => planRoute('/old/x/', '', config)).toThrow(/unsupported source pattern/)
  })
})

describe('responseHeaders', () => {
  it('applies vercel.json headers but drops upgrade-insecure-requests for local http', () => {
    const headers = responseHeaders('/', vercelConfig, { localHttp: true })
    const csp = headers.find((header: { key: string }) => header.key === 'Content-Security-Policy')?.value
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).not.toContain('upgrade-insecure-requests')
    expect(headers.map((header: { key: string }) => header.key)).toContain('Strict-Transport-Security')
  })

  it('keeps every directive when not serving local http', () => {
    const headers = responseHeaders('/', vercelConfig, { localHttp: false })
    const csp = headers.find((header: { key: string }) => header.key === 'Content-Security-Policy')?.value
    expect(csp).toContain('upgrade-insecure-requests')
  })
})

describe('createStaticServer', () => {
  let server: Server
  let baseUrl: string
  let workDirectory: string

  beforeAll(async () => {
    workDirectory = await makeOutputDirectory({
      'out/index.html': '<!DOCTYPE html><title>home</title>',
      'out/favorites/index.html': '<!DOCTYPE html><title>favorites</title>',
      'out/404.html': '<!DOCTYPE html><title>not found</title>',
      'out/_next/static/chunks/main.js': 'console.log(1)',
      'secret.txt': 'outside the served directory',
    })
    server = createStaticServer({ rootDirectory: path.join(workDirectory, 'out'), vercelConfig })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve))
    await rm(workDirectory, { recursive: true, force: true })
  })

  it('/roads -> 308 /roads/ -> 307 /favorites/ -> 200', async () => {
    const first = await fetch(`${baseUrl}/roads`, { redirect: 'manual' })
    expect(first.status).toBe(308)
    expect(first.headers.get('location')).toBe('/roads/')

    const second = await fetch(`${baseUrl}/roads/`, { redirect: 'manual' })
    expect(second.status).toBe(307)
    expect(second.headers.get('location')).toBe('/favorites/')
    expect(second.headers.get('content-security-policy')).toContain("frame-ancestors 'none'")

    const final = await fetch(`${baseUrl}/roads`)
    expect(final.url).toBe(`${baseUrl}/favorites/`)
    expect(final.status).toBe(200)
    expect(await final.text()).toContain('<title>favorites</title>')
  })

  it('serves index.html with the vercel.json headers', async () => {
    const response = await fetch(`${baseUrl}/`)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(response.headers.get('strict-transport-security')).toMatch(/max-age=/)
    expect(response.headers.get('x-frame-options')).toBe('DENY')
  })

  it('serves static assets with their content type', async () => {
    const response = await fetch(`${baseUrl}/_next/static/chunks/main.js`)
    expect(response.headers.get('content-type')).toBe('text/javascript; charset=utf-8')
  })

  it('answers unknown pages with 404.html, status 404 and the same headers', async () => {
    const response = await fetch(`${baseUrl}/no-such-page/`)
    expect(response.status).toBe(404)
    expect(await response.text()).toContain('<title>not found</title>')
    expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
  })

  it('does not serve files outside the root directory (encoded ../)', async () => {
    // %2f survives URL normalization, so the server itself must reject the decoded "../".
    const { status, body } = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      httpRequest(`${baseUrl}/..%2fsecret.txt`, (response) => {
        let text = ''
        response.setEncoding('utf8')
        response.on('data', (chunk) => (text += chunk))
        response.on('end', () => resolve({ status: response.statusCode ?? 0, body: text }))
      })
        .on('error', reject)
        .end()
    })
    expect(status).toBe(404)
    expect(body).not.toContain('outside the served directory')
  })
})
