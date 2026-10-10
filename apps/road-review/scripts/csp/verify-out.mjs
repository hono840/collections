#!/usr/bin/env node
// Build/CI gate (last step of `pnpm build`). Fails if any out/**/*.html
//  - lacks exactly one meta CSP,
//  - has a <script>/<link>/<style> before the meta CSP,
//  - has no script-src, or allows 'unsafe-inline' / 'unsafe-eval' in the meta script-src,
//  - has an inline <script> whose sha256 is missing from the meta,
// or if vercel.json's header CSP lacks frame-ancestors 'none' / HSTS is missing.
//
// Usage: node scripts/csp/verify-out.mjs [outDir=out]
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { extractInlineScripts, isMainModule, listHtmlFiles, metaCspPattern, sha256Source } from './html-scripts.mjs'

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
  const scriptSrc =
    metaMatch[1]
      .split(';')
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith('script-src ')) ?? ''
  if (!scriptSrc) failures.push(`${label}: meta CSP has no script-src`)
  if (/'unsafe-inline'|'unsafe-eval'/.test(scriptSrc)) failures.push(`${label}: meta script-src contains unsafe-*`)

  const headStart = html.search(/<head>/i)
  const beforeMeta = headStart < 0 ? '' : html.slice(headStart, metaMatch.index)
  if (headStart < 0 || /<(script|link|style)\b/i.test(beforeMeta)) {
    failures.push(`${label}: something executable/loadable precedes the meta CSP`)
  }

  for (const script of extractInlineScripts(html)) {
    const hashSource = sha256Source(script.body)
    if (!scriptSrc.includes(hashSource)) {
      failures.push(`${label}: inline script at offset ${script.index} missing ${hashSource}`)
    }
  }
  return failures
}

/**
 * @param {{ headers?: { source: string, headers: { key: string, value: string }[] }[] }} vercelConfig
 * @returns {string[]} failures (empty = OK)
 */
export function verifyVercelConfig(vercelConfig) {
  const failures = []
  const headerValues = (vercelConfig.headers ?? []).flatMap((rule) => rule.headers)
  const headerCsp = headerValues.find((header) => header.key.toLowerCase() === 'content-security-policy')?.value ?? ''
  if (!/frame-ancestors 'none'/.test(headerCsp)) failures.push("vercel.json: header CSP lacks frame-ancestors 'none'")
  if (!headerValues.some((header) => header.key.toLowerCase() === 'strict-transport-security')) {
    failures.push('vercel.json: HSTS missing')
  }
  return failures
}

/**
 * @param {string} outputDirectory
 * @param {Parameters<typeof verifyVercelConfig>[0]} vercelConfig
 * @returns {Promise<{ htmlCount: number, failures: string[] }>}
 */
export async function verifyOutputDirectory(outputDirectory, vercelConfig) {
  const failures = []
  const htmlFiles = await listHtmlFiles(outputDirectory)
  if (htmlFiles.length === 0) failures.push(`no HTML files under ${outputDirectory}`)
  for (const htmlFile of htmlFiles) {
    failures.push(...verifyHtml(await readFile(htmlFile, 'utf8'), path.relative(outputDirectory, htmlFile)))
  }
  failures.push(...verifyVercelConfig(vercelConfig))
  return { htmlCount: htmlFiles.length, failures }
}

if (isMainModule(import.meta.url)) {
  const outputDirectory = process.argv[2] ?? 'out'
  const vercelConfig = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'))
  const { htmlCount, failures } = await verifyOutputDirectory(outputDirectory, vercelConfig)
  if (failures.length > 0) {
    console.error(`[verify-out] FAIL (${failures.length})`)
    for (const failure of failures) console.error(`  - ${failure}`)
    process.exit(1)
  }
  console.log(`[verify-out] OK: ${htmlCount} HTML file(s) carry a hash-only meta CSP`)
}
