// @vitest-environment node
import { rm } from 'node:fs/promises'
import { request as httpRequest, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createStaticServer, planRoute } from './serve-static.mjs'
import { BASE_PATH } from './site-config.mjs'
import { makeOutputDirectory } from './csp/test-fixtures'

describe('planRoute (GitHub Pages project-site layout under BASE_PATH)', () => {
  it.each([
    ['/', '', { status: 302, location: `${BASE_PATH}/` }],
    [BASE_PATH, '', { status: 301, location: `${BASE_PATH}/` }],
    [BASE_PATH, '?tab=done', { status: 301, location: `${BASE_PATH}/?tab=done` }],
  ])('%s%s redirects', (pathname, search, expected) => {
    expect(planRoute(pathname, search)).toEqual({ kind: 'redirect', ...expected })
  })

  it.each([
    [`${BASE_PATH}/`, '/'],
    [`${BASE_PATH}/_next/static/chunks/main.js`, '/_next/static/chunks/main.js'],
    [`${BASE_PATH}/index.txt`, '/index.txt'],
  ])('%s is served from out%s', (pathname, relativePath) => {
    expect(planRoute(pathname, '')).toEqual({ kind: 'file', relativePath })
  })

  it.each(['/_next/static/chunks/main.js', '/collections/', '/collections/drive-spotsX/', '/favicon.ico'])(
    '%s (outside BASE_PATH) is not found',
    (pathname) => {
      expect(planRoute(pathname, '')).toEqual({ kind: 'not-found' })
    },
  )
})

describe('createStaticServer', () => {
  let server: Server
  let baseUrl: string
  let workDirectory: string

  beforeAll(async () => {
    workDirectory = await makeOutputDirectory({
      'out/index.html': '<!DOCTYPE html><title>home</title>',
      'out/_not-found/index.html': '<!DOCTYPE html><title>not found page</title>',
      'out/404.html': '<!DOCTYPE html><title>not found</title>',
      'out/_next/static/chunks/main.js': 'console.log(1)',
      'out/_next/static/media/font.woff2': 'wOF2',
      'secret.txt': 'outside the served directory',
    })
    server = createStaticServer({ rootDirectory: path.join(workDirectory, 'out') })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve))
    await rm(workDirectory, { recursive: true, force: true })
  })

  it('serves index.html at BASE_PATH/ without custom headers (Pages cannot set any)', async () => {
    const response = await fetch(`${baseUrl}${BASE_PATH}/`)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(response.headers.get('content-security-policy')).toBeNull()
    expect(await response.text()).toContain('<title>home</title>')
  })

  it('/ -> 302 BASE_PATH/ -> 200', async () => {
    const first = await fetch(`${baseUrl}/`, { redirect: 'manual' })
    expect(first.status).toBe(302)
    expect(first.headers.get('location')).toBe(`${BASE_PATH}/`)

    const final = await fetch(`${baseUrl}/`)
    expect(final.url).toBe(`${baseUrl}${BASE_PATH}/`)
    expect(final.status).toBe(200)
  })

  it('redirects a directory without trailing slash (301), like GitHub Pages', async () => {
    const response = await fetch(`${baseUrl}${BASE_PATH}/_not-found?x=1`, { redirect: 'manual' })
    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe(`${BASE_PATH}/_not-found/?x=1`)
  })

  it('serves static assets with their content type', async () => {
    const script = await fetch(`${baseUrl}${BASE_PATH}/_next/static/chunks/main.js`)
    expect(script.headers.get('content-type')).toBe('text/javascript; charset=utf-8')
    const font = await fetch(`${baseUrl}${BASE_PATH}/_next/static/media/font.woff2`)
    expect(font.status).toBe(200)
    expect(font.headers.get('content-type')).toBe('font/woff2')
  })

  // The second case is an asset URL that forgot the basePath: it must 404 locally, as on Pages.
  it.each([`${BASE_PATH}/no-such-page/`, '/_next/static/chunks/main.js'])(
    'answers %s with 404.html and status 404',
    async (pathname) => {
      const response = await fetch(`${baseUrl}${pathname}`)
      expect(response.status).toBe(404)
      expect(await response.text()).toContain('<title>not found</title>')
    },
  )

  it('does not serve files outside the root directory (encoded ../)', async () => {
    // %2f survives URL normalization, so the server itself must reject the decoded "../".
    const { status, body } = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      httpRequest(`${baseUrl}${BASE_PATH}/..%2fsecret.txt`, (response) => {
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
