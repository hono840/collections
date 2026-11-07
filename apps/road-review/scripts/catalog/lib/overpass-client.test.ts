// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  OVERPASS_ENDPOINT,
  USER_AGENT,
  assertSafeUserAgent,
  buildOverpassQuery,
  createOverpassClient,
} from './overpass-client.mjs'

// ARCH v3 4.2 (Overpass etiquette) / 9.1 / R12 / R13.
// Contract:
//   OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter'
//   USER_AGENT: fixed constant "road-review-catalog/<semver> (+https://github.com/hono840/collections)"
//   assertSafeUserAgent(value): throws (code 'unsafe_user_agent') unless value === USER_AGENT and has no '@'
//   buildOverpassQuery(osmRecipe): '[out:json][timeout:60];' + one of relation / ways / exact nameQuery + 'out geom tags;'
//   createOverpassClient({ fetch, now, sleep, endpoint?, userAgent?, minIntervalMs = 5000, timeoutMs = 90000,
//     maxRetries = 2, retryDelayMs = 60000, maxQueries = 120 }) -> { query(ql): Promise<json>, queryCount, requestCount }
//   Errors carry `code`: 'unsafe_user_agent' | 'query_budget_exceeded' | 'overpass_gave_up' | 'overpass_http_error'.
// Tests never touch the real network: fetch / clock / sleep are injected and global fetch is poisoned.

const OK_BODY = { version: 0.6, osm3s: { timestamp_osm_base: '2026-10-01T00:00:00Z' }, elements: [] }

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

type FetchInit = { method?: string; headers?: HeadersInit; body?: string; signal?: AbortSignal }

/** Fake clock: sleep() advances time instantly; fetch can advance time to simulate latency. */
function createFakeWorld(responder: (callIndex: number, init: FetchInit) => Response | Promise<Response>, latencyMs = 1000) {
  const state = { time: 0, sleeps: [] as number[], fetchStarts: [] as number[], fetchEnds: [] as number[], inFlight: 0, maxInFlight: 0 }
  const calls: Array<{ url: string; init: FetchInit }> = []
  const fetch = vi.fn(async (url: string, init: FetchInit) => {
    calls.push({ url, init })
    state.fetchStarts.push(state.time)
    state.inFlight += 1
    state.maxInFlight = Math.max(state.maxInFlight, state.inFlight)
    try {
      await Promise.resolve()
      state.time += latencyMs
      return await responder(calls.length - 1, init)
    } finally {
      state.inFlight -= 1
      state.fetchEnds.push(state.time)
    }
  })
  const now = () => state.time
  const sleep = vi.fn(async (ms: number) => {
    state.sleeps.push(ms)
    state.time += ms
  })
  return { state, calls, fetch, now, sleep }
}

