// @vitest-environment node
import { rm } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { BASE_PATH } from '../site-config.mjs'
import { injectMetaCsp } from './inject-meta-csp.mjs'
import { checkCssUrls, checkHtmlResourceUrls, verifyHtml, verifyOutputDirectory, verifyPolicy } from './verify-out.mjs'
import { CSS_PATH, FONT_PATH, makeOutputDirectory, NEXT_LIKE_ASSETS, nextLikeHtml, RSC_CHUNK, SCRIPT_PATH } from './test-fixtures'

const goodHtml = injectMetaCsp(nextLikeHtml()).html
const goodPolicy = /content="([^"]*)"/.exec(goodHtml.slice(goodHtml.indexOf('http-equiv')))![1]

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
    const noScriptSrc = goodHtml.replace(/script-src [^;]*; /, '')
    expect(verifyHtml(noScriptSrc, 'index.html')).toContainEqual(expect.stringMatching(/no script-src/))
  })

  it('fails when a script or stylesheet precedes the meta CSP', () => {
    const lateMeta = goodHtml.replace('<meta charSet="utf-8"/>', '<meta charSet="utf-8"/><script src="/early.js"></script>')
    expect(verifyHtml(lateMeta, 'index.html')).toContainEqual(expect.stringMatching(/precedes the meta CSP/))
  })
})

describe('verifyPolicy (the meta CSP is the only CSP on GitHub Pages)', () => {
  it('accepts the injected policy', () => {
    expect(verifyPolicy(goodPolicy, 'index.html')).toEqual([])
  })

  it.each([
    ['an external script host', "script-src 'self' https://cdn.example.com", /script-src must not allow https:\/\/cdn\.example\.com/],
    ['a scheme source', "connect-src 'self' https:", /connect-src must not allow https:/],
    ['a wildcard', "img-src *", /img-src must not allow \*/],
    ['Google Fonts', "font-src 'self' https://fonts.gstatic.com", /font-src must not allow https:\/\/fonts\.gstatic\.com/],
    ["'unsafe-inline' outside style-src", "img-src 'self' 'unsafe-inline'", /img-src must not allow 'unsafe-inline'/],
    ["'strict-dynamic'", "script-src 'self' 'strict-dynamic'", /script-src must not allow 'strict-dynamic'/],
  ])('fails on %s', (_name, replacement, expected) => {
    const directiveName = replacement.split(' ')[0]
    const weakened = goodPolicy.replace(new RegExp(`${directiveName} [^;]*`), replacement)
    expect(verifyPolicy(weakened, 'index.html')).toContainEqual(expect.stringMatching(expected))
  })

  it.each([
    ["default-src 'self'", /default-src 'self'/],
    ["object-src 'none'", /object-src 'none'/],
    ["base-uri 'none'", /base-uri 'none'/],
  ])('fails when %s is missing', (directive, expected) => {
    const weakened = goodPolicy.replace(`${directive}; `, '').replace(`; ${directive}`, '')
    expect(verifyPolicy(weakened, 'index.html')).toContainEqual(expect.stringMatching(expected))
  })
})

