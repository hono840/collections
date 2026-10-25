#!/usr/bin/env node
// Build/CI gate (last step of `pnpm build`). Fails if any out/**/*.html
//  - lacks exactly one meta CSP, or has a <script>/<link>/<style> before it,
//  - has a meta policy that is not the closed, same-origin-only policy (spec AC21):
//      default-src 'self', object-src 'none', base-uri 'none' present; script-src only 'self' + hashes;
//      no host, scheme (except data: in img-src / font-src), wildcard or 'unsafe-*' anywhere
//      (the single exception: 'unsafe-inline' in style-src),
//  - has an inline <script> whose sha256 is missing from the meta,
//  - loads a resource (<script src>, <link href>, <img src>, ...) from outside BASE_PATH (AC20/AC21),
//    or whose file does not exist in out/,
// or if a CSS file's url(...) points outside out/ or at a missing file (fonts, AC19/AC20).
//
// Ported from apps/road-review. The vercel.json header check is gone (GitHub Pages has no headers);
// the policy and asset checks replace it.
//
// Usage: node scripts/csp/verify-out.mjs [outDir=out]
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { BASE_PATH } from '../site-config.mjs'
import {
  extractInlineScripts,
  isMainModule,
  listFiles,
  listHtmlFiles,
  metaCspPattern,
  parsePolicy,
  sha256Source,
} from './html-scripts.mjs'

const HASH_SOURCE = /^'sha256-[A-Za-z0-9+/]+={0,2}'$/

/** Source expressions each directive may contain. Anything else (hosts, https:, *, ...) fails. */
function isAllowedSource(directiveName, source) {
  if (source === "'self'" || source === "'none'") return true
  if (directiveName === 'script-src') return HASH_SOURCE.test(source)
  if (directiveName === 'style-src') return source === "'unsafe-inline'"
  if (directiveName === 'img-src' || directiveName === 'font-src') return source === 'data:'
  return false
}

/**
 * @param {string} policy meta CSP content
 * @param {string} label file name used in messages
 * @returns {string[]} failures (empty = OK)
 */
export function verifyPolicy(policy, label) {
  const failures = []
  const directives = parsePolicy(policy)
  const scriptSources = directives.get('script-src')
  if (!scriptSources) failures.push(`${label}: meta CSP has no script-src`)
  if (scriptSources?.some((source) => /^'unsafe-/i.test(source))) {
    failures.push(`${label}: meta script-src contains unsafe-*`)
  }
  for (const [name, expected] of [
    ['default-src', "'self'"],
    ['object-src', "'none'"],
    ['base-uri', "'none'"],
  ]) {
    if (directives.get(name)?.join(' ') !== expected) failures.push(`${label}: meta CSP needs ${name} ${expected}`)
  }
  for (const [name, sources] of directives) {
    for (const source of sources) {
      if (!isAllowedSource(name, source)) failures.push(`${label}: ${name} must not allow ${source}`)
    }
  }
  return failures
}

/**
 * @param {string} html
 * @param {string} label file name used in messages
 * @returns {string[]} failures (empty = OK)
 */
export function verifyHtml(html, label) {
  const failures = []
  const metaMatches = [...html.matchAll(metaCspPattern())]
  if (metaMatches.length !== 1) return [`${label}: expected 1 meta CSP, found ${metaMatches.length}`]

  const [metaMatch] = metaMatches
  failures.push(...verifyPolicy(metaMatch[1], label))
  const scriptSources = parsePolicy(metaMatch[1]).get('script-src') ?? []

  const headStart = html.search(/<head>/i)
  const beforeMeta = headStart < 0 ? '' : html.slice(headStart, metaMatch.index)
  if (headStart < 0 || /<(script|link|style)\b/i.test(beforeMeta)) {
    failures.push(`${label}: something executable/loadable precedes the meta CSP`)
  }

  for (const script of extractInlineScripts(html)) {
    const hashSource = sha256Source(script.body)
    if (!scriptSources.includes(hashSource)) {
      failures.push(`${label}: inline script at offset ${script.index} missing ${hashSource}`)
    }
  }
  return failures
}

const RESOURCE_PATTERN = /<(script|link|img|source|iframe|embed|video|audio)\b[^>]*?\s(src|href)="([^"]*)"/gi

/**
 * URLs of resources an HTML page makes the browser fetch. Every one must live under BASE_PATH
 * (a data: URI is fine). Returns the failures plus the out/-relative paths to check on disk.
 * @param {string} html
 * @param {string} label
 * @param {string} basePath e.g. '/collections/drive-spots'
 * @returns {{ failures: string[], localPaths: string[] }}
 */
