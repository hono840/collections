/**
 * SSR-safe low-level localStorage wrapper (architecture §4 — mirrors worldcup-kickoff).
 *
 * - `typeof window` guard makes it a no-op under SSR / non-browser environments.
 * - Reads are always validated with a zod schema; invalid / corrupt / stale-version data is
 *   swallowed and returns null, so a broken localStorage never crashes the app.
 */
import type { ZodType } from 'zod'

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

/** Validated read. Missing / JSON-corrupt / schema-mismatch all return null. */
export function getItem<T>(key: string, schema: ZodType<T>): T | null {
  if (!hasWindow()) return null

  let rawValue: string | null
  try {
    rawValue = window.localStorage.getItem(key)
  } catch {
    // SecurityError etc. (private mode)
    return null
  }
  if (rawValue === null) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(rawValue)
  } catch {
    return null
  }

  const result = schema.safeParse(parsed)
  return result.success ? result.data : null
}

/**
 * Write a value. Returns `true` on success and `false` when the write failed (quota etc.).
 * The boolean lets a caller surface the failure (use-local-storage → the quota banner, PRD 8.7);
 * callers that ignore the return keep the prior silent semantics. A no-op under SSR counts as
 * "nothing to surface" (`true`) — the failure signal is reserved for a real, attempted write.
 */
export function setItem<T>(key: string, value: T): boolean {
  if (!hasWindow()) return true
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // QuotaExceededError etc.: don't throw (keeps the prior stored value intact); report via boolean.
    return false
  }
}

/** Remove a value. */
export function removeItem(key: string): void {
  if (!hasWindow()) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignored
  }
}

export const safeStorage = {
  get: getItem,
  set: setItem,
  remove: removeItem,
}