describe('checkHtmlResourceUrls', () => {
  it('collects every asset under BASE_PATH as an out/-relative path', () => {
    expect(checkHtmlResourceUrls(goodHtml, 'index.html', BASE_PATH)).toEqual({
      failures: [],
      localPaths: [FONT_PATH, CSS_PATH, SCRIPT_PATH],
    })
  })

  it.each([
    ['/_next/static/chunks/main.js', 'a root path without the basePath (404 on GitHub Pages)'],
    ['https://fonts.googleapis.com/css2?family=Barlow', 'an external stylesheet'],
    ['//cdn.example.com/x.js', 'a protocol-relative URL'],
  ])('fails on %s (%s)', (url) => {
    const html = goodHtml.replace(`${BASE_PATH}/${SCRIPT_PATH}`, url)
    expect(checkHtmlResourceUrls(html, 'index.html', BASE_PATH).failures).toEqual([
      expect.stringMatching(/index\.html: <script src=.* is outside \/collections\/drive-spots\//),
    ])
  })

  it('allows data: URIs and ignores <a href> links', () => {
    const html = '<head><img src="data:image/png;base64,AA"/></head><body><a href="https://example.com">x</a></body>'
    expect(checkHtmlResourceUrls(html, 'index.html', BASE_PATH)).toEqual({ failures: [], localPaths: [] })
  })
})

describe('checkCssUrls', () => {
  it('resolves relative font urls from the CSS file location', () => {
    expect(checkCssUrls(NEXT_LIKE_ASSETS[CSS_PATH], CSS_PATH, BASE_PATH)).toEqual({ failures: [], localPaths: [FONT_PATH] })
  })

  it('accepts basePath-absolute urls and data: URIs', () => {
    const css = `a{background:url("${BASE_PATH}/${FONT_PATH}")}b{background:url(data:image/svg+xml,%3Csvg%3E)}`
    expect(checkCssUrls(css, CSS_PATH, BASE_PATH)).toEqual({ failures: [], localPaths: [FONT_PATH] })
  })

  it.each([
    ['url(https://fonts.gstatic.com/s/x.woff2)', /is not same-origin/],
    ['url(//fonts.gstatic.com/s/x.woff2)', /is not same-origin/],
    ['url(/media/x.woff2)', /is outside \/collections\/drive-spots\//],
    ['url(../../../../x.woff2)', /leaves out\//],
  ])('fails on %s', (reference, expected) => {
    expect(checkCssUrls(`a{src:${reference}}`, CSS_PATH, BASE_PATH).failures).toEqual([expect.stringMatching(expected)])
  })
})

describe('verifyOutputDirectory', () => {
  const createdDirectories: string[] = []
  afterEach(async () => {
    await Promise.all(createdDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
  })

  it('accepts a complete out/ (files at the root, URLs under BASE_PATH)', async () => {
    const outputDirectory = await makeOutputDirectory({ 'index.html': goodHtml, '404.html': goodHtml, ...NEXT_LIKE_ASSETS })
    createdDirectories.push(outputDirectory)

    const result = await verifyOutputDirectory(outputDirectory)

    expect(result).toEqual({ htmlCount: 2, cssCount: 1, assetCount: 3, failures: [] })
  })

  it('reports the broken file among good ones', async () => {
    const outputDirectory = await makeOutputDirectory({
      'index.html': goodHtml,
      '_not-found/index.html': nextLikeHtml(),
      ...NEXT_LIKE_ASSETS,
    })
    createdDirectories.push(outputDirectory)

    const result = await verifyOutputDirectory(outputDirectory)

    expect(result.htmlCount).toBe(2)
    expect(result.failures).toEqual([expect.stringMatching(/_not-found\/index\.html: expected 1 meta CSP, found 0/)])
  })

  it('fails when a referenced script or font file is missing', async () => {
    const partialAssets = Object.fromEntries(
      Object.entries(NEXT_LIKE_ASSETS).filter(([assetPath]) => assetPath !== SCRIPT_PATH && assetPath !== FONT_PATH),
    )
    const outputDirectory = await makeOutputDirectory({ 'index.html': goodHtml, ...partialAssets })
    createdDirectories.push(outputDirectory)

    const result = await verifyOutputDirectory(outputDirectory)

    expect(result.failures).toEqual([
      `index.html: ${BASE_PATH}/${FONT_PATH} does not exist in ${outputDirectory}`,
      `index.html: ${BASE_PATH}/${SCRIPT_PATH} does not exist in ${outputDirectory}`,
    ])
  })

  it('fails when the build used a different basePath than scripts/site-config.mjs', async () => {
    const outputDirectory = await makeOutputDirectory({ 'index.html': goodHtml, ...NEXT_LIKE_ASSETS })
    createdDirectories.push(outputDirectory)

    const result = await verifyOutputDirectory(outputDirectory, { basePath: '/collections/other-app' })

    expect(result.failures).toHaveLength(3)
    expect(result.failures[0]).toMatch(/is outside \/collections\/other-app\//)
  })

  it('fails when there is no HTML at all', async () => {
    const outputDirectory = await makeOutputDirectory({ 'index.txt': 'x' })
    createdDirectories.push(outputDirectory)
    const result = await verifyOutputDirectory(outputDirectory)
    expect(result.failures).toContainEqual(expect.stringMatching(/no HTML files/))
  })
})
