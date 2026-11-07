// @vitest-environment node
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { catalogFileSchema, geometryFileSchema } from '@/lib/catalog/schema'
import { runExtract } from './extract-osm.mjs'
import { USER_AGENT } from './lib/overpass-client.mjs'

// ARCH v3 4.1 / 4.2 / 4.5 / 4.6 / 9.1, stage 5.
// Contract: runExtract({ argv, rootDir, fetch, now, sleep, log, maxQueries? }) -> Promise<{ exitCode: number }>
//   argv: [--catalog <path>] [--only id1,id2] [--dry-run] [--refresh]
//     --catalog defaults to <rootDir>/data/road-catalog.json (relative paths resolve from rootDir)
//   Writes (paths under rootDir):
//     data/geometry/<id>.json             geometryFileSchema, toleranceM 15, lines start at cutFrom
//     data/.osm-cache/<id>/<sha256>.json  raw Overpass response (see lib/cache.mjs)
//     data/.osm-cache/preview/<id>.svg    240x160 SVG preview (line + start/end dots, no script, no external refs)
//     data/.osm-cache/report.json         { roads: [{ id, ok, lengthKm, rawPoints, points, warnings[{code,message}], error? }] }
//   One query per road, sent through createOverpassClient (5 s spacing, retries, budget).
//   A road that fails to assemble gets no geometry file; exitCode 1 if any road failed (others still written).
//   --dry-run: logs every planned query and the total count; no network, no files.
//   Planned queries > maxQueries (default 120) -> exitCode 1 before any network.
// The fake Overpass below answers from synthetic fixtures; the real network is never touched.

const FIXTURE_DIR = fileURLToPath(new URL('../../tests/fixtures/osm/', import.meta.url))
const CATALOG = path.join(FIXTURE_DIR, 'catalog.json')

type FetchInit = { method?: string; headers?: HeadersInit; body?: string; signal?: AbortSignal }

let rootDir: string
let world: ReturnType<typeof createFakeOverpass>
let logLines: string[]

async function fixture(name: string) {
  return readFile(path.join(FIXTURE_DIR, name), 'utf8')
}

function createFakeOverpass() {
  const state = { time: Date.parse('2026-10-10T00:00:00Z'), fetchStarts: [] as number[], fetchEnds: [] as number[] }
  const queries: string[] = []
  const userAgents: Array<string | null> = []
  const fetch = vi.fn(async (_url: string, init: FetchInit) => {
    state.fetchStarts.push(state.time)
    const query = new URLSearchParams(init.body).get('data') ?? ''
    queries.push(query)
    userAgents.push(new Headers(init.headers).get('user-agent'))
    state.time += 800
    state.fetchEnds.push(state.time)
    let body: string
    if (query.includes('way(id:101,102,103)')) body = await fixture('linear-reversed.json')
    else if (query.includes('relation(id:9000001)')) body = await fixture('dual-branch-path.json')
    else if (query.includes('"name"="見本峠線"')) body = await fixture('gap.json')
    else return new Response('unknown query', { status: 400 })
    return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } })
  })
  const sleep = vi.fn(async (ms: number) => {
    state.time += Math.max(0, ms)
  })
  return { state, queries, userAgents, fetch, sleep, now: () => state.time }
}

function run(argv: string[], extra: Record<string, unknown> = {}) {
  return runExtract({
    argv,
    rootDir,
    fetch: world.fetch,
    now: world.now,
    sleep: world.sleep,
    log: (line: string) => logLines.push(line),
    ...extra,
  })
}

async function readJson(relativePath: string) {
  return JSON.parse(await readFile(path.join(rootDir, relativePath), 'utf8'))
}

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), 'road-review-extract-'))
  world = createFakeOverpass()
  logLines = []
  vi.stubGlobal('fetch', () => {
    throw new Error('real network is forbidden in tests')
  })
})

afterEach(async () => {
  vi.unstubAllGlobals()
  await rm(rootDir, { recursive: true, force: true })
})

describe('見本のリスト', () => {
  it('src/lib/catalog/schema.ts の形を満たす', async () => {
    expect(catalogFileSchema.safeParse(JSON.parse(await fixture('catalog.json'))).success).toBe(true)
  })
})

