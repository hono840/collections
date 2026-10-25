// Shared helpers for inject-meta-csp.mjs and verify-out.mjs (zero dependencies).
// Ported from apps/road-review (ADR road-review-adr-static-export §3.2 / §4.1): hashes can only be
// computed after `next build`, because the inline RSC payload (self.__next_f.push(...)) differs per
// page and per build.
//
// Difference from road-review: GitHub Pages cannot send response headers, so this <meta> policy is
// the ONLY CSP the browser sees. It therefore carries the whole policy (default-src etc.), not just
// script-src. Directives a <meta> CSP ignores (frame-ancestors, report-uri, sandbox) are left out on
// purpose: browsers log a console error for them.
import { createHash } from 'node:crypto'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const META_CSP_SOURCE = String.raw`<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"\s*\/?>`

/** Fresh global regex each call, so callers never share `lastIndex` state. */
export function metaCspPattern() {
  return new RegExp(META_CSP_SOURCE, 'gi')
}

/** Recursively list every file with the extension (e.g. '.css') under a directory, sorted. */
export async function listFiles(rootDirectory, extension) {
  const entries = await readdir(rootDirectory, { recursive: true, withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort()
}

/** Recursively list every *.html file under a directory (sorted). */
export function listHtmlFiles(rootDirectory) {
  return listFiles(rootDirectory, '.html')
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

/**
 * The full meta policy. Only same-origin resources load; a script must be a same-origin file or an
 * inline script whose sha256 is listed (no 'unsafe-*').
 * - style-src 'unsafe-inline': Next's built-in 404 page (and any SSR'd style={{...}} prop) renders
 *   inline style attributes / <style>. CSS cannot run code, and img/font/connect stay 'self'-only.
 * - img-src data: lets CSS / inline SVG use data: URIs. No other scheme or host appears anywhere.
 * - form-action 'none': forms are handled in JS (preventDefault); a native submit must never navigate.
 */
export function buildMetaPolicy(hashSources) {
  const uniqueHashes = [...new Set(hashSources)]
  return [
    "default-src 'self'",
    `script-src 'self' ${uniqueHashes.join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ')
}

/** Parses "a x y; b z" into Map { a => ['x', 'y'], b => ['z'] } (first occurrence wins, as in CSP). */
export function parsePolicy(policy) {
  const directives = new Map()
  for (const rawDirective of policy.split(';')) {
    const [name, ...sources] = rawDirective.trim().split(/\s+/).filter(Boolean)
    if (name && !directives.has(name.toLowerCase())) directives.set(name.toLowerCase(), sources)
  }
  return directives
}

/** True when this module is the script node was started with (lets tests import the CLIs). */
export function isMainModule(importMetaUrl) {
  const entry = process.argv[1]
  if (!entry) return false
  return path.resolve(entry) === fileURLToPath(importMetaUrl)
}