export function checkHtmlResourceUrls(html, label, basePath) {
  const failures = []
  const localPaths = []
  for (const match of html.matchAll(RESOURCE_PATTERN)) {
    const url = match[3]
    if (url.startsWith('data:')) continue
    if (!url.startsWith(`${basePath}/`)) {
      failures.push(`${label}: <${match[1].toLowerCase()} ${match[2]}="${url}"> is outside ${basePath}/`)
      continue
    }
    localPaths.push(decodeURIComponent(url.slice(basePath.length + 1).split(/[?#]/)[0]))
  }
  return { failures, localPaths }
}

/**
 * url(...) references in a CSS file (Next writes fonts as url(../media/x.woff2)).
 * @param {string} css
 * @param {string} cssRelativePath path of the CSS file relative to out/, e.g. '_next/static/chunks/a.css'
 * @param {string} basePath
 * @returns {{ failures: string[], localPaths: string[] }}
 */
export function checkCssUrls(css, cssRelativePath, basePath) {
  const failures = []
  const localPaths = []
  for (const match of css.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/gi)) {
    const url = match[2].trim()
    if (url === '' || url.startsWith('data:') || url.startsWith('#')) continue
    const cleanUrl = decodeURIComponent(url.split(/[?#]/)[0])
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) {
      failures.push(`${cssRelativePath}: url(${url}) is not same-origin`)
    } else if (url.startsWith('/')) {
      if (!url.startsWith(`${basePath}/`)) failures.push(`${cssRelativePath}: url(${url}) is outside ${basePath}/`)
      else localPaths.push(cleanUrl.slice(basePath.length + 1))
    } else {
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(cssRelativePath), cleanUrl))
      if (resolved.startsWith('../')) failures.push(`${cssRelativePath}: url(${url}) leaves out/`)
      else localPaths.push(resolved)
    }
  }
  return { failures, localPaths }
}

async function isFile(filePath) {
  try {
    return (await stat(filePath)).isFile()
  } catch {
    return false
  }
}

/**
 * @param {string} outputDirectory
 * @param {{ basePath?: string }} [options]
 * @returns {Promise<{ htmlCount: number, cssCount: number, assetCount: number, failures: string[] }>}
 */
export async function verifyOutputDirectory(outputDirectory, { basePath = BASE_PATH } = {}) {
  const failures = []
  const referenced = new Map() // out/-relative path -> first file that references it
  const remember = (localPaths, referrer) => {
    for (const localPath of localPaths) if (!referenced.has(localPath)) referenced.set(localPath, referrer)
  }

  const htmlFiles = await listHtmlFiles(outputDirectory)
  if (htmlFiles.length === 0) failures.push(`no HTML files under ${outputDirectory}`)
  for (const htmlFile of htmlFiles) {
    const label = path.relative(outputDirectory, htmlFile)
    const html = await readFile(htmlFile, 'utf8')
    failures.push(...verifyHtml(html, label))
    const resources = checkHtmlResourceUrls(html, label, basePath)
    failures.push(...resources.failures)
    remember(resources.localPaths, label)
  }

  const cssFiles = await listFiles(outputDirectory, '.css')
  for (const cssFile of cssFiles) {
    const label = path.relative(outputDirectory, cssFile).split(path.sep).join('/')
    const urls = checkCssUrls(await readFile(cssFile, 'utf8'), label, basePath)
    failures.push(...urls.failures)
    remember(urls.localPaths, label)
  }

  for (const [localPath, referrer] of referenced) {
    if (!(await isFile(path.join(outputDirectory, localPath)))) {
      failures.push(`${referrer}: ${basePath}/${localPath} does not exist in ${outputDirectory}`)
    }
  }
  return { htmlCount: htmlFiles.length, cssCount: cssFiles.length, assetCount: referenced.size, failures }
}

if (isMainModule(import.meta.url)) {
  const outputDirectory = process.argv[2] ?? 'out'
  const { htmlCount, cssCount, assetCount, failures } = await verifyOutputDirectory(outputDirectory)
  if (failures.length > 0) {
    console.error(`[verify-out] FAIL (${failures.length})`)
    for (const failure of failures) console.error(`  - ${failure}`)
    process.exit(1)
  }
  console.log(
    `[verify-out] OK: ${htmlCount} HTML file(s) carry the closed hash-only meta CSP; ` +
      `all ${assetCount} asset(s) referenced by them and by ${cssCount} CSS file(s) exist under ${BASE_PATH}/`,
  )
}