describe('--dry-run', () => {
  it('問い合わせ文と回数だけを出し、通信もファイルの書き込みもしない', async () => {
    const { exitCode } = await run(['--catalog', CATALOG, '--dry-run'])
    expect(exitCode).toBe(0)
    expect(world.fetch).not.toHaveBeenCalled()
    const output = logLines.join('\n')
    expect(output).toContain('way(id:101,102,103)')
    expect(output).toContain('relation(id:9000001)')
    expect(output).toContain('"name"="見本峠線"')
    expect(output).toMatch(/\b3\b/)
    expect(existsSync(path.join(rootDir, 'data'))).toBe(false)
  })

  it('--only と一緒なら、その道の分だけ', async () => {
    await run(['--catalog', CATALOG, '--dry-run', '--only', 'mihon-linear-road'])
    const output = logLines.join('\n')
    expect(output).toContain('way(id:101,102,103)')
    expect(output).not.toContain('relation(id:9000001)')
    expect(world.fetch).not.toHaveBeenCalled()
  })
})

describe('取り出し', () => {
  it('--only の道だけを1回ずつ問い合わせ、geometry を書く', async () => {
    const { exitCode } = await run(['--catalog', CATALOG, '--only', 'mihon-linear-road,mihon-dual-road'])
    expect(exitCode).toBe(0)
    expect(world.fetch).toHaveBeenCalledTimes(2)
    expect((await readdir(path.join(rootDir, 'data/geometry'))).sort()).toEqual(['mihon-dual-road.json', 'mihon-linear-road.json'])
  })

  it('geometry は geometryFileSchema を満たし、ID・ライセンス・OSM の時点・誤差15m・cutFrom からの向き', async () => {
    await run(['--catalog', CATALOG, '--only', 'mihon-linear-road'])
    const geometry = await readJson('data/geometry/mihon-linear-road.json')
    const parsed = geometryFileSchema.safeParse(geometry)
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)
    expect(geometry).toMatchObject({
      geometrySchemaVersion: 1,
      id: 'mihon-linear-road',
      license: 'ODbL-1.0',
      attribution: '© OpenStreetMap contributors',
      osm: { ways: [101, 102, 103], dataTimestamp: '2026-10-01T00:00:00Z' },
      toleranceM: 15,
    })
    expect(geometry.lines).toHaveLength(1)
    expect(geometry.lines[0][0]).toEqual([35, 139])
    expect(geometry.lines[0].at(-1)).toEqual([35.012, 139])
    expect(geometry.lengthM).toBeGreaterThan(1300)
    expect(geometry.lengthM).toBeLessThan(1400)
  })

  it('bbox は [南, 西, 北, 東] で全部の点を囲む', async () => {
    await run(['--catalog', CATALOG, '--only', 'mihon-linear-road'])
    const { bbox, lines } = await readJson('data/geometry/mihon-linear-road.json')
    const [south, west, north, east] = bbox
    for (const [lat, lng] of lines.flat()) {
      expect(lat).toBeGreaterThanOrEqual(south)
      expect(lat).toBeLessThanOrEqual(north)
      expect(lng).toBeGreaterThanOrEqual(west)
      expect(lng).toBeLessThanOrEqual(east)
    }
  })

  it('relation のレシピでは osm.relations を残す', async () => {
    await run(['--catalog', CATALOG, '--only', 'mihon-dual-road'])
    const geometry = await readJson('data/geometry/mihon-dual-road.json')
    expect(geometry.osm.relations).toEqual([9000001])
    expect(geometryFileSchema.safeParse(geometry).success).toBe(true)
  })

  it('道と道の問い合わせの間は5秒以上あき、名乗りは定数', async () => {
    await run(['--catalog', CATALOG, '--only', 'mihon-linear-road,mihon-dual-road'])
    expect(world.state.fetchStarts[1]! - world.state.fetchEnds[0]!).toBeGreaterThanOrEqual(5000)
    expect(world.userAgents).toEqual([USER_AGENT, USER_AGENT])
  })

  it('報告（report.json）に長さ km・点の数・注意を書く', async () => {
    await run(['--catalog', CATALOG, '--only', 'mihon-linear-road'])
    const report = await readJson('data/.osm-cache/report.json')
    const road = report.roads.find((entry: { id: string }) => entry.id === 'mihon-linear-road')
    expect(road).toMatchObject({ id: 'mihon-linear-road', ok: true, rawPoints: 7, warnings: [] })
    expect(road.lengthKm).toBeCloseTo(1.35, 1)
    expect(road.points).toBeGreaterThanOrEqual(2)
    expect(road.points).toBeLessThanOrEqual(road.rawPoints)
    expect(logLines.join('\n')).toContain('mihon-linear-road')
  })

  it('道ごとに 240×160 の SVG の絵を書く（script や外の参照なし）', async () => {
    await run(['--catalog', CATALOG, '--only', 'mihon-linear-road'])
    const svg = await readFile(path.join(rootDir, 'data/.osm-cache/preview/mihon-linear-road.svg'), 'utf8')
    expect(svg.trimStart()).toMatch(/^<svg\b/)
    expect(svg).toMatch(/width="240"/)
    expect(svg).toMatch(/height="160"/)
    expect(svg).toMatch(/<(polyline|path)\b/)
    expect(svg.match(/<circle\b/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
    expect(svg).not.toMatch(/<script|href=|<image|<foreignObject/i)
  })

  it('生の応答をキャッシュに残し、2回目は通信しない', async () => {
    await run(['--catalog', CATALOG, '--only', 'mihon-linear-road'])
    expect(world.fetch).toHaveBeenCalledTimes(1)
    expect((await readdir(path.join(rootDir, 'data/.osm-cache/mihon-linear-road'))).filter((name) => name.endsWith('.json'))).toHaveLength(1)
    const { exitCode } = await run(['--catalog', CATALOG, '--only', 'mihon-linear-road'])
    expect(exitCode).toBe(0)
    expect(world.fetch).toHaveBeenCalledTimes(1)
  })

  it('--refresh ならキャッシュがあっても取り直す', async () => {
    await run(['--catalog', CATALOG, '--only', 'mihon-linear-road'])
    await run(['--catalog', CATALOG, '--only', 'mihon-linear-road', '--refresh'])
    expect(world.fetch).toHaveBeenCalledTimes(2)
  })

  it('同じ入力から2回作ると geometry は1バイトも違わない', async () => {
    await run(['--catalog', CATALOG, '--only', 'mihon-linear-road'])
    const first = await readFile(path.join(rootDir, 'data/geometry/mihon-linear-road.json'), 'utf8')
    await run(['--catalog', CATALOG, '--only', 'mihon-linear-road'])
    const second = await readFile(path.join(rootDir, 'data/geometry/mihon-linear-road.json'), 'utf8')
    expect(second).toBe(first)
  })

  it('書いたファイルと出力に @ が入らない（個人情報を出さない）', async () => {
    await run(['--catalog', CATALOG, '--only', 'mihon-linear-road'])
    const files = [
      'data/geometry/mihon-linear-road.json',
      'data/.osm-cache/report.json',
      'data/.osm-cache/preview/mihon-linear-road.svg',
    ]
    for (const file of files) expect(await readFile(path.join(rootDir, file), 'utf8')).not.toContain('@')
    expect(logLines.join('\n')).not.toContain('@')
  })
})

describe('失敗と上限', () => {
  it('つながらない道（allowGaps なし）は geometry を書かず、報告に失敗を書き、終了コード1（ほかの道は書く）', async () => {
    const { exitCode } = await run(['--catalog', CATALOG])
    expect(exitCode).toBe(1)
    expect(world.fetch).toHaveBeenCalledTimes(3)
    expect(existsSync(path.join(rootDir, 'data/geometry/mihon-gap-road.json'))).toBe(false)
    expect(existsSync(path.join(rootDir, 'data/geometry/mihon-linear-road.json'))).toBe(true)
    const report = await readJson('data/.osm-cache/report.json')
    const gapRoad = report.roads.find((entry: { id: string }) => entry.id === 'mihon-gap-road')
    expect(gapRoad).toMatchObject({ ok: false, error: { code: 'disconnected' } })
  })

  it('--only に無い ID があれば、通信する前に止まる', async () => {
    const { exitCode } = await run(['--catalog', CATALOG, '--only', 'mihon-linear-road,no-such-road'])
    expect(exitCode).toBe(1)
    expect(world.fetch).not.toHaveBeenCalled()
    expect(logLines.join('\n')).toContain('no-such-road')
  })

  it('予定の問い合わせが上限（maxQueries）を超えるなら、始める前に止まる', async () => {
    const { exitCode } = await run(['--catalog', CATALOG], { maxQueries: 2 })
    expect(exitCode).toBe(1)
    expect(world.fetch).not.toHaveBeenCalled()
    expect(existsSync(path.join(rootDir, 'data/geometry'))).toBe(false)
  })

  it('Overpass があきらめた（429 が続いた）ら、実行全体を止める', async () => {
    const busyFetch = vi.fn(async () => new Response('busy', { status: 429 }))
    const { exitCode } = await run(['--catalog', CATALOG], { fetch: busyFetch })
    expect(exitCode).toBe(1)
    // 1 query x (1 + 2 retries); the remaining roads are not attempted
    expect(busyFetch).toHaveBeenCalledTimes(3)
    expect(existsSync(path.join(rootDir, 'data/geometry'))).toBe(false)
  })

  it('知らない引数は止まる', async () => {
    const { exitCode } = await run(['--catalog', CATALOG, '--everything'])
    expect(exitCode).toBe(1)
    expect(world.fetch).not.toHaveBeenCalled()
  })
})
