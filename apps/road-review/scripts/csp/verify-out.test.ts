// @vitest-environment node
import { readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { injectMetaCsp } from './inject-meta-csp.mjs'
import { verifyHtml, verifyOutputDirectory, verifyVercelConfig } from './verify-out.mjs'
import { makeOutputDirectory, nextLikeHtml, RSC_CHUNK } from './test-fixtures'

type VercelConfig = { headers: { source: string; headers: { key: string; value: string }[] }[] }

const repositoryVercelConfig: VercelConfig = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))
const goodHtml = injectMetaCsp(nextLikeHtml()).html

describe('verifyHtml', () => {
  it('accepts a page whose inline scripts are all hashed in the meta CSP', () => {
    expect(verifyHtml(goodHtml, 'index.html')).toEqual([])
  })

  it('fails when the meta CSP is missing', () => {
    expect(verifyHtml(nextLikeHtml(), 'index.html')).toEqual([expect.stringMatching(/index\.html: expected 1 meta CSP, found 0/)])
  })

  it('fails when there are two meta CSPs', () => {
    const doubled = goodHtml.replace('<title>', '<meta http-equiv="Content-Security-Policy" content="script-src \'self\'"/><title>')
    expect(verifyHtml(doubled, 'index.html')).toEqual([expect.stringMatching(/found 2/)])
  })

  it("fails when the meta script-src allows 'unsafe-inline'", () => {
    const unsafe = goodHtml.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
    expect(verifyHtml(unsafe, 'index.html')).toContainEqual(expect.stringMatching(/unsafe-\*/))
  })

  it("fails when the meta script-src allows 'unsafe-eval'", () => {
    const unsafe = goodHtml.replace("script-src 'self'", "script-src 'self' 'unsafe-eval'")
    expect(verifyHtml(unsafe, 'index.html')).toContainEqual(expect.stringMatching(/unsafe-\*/))
  })

  it('fails when an inline script hash is missing (script changed after injection)', () => {
    const tampered = goodHtml.replace(RSC_CHUNK, 'alert(1)')
    expect(verifyHtml(tampered, 'index.html')).toEqual([expect.stringMatching(/inline script at offset \d+ missing 'sha256-/)])
  })

  it('fails when the meta CSP has no script-src', () => {
    const noScriptSrc = goodHtml.replace(/content="script-src [^;]*; /, 'content="')
    expect(verifyHtml(noScriptSrc, 'index.html')).toContainEqual(expect.stringMatching(/no script-src/))
  })

  it('fails when a script or stylesheet precedes the meta CSP', () => {
    const lateMeta = goodHtml.replace('<meta charSet="utf-8"/>', '<meta charSet="utf-8"/><script src="/early.js"></script>')
    expect(verifyHtml(lateMeta, 'index.html')).toContainEqual(expect.stringMatching(/precedes the meta CSP/))
  })
})

describe('verifyVercelConfig', () => {
  it("accepts the repository's vercel.json", () => {
    expect(verifyVercelConfig(repositoryVercelConfig)).toEqual([])
  })

  it("fails when the header CSP lacks frame-ancestors 'none'", () => {
    const weakened = structuredClone(repositoryVercelConfig)
    for (const header of weakened.headers[0].headers) {
      if (header.key === 'Content-Security-Policy') header.value = header.value.replace("frame-ancestors 'none'; ", '')
    }
    expect(verifyVercelConfig(weakened)).toContainEqual(expect.stringMatching(/frame-ancestors/))
  })

  it('fails when HSTS is missing', () => {
    const weakened = structuredClone(repositoryVercelConfig)
    weakened.headers[0].headers = weakened.headers[0].headers.filter((header) => header.key !== 'Strict-Transport-Security')
    expect(verifyVercelConfig(weakened)).toContainEqual(expect.stringMatching(/HSTS/))
  })
})

describe('verifyOutputDirectory', () => {
  const createdDirectories: string[] = []
  afterEach(async () => {
    await Promise.all(createdDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
  })

  it('reports the broken file among good ones', async () => {
    const outputDirectory = await makeOutputDirectory({
      'index.html': goodHtml,
      'favorites/index.html': nextLikeHtml(),
    })
    createdDirectories.push(outputDirectory)

    const result = await verifyOutputDirectory(outputDirectory, repositoryVercelConfig)

    expect(result.htmlCount).toBe(2)
    expect(result.failures).toEqual([expect.stringMatching(/favorites\/index\.html: expected 1 meta CSP, found 0/)])
  })

  it('fails when there is no HTML at all', async () => {
    const outputDirectory = await makeOutputDirectory({ 'index.txt': 'x' })
    createdDirectories.push(outputDirectory)
    const result = await verifyOutputDirectory(outputDirectory, repositoryVercelConfig)
    expect(result.failures).toContainEqual(expect.stringMatching(/no HTML files/))
  })
})
