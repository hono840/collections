// @vitest-environment node
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CACHE_MAX_AGE_MS, cachedQuery, createQueryCache, queryHash } from './cache.mjs'

// ARCH v3 4.2 (cache row) / 9.1 cache.
// Contract:
//   queryHash(query) = sha256 hex of the query text (content address)
//   CACHE_MAX_AGE_MS = 90 days
//   createQueryCache({ dir, now, maxAgeMs = CACHE_MAX_AGE_MS }) ->
//     pathFor(roadId, query) = <dir>/<roadId>/<queryHash>.json
//     read(roadId, query)  -> Promise<{ query, fetchedAt, timestampOsmBase, response } | undefined>
//                             (undefined when missing, unreadable, query text differs, or older than maxAgeMs)
//     write(roadId, query, response) -> Promise<void>   (fetchedAt = new Date(now()).toISOString())
//   cachedQuery({ cache, client, roadId, query, refresh = false }) -> Promise<{ response, fromCache }>
//   roadId must be a catalog id (no path separators / '..'), otherwise throws.

const DAY_MS = 24 * 60 * 60 * 1000
const QUERY = '[out:json][timeout:60];\nway(id:101,102,103);\nout geom tags;'
const RESPONSE = { version: 0.6, osm3s: { timestamp_osm_base: '2026-10-01T00:00:00Z' }, elements: [{ type: 'way', id: 101 }] }

let dir: string
let time: number
const now = () => time

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'road-review-cache-'))
  time = Date.parse('2026-10-10T00:00:00Z')
  vi.stubGlobal('fetch', () => {
    throw new Error('real network is forbidden in tests')
  })
})

afterEach(async () => {
  vi.unstubAllGlobals()
  await rm(dir, { recursive: true, force: true })
})

function fakeClient(response: unknown = RESPONSE) {
  return { query: vi.fn(async () => structuredClone(response)) }
}

describe('queryHash', () => {
  it('問い合わせ文の SHA-256（16進）', () => {
    expect(queryHash(QUERY)).toBe(createHash('sha256').update(QUERY, 'utf8').digest('hex'))
  })

  it('1文字違えば別の鍵', () => {
    expect(queryHash(QUERY)).not.toBe(queryHash(`${QUERY} `))
  })
})

describe('createQueryCache', () => {
  it('置き場所は <dir>/<道の ID>/<ハッシュ>.json', () => {
    const cache = createQueryCache({ dir, now })
    expect(cache.pathFor('mihon-linear-road', QUERY)).toBe(path.join(dir, 'mihon-linear-road', `${queryHash(QUERY)}.json`))
  })

  it('書いたものを読める（問い合わせ文・取った日時・OSM の時点も残す）', async () => {
    const cache = createQueryCache({ dir, now })
    await cache.write('mihon-linear-road', QUERY, RESPONSE)
    const entry = await cache.read('mihon-linear-road', QUERY)
    expect(entry).toEqual({
      query: QUERY,
      fetchedAt: '2026-10-10T00:00:00.000Z',
      timestampOsmBase: '2026-10-01T00:00:00Z',
      response: RESPONSE,
    })
    const onDisk = JSON.parse(await readFile(cache.pathFor('mihon-linear-road', QUERY), 'utf8'))
    expect(onDisk.query).toBe(QUERY)
  })

  it('無いものは undefined', async () => {
    const cache = createQueryCache({ dir, now })
    await expect(cache.read('mihon-linear-road', QUERY)).resolves.toBeUndefined()
  })

  it('90日を過ぎたものは undefined（取り直す）。90日ちょうどまでは使う', async () => {
    expect(CACHE_MAX_AGE_MS).toBe(90 * DAY_MS)
    const cache = createQueryCache({ dir, now })
    await cache.write('mihon-linear-road', QUERY, RESPONSE)
    time += 90 * DAY_MS
    await expect(cache.read('mihon-linear-road', QUERY)).resolves.toBeDefined()
    time += 1
    await expect(cache.read('mihon-linear-road', QUERY)).resolves.toBeUndefined()
  })

  it('壊れたファイルは無いものとして扱う', async () => {
    const cache = createQueryCache({ dir, now })
    const file = cache.pathFor('mihon-linear-road', QUERY)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, '{ not json')
    await expect(cache.read('mihon-linear-road', QUERY)).resolves.toBeUndefined()
  })

  it.each(['../escape', 'a/b', '', 'A_B'])('道の ID として不正な %j は断る（フォルダの外に書かない）', async (roadId) => {
    const cache = createQueryCache({ dir, now })
    expect(() => cache.pathFor(roadId, QUERY)).toThrow()
  })
})

describe('cachedQuery', () => {
  it('キャッシュが無ければ1回だけ問い合わせて、書いておく', async () => {
    const cache = createQueryCache({ dir, now })
    const client = fakeClient()
    const result = await cachedQuery({ cache, client, roadId: 'mihon-linear-road', query: QUERY })
    expect(result).toEqual({ response: RESPONSE, fromCache: false })
    expect(client.query).toHaveBeenCalledTimes(1)
    expect(client.query).toHaveBeenCalledWith(QUERY)
    await expect(cache.read('mihon-linear-road', QUERY)).resolves.toMatchObject({ response: RESPONSE })
  })

  it('同じ問い合わせの2回目は通信しない', async () => {
    const cache = createQueryCache({ dir, now })
    const client = fakeClient()
    await cachedQuery({ cache, client, roadId: 'mihon-linear-road', query: QUERY })
    const second = await cachedQuery({ cache, client, roadId: 'mihon-linear-road', query: QUERY })
    expect(second).toEqual({ response: RESPONSE, fromCache: true })
    expect(client.query).toHaveBeenCalledTimes(1)
  })

  it('問い合わせ文が変われば取り直す', async () => {
    const cache = createQueryCache({ dir, now })
    const client = fakeClient()
    await cachedQuery({ cache, client, roadId: 'mihon-linear-road', query: QUERY })
    await cachedQuery({ cache, client, roadId: 'mihon-linear-road', query: QUERY.replace('103', '104') })
    expect(client.query).toHaveBeenCalledTimes(2)
  })

  it('90日を過ぎたら取り直す', async () => {
    const cache = createQueryCache({ dir, now })
    const client = fakeClient()
    await cachedQuery({ cache, client, roadId: 'mihon-linear-road', query: QUERY })
    time += 91 * DAY_MS
    const result = await cachedQuery({ cache, client, roadId: 'mihon-linear-road', query: QUERY })
    expect(result.fromCache).toBe(false)
    expect(client.query).toHaveBeenCalledTimes(2)
  })

  it('refresh: true（--refresh）なら新しくても取り直す', async () => {
    const cache = createQueryCache({ dir, now })
    const client = fakeClient()
    await cachedQuery({ cache, client, roadId: 'mihon-linear-road', query: QUERY })
    const result = await cachedQuery({ cache, client, roadId: 'mihon-linear-road', query: QUERY, refresh: true })
    expect(result.fromCache).toBe(false)
    expect(client.query).toHaveBeenCalledTimes(2)
  })

  it('問い合わせが失敗したらキャッシュに書かない', async () => {
    const cache = createQueryCache({ dir, now })
    const client = { query: vi.fn(async () => Promise.reject(Object.assign(new Error('busy'), { code: 'overpass_gave_up' }))) }
    await expect(cachedQuery({ cache, client, roadId: 'mihon-linear-road', query: QUERY })).rejects.toMatchObject({
      code: 'overpass_gave_up',
    })
    await expect(cache.read('mihon-linear-road', QUERY)).resolves.toBeUndefined()
  })
})
