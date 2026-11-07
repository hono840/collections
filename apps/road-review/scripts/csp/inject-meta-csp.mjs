#!/usr/bin/env node
// Post-build step (part of `pnpm build`, NOT postbuild: `--ignore-scripts` skips pre/post hooks).
// For every out/**/*.html, hash each inline <script> (SHA-256) and insert
// <meta http-equiv="Content-Security-Policy" content="script-src 'self' 'sha256-…' …"> into <head>.
//
// Placement (ADR §4.3): directly after <meta charSet>, which Next emits as the first child of <head>,
// so the charset stays inside the first 1024 bytes (HTML spec) and the CSP meta still precedes every
// <script>/<link>/<style>. verify-out.mjs enforces "nothing executable before the meta".
//
// The meta policy is combined with the looser header CSP in vercel.json; a browser enforces both,
// so only hashed inline scripts run (ADR §3.4 control experiment 2).
//
// Usage: node scripts/csp/inject-meta-csp.mjs [outDir=out]
import { readFile, writeFile } from 'node:fs/promises'
import {
  buildMetaPolicy,
  extractInlineScripts,
  isMainModule,
  listHtmlFiles,
  metaCspPattern,
  sha256Source,
} from './html-scripts.mjs'

const CHARSET_PATTERN = /<head>(\s*<meta\s+charSet="utf-8"\s*\/?>)?/i

/**
 * Returns the document with exactly one hash-only meta CSP. Idempotent: a previously injected meta
 * is dropped before hashing, so re-running after a rebuild never stacks policies.
 * @param {string} originalHtml
 * @returns {{ html: string, hashCount: number }}
 */
export function injectMetaCsp(originalHtml) {
  const html = originalHtml.replace(metaCspPattern(), '')
  if (!CHARSET_PATTERN.test(html)) throw new Error('<head> not found')
  const hashSources = extractInlineScripts(html).map((script) => sha256Source(script.body))
  const metaTag = `<meta http-equiv="Content-Security-Policy" content="${buildMetaPolicy(hashSources)}"/>`
  return {
    html: html.replace(CHARSET_PATTERN, (headWithCharset) => `${headWithCharset}${metaTag}`),
    hashCount: new Set(hashSources).size,
  }
}

/**
 * Rewrites every HTML file under the directory in place.
 * @param {string} outputDirectory
 * @returns {Promise<{ file: string, hashCount: number }[]>}
 */
export async function injectOutputDirectory(outputDirectory) {
  const htmlFiles = await listHtmlFiles(outputDirectory)
  if (htmlFiles.length === 0) throw new Error(`no HTML files under ${outputDirectory}`)
  const summary = []
  for (const htmlFile of htmlFiles) {
    let result
    try {
      result = injectMetaCsp(await readFile(htmlFile, 'utf8'))
    } catch (error) {
      throw new Error(`${htmlFile}: ${error instanceof Error ? error.message : String(error)}`)
    }
    await writeFile(htmlFile, result.html)
    summary.push({ file: htmlFile, hashCount: result.hashCount })
  }
  return summary
}

if (isMainModule(import.meta.url)) {
  const outputDirectory = process.argv[2] ?? 'out'
  try {
    for (const { file, hashCount } of await injectOutputDirectory(outputDirectory)) {
      console.log(`[inject-meta-csp] ${file}: ${hashCount} inline script hash(es)`)
    }
  } catch (error) {
    console.error(`[inject-meta-csp] ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}
