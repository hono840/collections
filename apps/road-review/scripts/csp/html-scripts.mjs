// Shared helpers for inject-meta-csp.mjs and verify-out.mjs (zero dependencies).
// ADR road-review-adr-static-export §3.2 / §4.1: hashes can only be computed after `next build`,
// because the inline RSC payload (self.__next_f.push(...)) differs per page and per build.
import { createHash } from 'node:crypto'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const META_CSP_SOURCE = String.raw`<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"\s*\/?>`

/** Fresh global regex each call, so callers never share `lastIndex` state. */
export function metaCspPattern() {
  return new RegExp(META_CSP_SOURCE, 'gi')
}

/** Recursively list every *.html file under a directory (sorted, absolute or as given). */
export async function listHtmlFiles(rootDirectory) {
  const entries = await readdir(rootDirectory, { recursive: true, withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort()
}

/**
 * Inline <script> bodies (no src attribute). Script elements are raw text in HTML, so the
 * characters between the tags are exactly what the browser hashes for CSP.
 */
export function extractInlineScripts(html) {
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi
  const inlineScripts = []
  for (const match of html.matchAll(scriptPattern)) {
    const attributes = match[1]
    if (/\bsrc\s*=/i.test(attributes)) continue
    inlineScripts.push({ attributes, body: match[2], index: match.index })
  }
  return inlineScripts
}

/** CSP source expression for a script body, e.g. 'sha256-abc…='. */
export function sha256Source(body) {
  return `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`
}

/** The meta policy: hash-only script-src (no 'unsafe-*'), plus object-src / base-uri lockdown. */
export function buildMetaPolicy(hashSources) {
  const uniqueHashes = [...new Set(hashSources)]
  return [`script-src 'self' ${uniqueHashes.join(' ')}`.trim(), "object-src 'none'", "base-uri 'none'"].join('; ')
}

/** True when this module is the script node was started with (lets tests import the CLIs). */
export function isMainModule(importMetaUrl) {
  const entry = process.argv[1]
  if (!entry) return false
  return path.resolve(entry) === fileURLToPath(importMetaUrl)
}
