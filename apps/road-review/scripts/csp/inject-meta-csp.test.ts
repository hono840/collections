// @vitest-environment node
import { createHash } from 'node:crypto'
import { readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { injectMetaCsp, injectOutputDirectory } from './inject-meta-csp.mjs'
import { makeOutputDirectory, nextLikeHtml, RSC_BOOTSTRAP, RSC_CHUNK } from './test-fixtures'

const META_PATTERN = /<meta http-equiv="Content-Security-Policy" content="([^"]*)"\/>/g

function sha256(body: string): string {
  return `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`
}

function metaPolicies(html: string): string[] {
  return [...html.matchAll(META_PATTERN)].map((match) => match[1])
}

describe('injectMetaCsp', () => {
  it('inserts exactly one meta CSP directly after <meta charSet>', () => {
    const { html } = injectMetaCsp(nextLikeHtml())
    expect(metaPolicies(html)).toHaveLength(1)
    expect(html).toMatch(/<head><meta charSet="utf-8"\/><meta http-equiv="Content-Security-Policy"/)
  })

  it('allows each inline script by its sha256 and nothing unsafe', () => {
    const { html, hashCount } = injectMetaCsp(nextLikeHtml())
    const [policy] = metaPolicies(html)
    expect(hashCount).toBe(2)
    expect(policy).toContain(`script-src 'self' ${sha256(RSC_BOOTSTRAP)} ${sha256(RSC_CHUNK)}`)
    expect(policy).toContain("object-src 'none'")
    expect(policy).toContain("base-uri 'none'")
    expect(policy).not.toMatch(/unsafe-inline|unsafe-eval/)
  })

  it('does not hash external scripts (they load under script-src self)', () => {
    const { hashCount } = injectMetaCsp(nextLikeHtml({ inlineScripts: [] }))
    expect(hashCount).toBe(0)
  })

  it('lists a repeated inline script hash once', () => {
    const { html } = injectMetaCsp(nextLikeHtml({ inlineScripts: [RSC_CHUNK, RSC_CHUNK] }))
    const [policy] = metaPolicies(html)
    expect(policy.split(sha256(RSC_CHUNK))).toHaveLength(2)
  })

  it('is idempotent (running it twice gives the same file)', () => {
    const once = injectMetaCsp(nextLikeHtml()).html
    const twice = injectMetaCsp(once).html
    expect(twice).toBe(once)
  })

  it('re-hashes when a page changed after an earlier injection', () => {
    const stale = injectMetaCsp(nextLikeHtml()).html.replace(RSC_CHUNK, 'self.__next_f.push([1,"changed"])')
    const [policy] = metaPolicies(injectMetaCsp(stale).html)
    expect(policy).toContain(sha256('self.__next_f.push([1,"changed"])'))
    expect(policy).not.toContain(sha256(RSC_CHUNK))
  })

  it('falls back to right after <head> when there is no <meta charSet>', () => {
    const { html } = injectMetaCsp('<html><head><title>x</title></head><body><script>a()</script></body></html>')
    expect(html).toMatch(/^<html><head><meta http-equiv="Content-Security-Policy"/)
  })

  it('throws when the document has no <head>', () => {
    expect(() => injectMetaCsp('<html><body></body></html>')).toThrow(/<head>/)
  })
})

describe('injectOutputDirectory', () => {
  const createdDirectories: string[] = []
  afterEach(async () => {
    await Promise.all(createdDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
  })

  it('injects into every nested *.html and leaves other files alone', async () => {
    const outputDirectory = await makeOutputDirectory({
      'index.html': nextLikeHtml({ title: 'home' }),
      'favorites/index.html': nextLikeHtml({ title: 'favorites' }),
      'index.txt': 'rsc payload',
    })
    createdDirectories.push(outputDirectory)

    const summary = await injectOutputDirectory(outputDirectory)

    expect(summary.map((entry) => path.relative(outputDirectory, entry.file)).sort()).toEqual(['favorites/index.html', 'index.html'])
    expect(metaPolicies(await readFile(path.join(outputDirectory, 'favorites/index.html'), 'utf8'))).toHaveLength(1)
    expect(await readFile(path.join(outputDirectory, 'index.txt'), 'utf8')).toBe('rsc payload')
  })

  it('rejects an output directory without HTML files', async () => {
    const outputDirectory = await makeOutputDirectory({ 'index.txt': 'x' })
    createdDirectories.push(outputDirectory)
    await expect(injectOutputDirectory(outputDirectory)).rejects.toThrow(/no HTML files/)
  })
})
