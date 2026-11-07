#!/usr/bin/env node
// Catalog extractor (ARCH v3 4.1 / 4.2 / 4.5 / 4.6, stage 5).
// For each road of a catalog file: one Overpass query (cached 90 days) -> assemble cutFrom..cutTo
// -> Douglas–Peucker (15 m) -> data/geometry/<id>.json (ODbL, committed) + a local SVG preview and report.
//
// Usage: pnpm catalog:extract [--catalog <path>] [--only id1,id2] [--dry-run] [--refresh]
//   --catalog  defaults to data/road-catalog.json (relative paths resolve from the app root)
//   --dry-run  prints the planned queries and their count; no network, no files
//   --refresh  ignores the cache
// Network: Overpass only, through lib/overpass-client.mjs (one at a time, 5 s apart, fixed User-Agent).
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assembleRoute } from './lib/assemble.mjs'
import { cachedQuery, createQueryCache } from './lib/cache.mjs'
import { buildOverpassQuery, createOverpassClient } from './lib/overpass-client.mjs'
import { simplifyLine } from './lib/simplify.mjs'

export const TOLERANCE_M = 15
const DEFAULT_MAX_QUERIES = 120
const ODBL_LICENSE = 'ODbL-1.0'
const OSM_ATTRIBUTION = '© OpenStreetMap contributors'
const CATALOG_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/
/** Errors after which no further query is sent in this run. */
const FATAL_CLIENT_CODES = new Set(['overpass_gave_up', 'query_budget_exceeded', 'unsafe_user_agent'])

const PREVIEW_WIDTH = 240
const PREVIEW_HEIGHT = 160
const PREVIEW_PADDING = 12

/**
 * @typedef {[number, number]} Point
 * @typedef {{ code: string, message: string }} Warning
 * @typedef {{
 *   id: string, ok: boolean, fromCache?: boolean, lengthKm?: number, rawPoints?: number, points?: number,
 *   representativePoint?: { lat: number, lng: number }, warnings: Warning[], error?: { code: string, message: string }
 * }} RoadReport
 */

/**
 * @param {string[]} argv
 * @returns {{ ok: true, catalog?: string, only?: string[], dryRun: boolean, refresh: boolean } | { ok: false, message: string }}
 */
function parseArguments(argv) {
  /** @type {{ catalog?: string, only?: string[], dryRun: boolean, refresh: boolean }} */
  const parsed = { dryRun: false, refresh: false }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--dry-run') parsed.dryRun = true
    else if (argument === '--refresh') parsed.refresh = true
    else if (argument === '--catalog' || argument === '--only') {
      const value = argv[index + 1]
      if (value === undefined || value.startsWith('--')) return { ok: false, message: `${argument} needs a value` }
      index += 1
      if (argument === '--catalog') parsed.catalog = value
      else parsed.only = value.split(',').map((id) => id.trim()).filter(Boolean)
    } else return { ok: false, message: `unknown argument: ${argument}` }
  }
  return { ok: true, ...parsed }
}

/**
 * Minimal shape check of the parts the extractor relies on (full validation: src/lib/catalog/schema.ts in CI).
 * @param {any} catalog
 * @returns {string[]} problems
 */
function catalogProblems(catalog) {
  if (!catalog || typeof catalog !== 'object' || !Array.isArray(catalog.roads)) return ['catalog has no roads array']
  /** @type {string[]} */
  const problems = []
  const seen = new Set()
  catalog.roads.forEach((/** @type {any} */ road, /** @type {number} */ index) => {
    const label = typeof road?.id === 'string' ? road.id : `roads[${index}]`
    if (typeof road?.id !== 'string' || !CATALOG_ID.test(road.id)) problems.push(`${label}: invalid id`)
    if (seen.has(road?.id)) problems.push(`${label}: duplicate id`)
    seen.add(road?.id)
    const osm = road?.osm
    if (!osm || typeof osm !== 'object') {
      problems.push(`${label}: no osm recipe`)
      return
    }
    for (const key of ['cutFrom', 'cutTo']) {
      const point = osm[key]
      if (!point || typeof point.lat !== 'number' || typeof point.lng !== 'number') problems.push(`${label}: osm.${key} missing`)
    }
  })
  return problems
}

