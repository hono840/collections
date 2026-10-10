// Overpass API client for the catalog extractor (ARCH v3 4.2, stage 5).
//
// Etiquette (fixed by the Overpass usage policy and the 2026-10-10 incident):
// - one request at a time, >= 5 s after the previous response
// - 429 / 504 / network errors / timeouts: wait 60 s, at most 2 retries, then give up (the caller stops the run)
// - at most 120 queries per run
// - the User-Agent is a FIXED constant. It must never contain personal data (mail addresses, names,
//   machine user names or values read from the environment). This module reads no environment at all.
//
// Everything that touches the outside world (fetch, clock, sleep) is injected so tests never hit the network.

export const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter'

export const USER_AGENT = 'road-review-catalog/0.1.0 (+https://github.com/hono840/collections)'

const RETRYABLE_STATUSES = new Set([429, 504])
const QUERY_HEADER = '[out:json][timeout:60];'
// Characters that would break out of a quoted Overpass QL string (or hide text in it).
const UNSAFE_NAME_CHARACTER = /["\\\p{Cc}\p{Cf}]/u

/** Error with a machine-readable `code`. */
export class OverpassError extends Error {
  /**
   * @param {'unsafe_user_agent' | 'query_budget_exceeded' | 'overpass_gave_up' | 'overpass_http_error' | 'invalid_recipe'} code
   * @param {string} message
   * @param {{ status?: number, cause?: unknown }} [details]
   */
  constructor(code, message, details = {}) {
    super(message, details.cause === undefined ? undefined : { cause: details.cause })
    this.name = 'OverpassError'
    this.code = code
    this.status = details.status
  }
}

/**
 * Throws unless the value is exactly USER_AGENT and has no '@'.
 * @param {unknown} value
 */
export function assertSafeUserAgent(value) {
  if (typeof value !== 'string' || value.length === 0 || value.includes('@') || value !== USER_AGENT) {
    throw new OverpassError('unsafe_user_agent', 'User-Agent must be the fixed constant and must not contain "@"')
  }
}

/**
 * @param {unknown} ids
 * @param {string} label
 * @returns {number[]}
 */
function idList(ids, label) {
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => Number.isSafeInteger(id) && id > 0)) {
    throw new OverpassError('invalid_recipe', `${label} must be a non-empty list of positive integers`)
  }
  return ids
}

/**
 * @param {unknown} bbox
 * @returns {number[]}
 */
function bboxList(bbox) {
  if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.every((value) => typeof value === 'number' && Number.isFinite(value))) {
    throw new OverpassError('invalid_recipe', 'nameQuery.bbox must be [south, west, north, east]')
  }
  const [south, west, north, east] = bbox
  if (south > north || west > east) throw new OverpassError('invalid_recipe', 'nameQuery.bbox must be [south, west, north, east]')
  return bbox
}

/**
 * Builds the single Overpass QL query for one road. Priority: relations > ways > nameQuery.
 * The same recipe always yields the same text (it is the cache key).
 * @param {{ relations?: number[], ways?: number[], nameQuery?: { name: string, bbox: number[] } }} osmRecipe
 * @returns {string}
 */
export function buildOverpassQuery(osmRecipe) {
  if (osmRecipe.relations !== undefined) {
    const relations = idList(osmRecipe.relations, 'relations')
    return `${QUERY_HEADER}\nrelation(id:${relations.join(',')});\nway(r);\nout geom tags;`
  }
  if (osmRecipe.ways !== undefined) {
    const ways = idList(osmRecipe.ways, 'ways')
    return `${QUERY_HEADER}\nway(id:${ways.join(',')});\nout geom tags;`
  }
  if (osmRecipe.nameQuery !== undefined) {
    const { name } = osmRecipe.nameQuery
    if (typeof name !== 'string' || name.length === 0 || name.length > 60 || UNSAFE_NAME_CHARACTER.test(name)) {
      throw new OverpassError('invalid_recipe', 'nameQuery.name has characters that cannot be used in a query')
    }
    const bbox = bboxList(osmRecipe.nameQuery.bbox)
    return `${QUERY_HEADER}\nway["highway"]["name"="${name}"](${bbox.join(',')});\nout geom tags;`
  }
  throw new OverpassError('invalid_recipe', 'osm recipe needs relations, ways or nameQuery')
}

