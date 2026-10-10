// Content-addressed cache of raw Overpass responses (ARCH v3 4.2 cache row).
// <dir>/<roadId>/<sha256(query)>.json = { query, fetchedAt, timestampOsmBase, response }
// Entries older than 90 days are ignored so a seasonal re-run asks Overpass again.
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const CACHE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000

const CATALOG_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * @param {string} query
 * @returns {string} SHA-256 hex of the query text
 */
export function queryHash(query) {
  return createHash('sha256').update(query, 'utf8').digest('hex')
}

/**
 * @param {string} roadId
 */
function assertRoadId(roadId) {
  if (typeof roadId !== 'string' || roadId.length > 60 || !CATALOG_ID.test(roadId)) {
    throw new Error(`invalid road id for the cache: ${JSON.stringify(roadId)}`)
  }
}

/**
 * @typedef {{ query: string, fetchedAt: string, timestampOsmBase: string | null, response: any }} CacheEntry
 */

/**
 * @param {{ dir: string, now: () => number, maxAgeMs?: number }} options
 */
export function createQueryCache({ dir, now, maxAgeMs = CACHE_MAX_AGE_MS }) {
  /**
   * @param {string} roadId
   * @param {string} query
   * @returns {string}
   */
  function pathFor(roadId, query) {
    assertRoadId(roadId)
    return path.join(dir, roadId, `${queryHash(query)}.json`)
  }

  return {
    pathFor,

    /**
     * @param {string} roadId
     * @param {string} query
     * @returns {Promise<CacheEntry | undefined>}
     */
    async read(roadId, query) {
      const file = pathFor(roadId, query)
      let entry
      try {
        entry = JSON.parse(await readFile(file, 'utf8'))
      } catch {
        return undefined
      }
      if (!entry || typeof entry !== 'object' || entry.query !== query || typeof entry.fetchedAt !== 'string') return undefined
      const fetchedAt = Date.parse(entry.fetchedAt)
      if (!Number.isFinite(fetchedAt) || now() - fetchedAt > maxAgeMs) return undefined
      return {
        query: entry.query,
        fetchedAt: entry.fetchedAt,
        timestampOsmBase: entry.timestampOsmBase ?? null,
        response: entry.response,
      }
    },

    /**
     * @param {string} roadId
     * @param {string} query
     * @param {any} response
     * @returns {Promise<void>}
     */
    async write(roadId, query, response) {
      const file = pathFor(roadId, query)
      const timestampOsmBase = response?.osm3s?.timestamp_osm_base ?? null
      const entry = { query, fetchedAt: new Date(now()).toISOString(), timestampOsmBase, response }
      await mkdir(path.dirname(file), { recursive: true })
      // Write then rename so an interrupted run never leaves a half-written entry.
      const temporaryFile = `${file}.tmp`
      await writeFile(temporaryFile, `${JSON.stringify(entry)}\n`, 'utf8')
      await rename(temporaryFile, file)
    },
  }
}

/**
 * Returns the cached response when fresh, otherwise asks the client and stores the answer.
 * Failed queries are never cached.
 * @param {{
 *   cache: ReturnType<typeof createQueryCache>,
 *   client: { query: (query: string) => Promise<any> },
 *   roadId: string,
 *   query: string,
 *   refresh?: boolean,
 * }} options
 * @returns {Promise<{ response: any, fromCache: boolean }>}
 */
export async function cachedQuery({ cache, client, roadId, query, refresh = false }) {
  if (!refresh) {
    const entry = await cache.read(roadId, query)
    if (entry) return { response: entry.response, fromCache: true }
  }
  const response = await client.query(query)
  await cache.write(roadId, query, response)
  return { response, fromCache: false }
}