/**
 * @param {Point[][]} lines
 * @returns {[number, number, number, number]} [south, west, north, east]
 */
function boundingBox(lines) {
  let south = Infinity
  let west = Infinity
  let north = -Infinity
  let east = -Infinity
  for (const [lat, lng] of lines.flat()) {
    south = Math.min(south, lat)
    north = Math.max(north, lat)
    west = Math.min(west, lng)
    east = Math.max(east, lng)
  }
  return [south, west, north, east]
}

/**
 * Point at half of the drawn length (suggestion for representativePoint; a human may change it).
 * @param {Point[][]} lines
 */
function midpointAlong(lines) {
  const radians = Math.PI / 180
  /** @param {Point} from @param {Point} to */
  const approxMeters = (from, to) =>
    Math.hypot((to[0] - from[0]) * 110540, (to[1] - from[1]) * Math.cos(from[0] * radians) * 111320)
  const total = lines.reduce((sum, line) => sum + line.slice(1).reduce((acc, point, index) => acc + approxMeters(line[index], point), 0), 0)
  let remaining = total / 2
  for (const line of lines) {
    for (let index = 1; index < line.length; index += 1) {
      const step = approxMeters(line[index - 1], line[index])
      if (step >= remaining && step > 0) {
        const ratio = remaining / step
        const lat = line[index - 1][0] + (line[index][0] - line[index - 1][0]) * ratio
        const lng = line[index - 1][1] + (line[index][1] - line[index - 1][1]) * ratio
        return { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) }
      }
      remaining -= step
    }
  }
  const [lat, lng] = lines[0][0]
  return { lat, lng }
}

/**
 * Stable text: two-space JSON with one [lat, lng] point per row (keeps files small and diffs readable).
 * @param {Record<string, unknown> & { lines: Point[][] }} geometry
 */
function formatGeometry(geometry) {
  const { lines, ...rest } = geometry
  const placeholder = '__LINES_PLACEHOLDER__'
  const head = JSON.stringify({ ...rest, lines: placeholder }, null, 2)
  const body = lines
    .map((line) => `    [\n${line.map(([lat, lng]) => `      [${lat}, ${lng}]`).join(',\n')}\n    ]`)
    .join(',\n')
  return `${head.replace(`"${placeholder}"`, `[\n${body}\n  ]`)}\n`
}

/**
 * 240x160 SVG: the line(s) plus a start dot (green) and an end dot (red). No script, no external references.
 * @param {Point[][]} lines
 */
export function renderPreviewSvg(lines, { width = PREVIEW_WIDTH, height = PREVIEW_HEIGHT, padding = PREVIEW_PADDING } = {}) {
  const [south, west, north, east] = boundingBox(lines)
  const midLat = (south + north) / 2
  const scaleLng = Math.cos((midLat * Math.PI) / 180)
  const spanX = Math.max((east - west) * scaleLng, 1e-9)
  const spanY = Math.max(north - south, 1e-9)
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY)
  const offsetX = (width - spanX * scale) / 2
  const offsetY = (height - spanY * scale) / 2
  /** @param {Point} point */
  const project = ([lat, lng]) => [
    Number((offsetX + (lng - west) * scaleLng * scale).toFixed(1)),
    Number((offsetY + (north - lat) * scale).toFixed(1)),
  ]
  const strokeWidth = Math.max(1.5, Math.min(width, height) / 80)
  const polylines = lines
    .map(
      (line) =>
        `  <polyline points="${line.map((point) => project(point).join(',')).join(' ')}" fill="none" stroke="#2563eb" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/>`,
    )
    .join('\n')
  const [startX, startY] = project(lines[0][0])
  const lastLine = lines[lines.length - 1]
  const [endX, endY] = project(lastLine[lastLine.length - 1])
  const radius = Math.max(4, Math.min(width, height) / 32)
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    polylines,
    `  <circle cx="${startX}" cy="${startY}" r="${radius}" fill="#16a34a"/>`,
    `  <circle cx="${endX}" cy="${endY}" r="${radius}" fill="#dc2626"/>`,
    '</svg>',
    '',
  ].join('\n')
}