/**
 * @typedef {(url: string, init: { method: string, headers: Record<string, string>, body: string, signal: AbortSignal }) => Promise<Response>} FetchLike
 */

/**
 * @param {{
 *   fetch: FetchLike,
 *   now: () => number,
 *   sleep: (ms: number) => Promise<void>,
 *   endpoint?: string,
 *   userAgent?: string,
 *   minIntervalMs?: number,
 *   timeoutMs?: number,
 *   maxRetries?: number,
 *   retryDelayMs?: number,
 *   maxQueries?: number,
 * }} options
 */
export function createOverpassClient({
  fetch,
  now,
  sleep,
  endpoint = OVERPASS_ENDPOINT,
  userAgent = USER_AGENT,
  minIntervalMs = 5000,
  timeoutMs = 90000,
  maxRetries = 2,
  retryDelayMs = 60000,
  maxQueries = 120,
}) {
  assertSafeUserAgent(userAgent)
  const headers = {
    'User-Agent': userAgent,
    'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    Accept: 'application/json',
  }

  let queryCount = 0
  let requestCount = 0
  /** @type {number | undefined} time the previous response (or failure) finished */
  let lastFinishedAt
  /** @type {Promise<unknown>} serializes queries: one in flight at a time */
  let queue = Promise.resolve()

  async function waitForSlot() {
    if (lastFinishedAt === undefined) return
    const waitMs = lastFinishedAt + minIntervalMs - now()
    if (waitMs > 0) await sleep(waitMs)
  }

  /**
   * One HTTP attempt. Returns the parsed body, or { retry: reason } for retryable failures.
   * @param {string} query
   * @returns {Promise<{ body: unknown } | { retry: string }>}
   */
  async function attempt(query) {
    await waitForSlot()
    requestCount += 1
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      let response
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: new URLSearchParams({ data: query }).toString(),
          signal: controller.signal,
        })
      } catch (error) {
        return { retry: controller.signal.aborted ? `timeout after ${timeoutMs} ms` : `network error: ${String(error)}` }
      }
      if (RETRYABLE_STATUSES.has(response.status)) return { retry: `HTTP ${response.status}` }
      if (!response.ok) {
        throw new OverpassError('overpass_http_error', `Overpass answered HTTP ${response.status}`, { status: response.status })
      }
      let body
      try {
        body = await response.json()
      } catch (error) {
        if (controller.signal.aborted) return { retry: `timeout after ${timeoutMs} ms` }
        throw new OverpassError('overpass_http_error', 'Overpass answered something that is not JSON', { cause: error })
      }
      // Overpass reports server-side timeouts / memory errors as HTTP 200 with a "remark".
      const remark = body && typeof body === 'object' && 'remark' in body ? String(body.remark) : ''
      if (/runtime error/i.test(remark)) return { retry: `runtime error: ${remark.slice(0, 120)}` }
      return { body }
    } finally {
      clearTimeout(timer)
      lastFinishedAt = now()
    }
  }

  /**
   * @param {string} query
   * @returns {Promise<any>}
   */
  async function runQuery(query) {
    if (queryCount >= maxQueries) {
      throw new OverpassError('query_budget_exceeded', `query budget of ${maxQueries} per run is used up`)
    }
    queryCount += 1
    let lastReason = ''
    for (let attemptIndex = 0; attemptIndex <= maxRetries; attemptIndex += 1) {
      if (attemptIndex > 0) await sleep(retryDelayMs)
      const result = await attempt(query)
      if ('body' in result) return result.body
      lastReason = result.retry
    }
    throw new OverpassError('overpass_gave_up', `Overpass gave up after ${maxRetries + 1} attempts (${lastReason})`)
  }

  return {
    /**
     * Sends one query (queued behind any query already running).
     * @param {string} query
     * @returns {Promise<any>}
     */
    query(query) {
      const result = queue.then(() => runQuery(query))
      queue = result.catch(() => undefined)
      return result
    },
    get queryCount() {
      return queryCount
    },
    get requestCount() {
      return requestCount
    },
    userAgent,
  }
}
