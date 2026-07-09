'use client'

/**
 * Type-safe + zod-validated + hydration-safe localStorage hook (architecture §4.4 — mirrors
 * worldcup-kickoff/src/lib/hooks/use-local-storage.ts).
 *
 * 1. useSyncExternalStore's getServerSnapshot always returns defaultValue so server and hydration
 *    renders agree on defaultValue (no hydration mismatch).
 * 2. The client getSnapshot reads localStorage through zod (corrupt/stale -> defaultValue). This is
 *    the React-sanctioned escape hatch for client-only data.
 * 3. mounted is derived the same way (server=false / client=true) so the UI can show a placeholder
 *    until hydration completes.
 * 4. setValue writes to localStorage and notifies every same-tab listener for instant reflection.
 *
 * The raw JSON string is cached to keep getSnapshot referentially stable.
 */
import { useCallback, useSyncExternalStore } from 'react'
import type { ZodType } from 'zod'
import { safeStorage } from '@/lib/storage/safe-storage'

export interface UseLocalStorageResult<T> {
  value: T
  setValue: (next: T | ((prev: T) => T)) => void
  /** Whether localStorage has been read (hydration guard). */
  mounted: boolean
}

/** Per-key listener sets (same-tab sync). */
const listeners = new Map<string, Set<() => void>>()

/** getSnapshot stability cache (key -> last raw string + parsed value). */
const snapshotCache = new Map<string, { raw: string | null; value: unknown }>()

function getListeners(key: string): Set<() => void> {
  let set = listeners.get(key)
  if (!set) {
    set = new Set()
    listeners.set(key, set)
  }
  return set
}

function notify(key: string): void {
  const set = listeners.get(key)
  if (set) {
    for (const fn of set) fn()
  }
}

function subscribe(key: string, callback: () => void): () => void {
  const set = getListeners(key)
  set.add(callback)
  // Also pick up changes from other tabs.
  const onStorage = (e: StorageEvent) => {
    if (e.key === key) callback()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage)
  }
  return () => {
    set.delete(callback)
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage)
    }
  }
}

export function useLocalStorage<T>(
  key: string,
  schema: ZodType<T>,
  defaultValue: T,
): UseLocalStorageResult<T> {
  // Client value snapshot. Returns the same reference when the raw string is unchanged.
  const getSnapshot = useCallback((): T => {
    const raw =
      typeof window !== 'undefined'
        ? (() => {
            try {
              return window.localStorage.getItem(key)
            } catch {
              return null
            }
          })()
        : null

    const cached = snapshotCache.get(key)
    if (cached && cached.raw === raw) {
      return cached.value as T
    }

    const parsed = raw === null ? defaultValue : safeStorage.get(key, schema) ?? defaultValue
    snapshotCache.set(key, { raw, value: parsed })
    return parsed
  }, [key, schema, defaultValue])

  const getServerSnapshot = useCallback((): T => defaultValue, [defaultValue])

  const subscribeFn = useCallback((cb: () => void) => subscribe(key, cb), [key])

  const value = useSyncExternalStore(subscribeFn, getSnapshot, getServerSnapshot)

  // mounted: server=false / client=true. Flips to true after hydration.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = getSnapshot()
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
      safeStorage.set(key, resolved)
      // Invalidate the cache so the next getSnapshot re-reads.
      snapshotCache.delete(key)
      notify(key)
    },
    [key, getSnapshot],
  )

  return { value, setValue, mounted }
}