/**
 * Write via a temporary file so a crash never leaves a truncated file behind.
 * @param {string} file
 * @param {string} text
 */
async function writeTextFile(file, text) {
  await mkdir(path.dirname(file), { recursive: true })
  const temporaryFile = `${file}.tmp`
  await writeFile(temporaryFile, text, 'utf8')
  await rename(temporaryFile, file)
}

/**
 * @param {{
 *   argv: string[],
 *   rootDir: string,
 *   fetch: import('./lib/overpass-client.mjs').FetchLike | ((...args: any[]) => Promise<Response>),
 *   now: () => number,
 *   sleep: (ms: number) => Promise<void>,
 *   log: (line: string) => void,
 *   maxQueries?: number,
 *   [key: string]: unknown,
 * }} options
 * @returns {Promise<{ exitCode: number }>}
 */
export async function runExtract({ argv, rootDir, fetch, now, sleep, log, maxQueries = DEFAULT_MAX_QUERIES }) {
  const parsed = parseArguments(argv)
  if (!parsed.ok) {
    log(`error: ${parsed.message}`)
    return { exitCode: 1 }
  }

  const catalogPath = path.resolve(rootDir, parsed.catalog ?? 'data/road-catalog.json')
  let catalog
  try {
    catalog = JSON.parse(await readFile(catalogPath, 'utf8'))
  } catch (error) {
    log(`error: cannot read catalog ${path.relative(rootDir, catalogPath)}: ${error instanceof Error ? error.message : String(error)}`)
    return { exitCode: 1 }
  }
  const problems = catalogProblems(catalog)
  if (problems.length > 0) {
    for (const problem of problems) log(`error: ${problem}`)
    return { exitCode: 1 }
  }

  /** @type {any[]} */
  let roads = catalog.roads
  if (parsed.only) {
    const known = new Set(roads.map((road) => road.id))
    const unknown = parsed.only.filter((id) => !known.has(id))
    if (unknown.length > 0) {
      log(`error: --only has ids that are not in the catalog: ${unknown.join(', ')}`)
      return { exitCode: 1 }
    }
    const wanted = new Set(parsed.only)
    roads = roads.filter((road) => wanted.has(road.id))
  }

  /** @type {Array<{ road: any, query: string }>} */
  const plan = []
  for (const road of roads) {
    try {
      plan.push({ road, query: buildOverpassQuery(road.osm) })
    } catch (error) {
      log(`error: ${road.id}: ${error instanceof Error ? error.message : String(error)}`)
      return { exitCode: 1 }
    }
  }

  if (parsed.dryRun) {
    for (const { road, query } of plan) log(`[dry-run] ${road.id}:\n${query}`)
    log(`[dry-run] planned queries: ${plan.length} (limit ${maxQueries}; cached answers are not re-sent)`)
    return { exitCode: plan.length > maxQueries ? 1 : 0 }
  }
  if (plan.length > maxQueries) {
    log(`error: ${plan.length} planned queries exceed the limit of ${maxQueries}; nothing was sent`)
    return { exitCode: 1 }
  }

  const client = createOverpassClient({ fetch, now, sleep, maxQueries })
  log(`User-Agent: ${client.userAgent}`)
  const cacheDir = path.join(rootDir, 'data', '.osm-cache')
  const cache = createQueryCache({ dir: cacheDir, now })

  /** @type {RoadReport[]} */
  const reports = []
  let stopped = false
  for (const { road, query } of plan) {
    let fetched
    try {
      fetched = await cachedQuery({ cache, client, roadId: road.id, query, refresh: parsed.refresh })
    } catch (error) {
      const code = /** @type {any} */ (error)?.code ?? 'query_failed'
      const message = error instanceof Error ? error.message : String(error)
      reports.push({ id: road.id, ok: false, warnings: [], error: { code, message } })
      log(`${road.id}: FAILED ${code}: ${message}`)
      if (FATAL_CLIENT_CODES.has(code)) {
        log('stopping the whole run (no further queries are sent)')
        stopped = true
        break
      }
      continue
    }

    const { response, fromCache } = fetched
    const osm = road.osm
    const assembled = assembleRoute(Array.isArray(response?.elements) ? response.elements : [], {
      cutFrom: osm.cutFrom,
      cutTo: osm.cutTo,
      allowGaps: osm.allowGaps === true,
      excludeWays: osm.excludeWays ?? [],
      expectedLengthKm: osm.expectedLengthKm,
    })
    if (!assembled.ok) {
      reports.push({ id: road.id, ok: false, fromCache, warnings: assembled.warnings, error: { code: assembled.code, message: assembled.message } })
      log(`${road.id}: FAILED ${assembled.code}: ${assembled.message}`)
      continue
    }

    /** @type {Point[][]} */
    let lines
    try {
      lines = assembled.lines.map((line) => simplifyLine(line, { toleranceM: TOLERANCE_M }))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      reports.push({ id: road.id, ok: false, fromCache, warnings: assembled.warnings, error: { code: 'simplify_failed', message } })
      log(`${road.id}: FAILED simplify_failed: ${message}`)
      continue
    }

    const timestamp = response?.osm3s?.timestamp_osm_base
    if (typeof timestamp !== 'string') {
      reports.push({
        id: road.id,
        ok: false,
        fromCache,
        warnings: assembled.warnings,
        error: { code: 'no_timestamp', message: 'response has no osm3s.timestamp_osm_base' },
      })
      log(`${road.id}: FAILED no_timestamp`)
      continue
    }

    const geometry = {
      geometrySchemaVersion: 1,
      id: road.id,
      license: ODBL_LICENSE,
      attribution: OSM_ATTRIBUTION,
      osm: {
        ...(Array.isArray(osm.relations) ? { relations: [...osm.relations] } : {}),
        ways: assembled.wayIds,
        dataTimestamp: timestamp,
      },
      toleranceM: TOLERANCE_M,
      lengthM: Math.round(assembled.lengthM),
      bbox: boundingBox(lines),
      lines,
    }
    await writeTextFile(path.join(rootDir, 'data', 'geometry', `${road.id}.json`), formatGeometry(geometry))
    await writeTextFile(path.join(cacheDir, 'preview', `${road.id}.svg`), renderPreviewSvg(lines))

    const rawPoints = assembled.lines.reduce((total, line) => total + line.length, 0)
    const points = lines.reduce((total, line) => total + line.length, 0)
    const lengthKm = Number((assembled.lengthM / 1000).toFixed(2))
    reports.push({
      id: road.id,
      ok: true,
      fromCache,
      lengthKm,
      rawPoints,
      points,
      representativePoint: midpointAlong(lines),
      warnings: assembled.warnings,
    })
    const warningText = assembled.warnings.length > 0 ? ` warnings: ${assembled.warnings.map((warning) => warning.code).join(', ')}` : ''
    log(`${road.id}: ok ${lengthKm} km, ${rawPoints} -> ${points} points, ${lines.length} line(s)${fromCache ? ' (cache)' : ''}${warningText}`)
  }

  const report = {
    generatedAt: new Date(now()).toISOString(),
    catalog: path.relative(rootDir, catalogPath),
    queriesSent: client.queryCount,
    requestsSent: client.requestCount,
    stopped,
    roads: reports,
  }
  await writeTextFile(path.join(cacheDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
  log(`queries sent: ${client.queryCount} (requests incl. retries: ${client.requestCount})`)

  const failed = stopped || reports.some((entry) => !entry.ok)
  return { exitCode: failed ? 1 : 0 }
}

const isMain = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const rootDir = fileURLToPath(new URL('../../', import.meta.url))
  const { exitCode } = await runExtract({
    argv: process.argv.slice(2),
    rootDir,
    fetch: (url, init) => globalThis.fetch(url, init),
    now: () => Date.now(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log: (line) => console.log(line),
  })
  process.exitCode = exitCode
}
