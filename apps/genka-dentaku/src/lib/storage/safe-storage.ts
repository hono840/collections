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

/** Write a value. Failures (quota etc.) are swallowed. */
export function setItem<T>(key: string, value: T): void {
  if (!hasWindow()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // QuotaExceededError etc. ignored (canonical-store.saveCanonicalState surfaces quota explicitly)
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
