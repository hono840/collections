#!/usr/bin/env node
// Zero-dependency static server for `pnpm start` (and E2E later): serves out/ under BASE_PATH the way
// GitHub Pages serves the deployed _site/drive-spots/, so http://127.0.0.1:3000/collections/drive-spots/
// loads exactly the files production loads.
//
// Usage: node scripts/serve-static.mjs [outDir=out] [--port 3000]   (PORT env also works)
//
// Routing (GitHub Pages behaviour this app relies on):
//   {BASE_PATH}/dir/  -> out/dir/index.html          {BASE_PATH}/file.ext -> out/file.ext
//   {BASE_PATH}/dir   -> 301 {BASE_PATH}/dir/         (directory without trailing slash)
//   anything else     -> 404 with out/404.html
//   /                 -> 302 {BASE_PATH}/              (local convenience only; on Pages the site root
//                                                      _site/index.html does a meta refresh instead)
// No custom response headers are sent: GitHub Pages cannot set them, so the meta CSP inside each
// HTML file is the only CSP, locally and in production. Ported from apps/road-review, minus the
// vercel.json emulation.
import { readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { isMainModule } from './csp/html-scripts.mjs'
import { BASE_PATH } from './site-config.mjs'

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

/**
 * Decides what to answer for a path before touching the disk.
 * @param {string} pathname
 * @param {string} search  e.g. "?tab=done" or ""
 * @param {string} [basePath]
 * @returns {{ kind: 'redirect', status: number, location: string } | { kind: 'file', relativePath: string } | { kind: 'not-found' }}
 */
export function planRoute(pathname, search, basePath = BASE_PATH) {
  if (pathname === '/') return { kind: 'redirect', status: 302, location: `${basePath}/` }
  if (pathname === basePath) return { kind: 'redirect', status: 301, location: `${basePath}/${search}` }
  if (!pathname.startsWith(`${basePath}/`)) return { kind: 'not-found' }
  return { kind: 'file', relativePath: pathname.slice(basePath.length) }
}

/**
 * @returns {Promise<{ kind: 'file', filePath: string } | { kind: 'directory' } | null>}
 */
async function resolveFile(rootDirectory, relativePath) {
  let decodedPath
  try {
    decodedPath = decodeURIComponent(relativePath)
  } catch {
    return null
  }
  const candidate = path.join(rootDirectory, decodedPath)
  if (candidate !== rootDirectory && !candidate.startsWith(rootDirectory + path.sep)) return null
  try {
    const info = await stat(candidate)
    if (info.isFile()) return { kind: 'file', filePath: candidate }
    if (info.isDirectory()) {
      if (!relativePath.endsWith('/')) return { kind: 'directory' }
      const indexFile = path.join(candidate, 'index.html')
      if ((await stat(indexFile)).isFile()) return { kind: 'file', filePath: indexFile }
    }
  } catch {
    return null
  }
  return null
}

/**
 * @param {{ rootDirectory: string, basePath?: string }} options
 * @returns {import('node:http').Server}
 */
export function createStaticServer({ rootDirectory, basePath = BASE_PATH }) {
  const resolvedRoot = path.resolve(rootDirectory)
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    const { pathname } = url

    const route = planRoute(pathname, url.search, basePath)
    if (route.kind === 'redirect') {
      response.writeHead(route.status, { Location: route.location }).end()
      return
    }

    const resolved = route.kind === 'file' ? await resolveFile(resolvedRoot, route.relativePath) : null
    if (resolved?.kind === 'directory') {
      response.writeHead(301, { Location: `${pathname}/${url.search}` }).end()
      return
    }

    const status = resolved ? 200 : 404
    const servedPath = resolved?.filePath ?? path.join(resolvedRoot, '404.html')
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
  // (road-review's version dropped argv[0] when --port was absent: portIndex + 1 === 0.)
  const positional = argv.filter(
    (argument, index) => !argument.startsWith('--') && (portIndex < 0 || index !== portIndex + 1),
  )
  const rootDirectory = path.resolve(positional[0] ?? 'out')
  createStaticServer({ rootDirectory }).listen(port, '127.0.0.1', () => {
    console.log(`[serve-static] http://127.0.0.1:${port}${BASE_PATH}/ -> ${rootDirectory}`)
  })
}