beforeEach(() => {
  vi.stubGlobal('fetch', () => {
    throw new Error('real network is forbidden in tests')
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('USER_AGENT（名乗り）', () => {
  it('決まった形の固定の文字列で、@ を含まない', () => {
    expect(USER_AGENT).toMatch(/^road-review-catalog\/\d+\.\d+(\.\d+)? \(\+https:\/\/github\.com\/hono840\/collections\)$/)
    expect(USER_AGENT).not.toContain('@')
  })

  it('環境変数を読まない（中身を変えて読み込み直しても同じ文字列）', async () => {
    vi.stubEnv('EMAIL', 'someone@example.com')
    vi.stubEnv('USER', 'someone')
    vi.stubEnv('GIT_AUTHOR_EMAIL', 'someone@example.com')
    vi.stubEnv('OVERPASS_USER_AGENT', 'someone@example.com')
    vi.resetModules()
    const withEnv = (await import('./overpass-client.mjs')).USER_AGENT
    for (const key of ['EMAIL', 'USER', 'GIT_AUTHOR_EMAIL', 'OVERPASS_USER_AGENT', 'HOME', 'LOGNAME']) vi.stubEnv(key, '')
    vi.resetModules()
    const withoutEnv = (await import('./overpass-client.mjs')).USER_AGENT
    expect(withEnv).toBe(withoutEnv)
    expect(withEnv).toBe(USER_AGENT)
  })

  it('ソースが process.env・os.userInfo・hostname を使わない', async () => {
    const source = await readFile(new URL('./overpass-client.mjs', import.meta.url), 'utf8')
    expect(source).not.toMatch(/process\.env|userInfo|hostname\(/)
  })

  it('assertSafeUserAgent は定数そのものなら通す', () => {
    expect(() => assertSafeUserAgent(USER_AGENT)).not.toThrow()
  })

  it.each([
    ['@ を含む', `${USER_AGENT} someone@example.com`],
    ['定数と違う', 'road-review-catalog/9.9 (+https://example.com/)'],
    ['空', ''],
  ])('assertSafeUserAgent は %s 名乗りを止める', (_label, value) => {
    expect(() => assertSafeUserAgent(value)).toThrow(expect.objectContaining({ code: 'unsafe_user_agent' }))
  })

  it('危ない名乗りを渡されたクライアントは、1回も送らずに止まる', async () => {
    const world = createFakeWorld(() => jsonResponse(OK_BODY))
    expect(() =>
      createOverpassClient({ fetch: world.fetch, now: world.now, sleep: world.sleep, userAgent: 'bot someone@example.com' }),
    ).toThrow(expect.objectContaining({ code: 'unsafe_user_agent' }))
    expect(world.fetch).not.toHaveBeenCalled()
  })
})

describe('buildOverpassQuery', () => {
  const cut = { cutFrom: { lat: 35.0, lng: 139.0 }, cutTo: { lat: 35.01, lng: 139.0 } }

  it('relations は relation(id:…) → way(r) → out geom tags', () => {
    const query = buildOverpassQuery({ relations: [12639322], ...cut })
    expect(query.startsWith('[out:json][timeout:60];')).toBe(true)
    expect(query).toContain('relation(id:12639322);')
    expect(query).toContain('way(r);')
    expect(query.trimEnd().endsWith('out geom tags;')).toBe(true)
  })

  it('ways は way(id:1,2,3)', () => {
    const query = buildOverpassQuery({ ways: [1, 2, 3], ...cut })
    expect(query).toContain('way(id:1,2,3);')
    expect(query).toContain('out geom tags;')
  })

  it('nameQuery は highway と名前の完全一致を bbox の中で（正規表現を使わない）', () => {
    const query = buildOverpassQuery({ nameQuery: { name: '船原西浦高原線', bbox: [34.85, 138.75, 35, 138.9] }, ...cut })
    expect(query).toContain('way["highway"]["name"="船原西浦高原線"](34.85,138.75,35,138.9);')
    expect(query).not.toContain('~')
  })

  it('relations があれば relations を優先する', () => {
    const query = buildOverpassQuery({ relations: [5], ways: [6], ...cut })
    expect(query).toContain('relation(id:5);')
    expect(query).not.toContain('way(id:6)')
  })

  it.each(['名前"); out;', 'back\\slash', '改行\nあり'])('問い合わせ文を壊す名前（%j）は断る', (name) => {
    expect(() => buildOverpassQuery({ nameQuery: { name, bbox: [34.85, 138.75, 35, 138.9] }, ...cut })).toThrow()
  })

  it('同じレシピからは同じ文字列（キャッシュの鍵になるため）', () => {
    expect(buildOverpassQuery({ ways: [3, 1, 2], ...cut })).toBe(buildOverpassQuery({ ways: [3, 1, 2], ...cut }))
  })
})

describe('createOverpassClient: 送り方', () => {
  it('既定の送り先に POST し、data= に問い合わせ文、User-Agent に定数を付ける', async () => {
    expect(OVERPASS_ENDPOINT).toBe('https://overpass-api.de/api/interpreter')
    const world = createFakeWorld(() => jsonResponse(OK_BODY))
    const client = createOverpassClient({ fetch: world.fetch, now: world.now, sleep: world.sleep })
    const query = '[out:json][timeout:60];way(id:1);out geom tags;'

    const result = await client.query(query)

    expect(result).toEqual(OK_BODY)
    expect(world.calls).toHaveLength(1)
    const { url, init } = world.calls[0]!
    expect(url).toBe(OVERPASS_ENDPOINT)
    expect(init.method).toBe('POST')
    const headers = new Headers(init.headers)
    expect(headers.get('user-agent')).toBe(USER_AGENT)
    expect(headers.get('content-type')).toContain('application/x-www-form-urlencoded')
    for (const [, value] of headers) expect(value).not.toContain('@')
    expect(new URLSearchParams(init.body).get('data')).toBe(query)
  })

  it('送り先は差しかえられる', async () => {
    const world = createFakeWorld(() => jsonResponse(OK_BODY))
    const client = createOverpassClient({
      fetch: world.fetch,
      now: world.now,
      sleep: world.sleep,
      endpoint: 'https://overpass.example.test/api/interpreter',
    })
    await client.query('[out:json];way(id:1);out geom tags;')
    expect(world.calls[0]!.url).toBe('https://overpass.example.test/api/interpreter')
  })

  it('1つずつ送る（同時に呼ばれても並べない）', async () => {
    const world = createFakeWorld(() => jsonResponse(OK_BODY))
    const client = createOverpassClient({ fetch: world.fetch, now: world.now, sleep: world.sleep })
    await Promise.all([client.query('q1'), client.query('q2'), client.query('q3')])
    expect(world.fetch).toHaveBeenCalledTimes(3)
    expect(world.state.maxInFlight).toBe(1)
  })

  it('前の応答の後、5秒以上あけてから次を送る（最初の1回は待たない）', async () => {
    const world = createFakeWorld(() => jsonResponse(OK_BODY), 1500)
    const client = createOverpassClient({ fetch: world.fetch, now: world.now, sleep: world.sleep })
    await client.query('q1')
    await client.query('q2')
    await client.query('q3')
    expect(world.state.fetchStarts[0]).toBe(0)
    expect(world.state.fetchStarts[1]! - world.state.fetchEnds[0]!).toBeGreaterThanOrEqual(5000)
    expect(world.state.fetchStarts[2]! - world.state.fetchEnds[1]!).toBeGreaterThanOrEqual(5000)
  })

  it('間隔は minIntervalMs で変えられる', async () => {
    const world = createFakeWorld(() => jsonResponse(OK_BODY), 0)
    const client = createOverpassClient({ fetch: world.fetch, now: world.now, sleep: world.sleep, minIntervalMs: 8000 })
    await client.query('q1')
    await client.query('q2')
    expect(world.state.fetchStarts[1]! - world.state.fetchEnds[0]!).toBeGreaterThanOrEqual(8000)
  })

  it('時間がたっていれば余計に待たない', async () => {
    const world = createFakeWorld(() => jsonResponse(OK_BODY), 0)
    const client = createOverpassClient({ fetch: world.fetch, now: world.now, sleep: world.sleep })
    await client.query('q1')
    world.state.time += 10_000
    await client.query('q2')
    expect(world.sleep.mock.calls.every(([ms]) => ms <= 0)).toBe(true)
  })
})

describe('createOverpassClient: やり直しと上限', () => {
  it.each([429, 504])('%i のときは60秒待ってやり直す（最大2回）', async (status) => {
    const world = createFakeWorld((index) => (index < 2 ? jsonResponse({ error: 'busy' }, status) : jsonResponse(OK_BODY)))
    const client = createOverpassClient({ fetch: world.fetch, now: world.now, sleep: world.sleep })

    await expect(client.query('q')).resolves.toEqual(OK_BODY)

    expect(world.fetch).toHaveBeenCalledTimes(3)
    expect(world.state.sleeps.filter((ms) => ms >= 60_000)).toHaveLength(2)
    expect(world.state.fetchStarts[1]! - world.state.fetchEnds[0]!).toBeGreaterThanOrEqual(60_000)
  })

  it('3回とも 429 なら、それ以上送らずに止まる（overpass_gave_up）', async () => {
    const world = createFakeWorld(() => jsonResponse({ error: 'busy' }, 429))
    const client = createOverpassClient({ fetch: world.fetch, now: world.now, sleep: world.sleep })
    await expect(client.query('q')).rejects.toMatchObject({ code: 'overpass_gave_up' })
    expect(world.fetch).toHaveBeenCalledTimes(3)
  })

  it('通信エラーもやり直しの対象', async () => {
    const world = createFakeWorld((index) => {
      if (index === 0) throw new TypeError('fetch failed')
      return jsonResponse(OK_BODY)
    })
    const client = createOverpassClient({ fetch: world.fetch, now: world.now, sleep: world.sleep })
    await expect(client.query('q')).resolves.toEqual(OK_BODY)
    expect(world.fetch).toHaveBeenCalledTimes(2)
  })

  it('maxRetries を変えられる（0 なら1回で止まる）', async () => {
    const world = createFakeWorld(() => jsonResponse({ error: 'busy' }, 504))
    const client = createOverpassClient({ fetch: world.fetch, now: world.now, sleep: world.sleep, maxRetries: 0 })
    await expect(client.query('q')).rejects.toMatchObject({ code: 'overpass_gave_up' })
    expect(world.fetch).toHaveBeenCalledTimes(1)
  })

  it('400（問い合わせ文の誤り）はやり直さない（overpass_http_error）', async () => {
    const world = createFakeWorld(() => new Response('syntax error', { status: 400 }))
    const client = createOverpassClient({ fetch: world.fetch, now: world.now, sleep: world.sleep })
    await expect(client.query('q')).rejects.toMatchObject({ code: 'overpass_http_error' })
    expect(world.fetch).toHaveBeenCalledTimes(1)
  })

  it('時間切れ（timeoutMs）で fetch を中断する', async () => {
    const signals: AbortSignal[] = []
    const fetch = vi.fn(
      (_url: string, init: FetchInit) =>
        new Promise<Response>((_resolve, reject) => {
          signals.push(init.signal!)
          init.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        }),
    )
    const client = createOverpassClient({
      fetch,
      now: () => 0,
      sleep: async () => {},
      timeoutMs: 20,
      maxRetries: 0,
    })
    await expect(client.query('q')).rejects.toMatchObject({ code: 'overpass_gave_up' })
    expect(signals[0]).toBeInstanceOf(AbortSignal)
    expect(signals[0]!.aborted).toBe(true)
  })

  it('1回の実行の上限（maxQueries）を超える問い合わせは送らない', async () => {
    const world = createFakeWorld(() => jsonResponse(OK_BODY), 0)
    const client = createOverpassClient({ fetch: world.fetch, now: world.now, sleep: world.sleep, maxQueries: 2 })
    await client.query('q1')
    await client.query('q2')
    await expect(client.query('q3')).rejects.toMatchObject({ code: 'query_budget_exceeded' })
    expect(world.fetch).toHaveBeenCalledTimes(2)
    expect(client.queryCount).toBe(2)
  })

  it('上限の既定は120回', async () => {
    const world = createFakeWorld(() => jsonResponse(OK_BODY), 0)
    const client = createOverpassClient({ fetch: world.fetch, now: world.now, sleep: world.sleep })
    for (let index = 0; index < 120; index += 1) await client.query(`q${index}`)
    await expect(client.query('q120')).rejects.toMatchObject({ code: 'query_budget_exceeded' })
    expect(world.fetch).toHaveBeenCalledTimes(120)
  })

  it('やり直しの回数は requestCount に数える（queryCount は問い合わせの数）', async () => {
    const world = createFakeWorld((index) => (index === 0 ? jsonResponse({}, 429) : jsonResponse(OK_BODY)))
    const client = createOverpassClient({ fetch: world.fetch, now: world.now, sleep: world.sleep })
    await client.query('q')
    expect(client.queryCount).toBe(1)
    expect(client.requestCount).toBe(2)
  })
})
