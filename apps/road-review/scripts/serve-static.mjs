#!/usr/bin/env node
// Zero-dependency static server for `pnpm start` and E2E: serves out/ and applies vercel.json
// (trailingSlash, redirects, headers) so local checks see the same routing and CSP as Vercel.
//
// Usage: node scripts/serve-static.mjs [outDir=out] [--port 3000]   (PORT env also works)
//
// Only the vercel.json features this app uses are implemented: header/redirect sources that are
// either a literal path or "/(.*)", and trailingSlash:true. Anything else throws, so a new rule
// cannot silently behave differently here than on Vercel.
//
// Order matches Vercel (ADR §5.1-2): the trailingSlash 308 runs BEFORE `redirects`, so a redirect
// source must end with "/" (e.g. /roads -> 308 /roads/ -> 307 /favorites/).
import { readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { isMainModule } from './csp/html-scripts.mjs'

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

function sourceMatches(source, pathname) {
  if (source === '/(.*)') return true
  if (/[()*:?+]/.test(source)) throw new Error(`serve-static: unsupported source pattern ${source}`)
  return source === pathname
}

/**
 * Decides what to answer for a path, in Vercel's order.
 * @param {string} pathname
 * @param {string} search  e.g. "?sort=new" or ""
 * @param {{ trailingSlash?: boolean, redirects?: { source: string, destination: string, permanent?: boolean }[] }} vercelConfig
 * @returns {{ kind: 'redirect', status: number, location: string } | { kind: 'file' }}
 */
export function planRoute(pathname, search, vercelConfig) {
  if (vercelConfig.trailingSlash === true && !pathname.startsWith('/.well-known')) {
    // Same regexes as Vercel's convertTrailingSlash(true) (ADR §3.3).
    if (/^\/((?:[^/]+\/)*[^/.]+)$/.test(pathname)) {
      return { kind: 'redirect', status: 308, location: `${pathname}/${search}` }
    }
    if (/^\/((?:[^/]+\/)*[^/]+\.\w+)\/$/.test(pathname)) {
      return { kind: 'redirect', status: 308, location: `${pathname.slice(0, -1)}${search}` }
    }
  }
  const redirect = (vercelConfig.redirects ?? []).find((rule) => sourceMatches(rule.source, pathname))
  if (redirect) return { kind: 'redirect', status: redirect.permanent ? 308 : 307, location: redirect.destination }
  return { kind: 'file' }
}

/**
 * vercel.json headers for a path. With localHttp, `upgrade-insecure-requests` is dropped from the CSP:
 * WebKit applies it even to http://127.0.0.1 and rewrites every same-origin subresource to https
 * (connection fails, no JS runs; ADR §4.2). Production is HTTPS-only, so it is a no-op there.
 * Everything else is applied verbatim.
 * @param {string} pathname
 * @param {{ headers?: { source: string, headers: { key: string, value: string }[] }[] }} vercelConfig
 * @param {{ localHttp: boolean }} options
 */
export function responseHeaders(pathname, vercelConfig, { localHttp }) {
  return (vercelConfig.headers ?? [])
    .filter((rule) => sourceMatches(rule.source, pathname))
    .flatMap((rule) => rule.headers)
    .map((header) => {
      if (!localHttp || header.key.toLowerCase() !== 'content-security-policy') return { ...header }
      const value = header.value
        .split(';')
        .map((directive) => directive.trim())
        .filter((directive) => directive && directive !== 'upgrade-insecure-requests')
        .join('; ')
      return { key: header.key, value }
    })
}

async function resolveFile(rootDirectory, pathname) {
  let decodedPath
  try {
    decodedPath = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const candidate = path.join(rootDirectory, decodedPath)
  if (candidate !== rootDirectory && !candidate.startsWith(rootDirectory + path.sep)) return null
  try {
    const info = await stat(candidate)
    if (info.isFile()) return candidate
    if (info.isDirectory()) {
      const indexFile = path.join(candidate, 'index.html')
      if ((await stat(indexFile)).isFile()) return indexFile
    }
  } catch {
    return null
  }
  return null
}

/**
 * @param {{ rootDirectory: string, vercelConfig: object, localHttp?: boolean }} options
 * @returns {import('node:http').Server}
 */
export function createStaticServer({ rootDirectory, vercelConfig, localHttp = true }) {
  const resolvedRoot = path.resolve(rootDirectory)
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    const { pathname } = url
    for (const header of responseHeaders(pathname, vercelConfig, { localHttp })) {
      response.setHeader(header.key, header.value)
    }

    const route = planRoute(pathname, url.search, vercelConfig)
    if (route.kind === 'redirect') {
      response.writeHead(route.status, { Location: route.location }).end()
      return
    }

    const filePath = await resolveFile(resolvedRoot, pathname)
    const status = filePath ? 200 : 404
    const servedPath = filePath ?? path.join(resolvedRoot, '404.html')
    try {
      const body = await readFile(servedPath)
      response.writeHead(status, {
        'Content-Type': CONTENT_TYPES[path.extname(servedPath)] ?? 'application/octet-stream',
      })
      response.end(request.method === 'HEAD' ? undefined : body)
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not Found')
    }
  })
}

if (isMainModule(import.meta.url)) {
  const argv = process.argv.slice(2)
  const portIndex = argv.indexOf('--port')
  const port = Number(portIndex >= 0 ? argv[portIndex + 1] : (process.env.PORT ?? 3000))
  const positional = argv.filter((argument, index) => !argument.startsWith('--') && index !== portIndex + 1)
  const rootDirectory = path.resolve(positional[0] ?? 'out')
  const vercelConfig = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
  createStaticServer({ rootDirectory, vercelConfig }).listen(port, '127.0.0.1', () => {
    console.log(`[serve-static] http://127.0.0.1:${port} -> ${rootDirectory}`)
  })
}
