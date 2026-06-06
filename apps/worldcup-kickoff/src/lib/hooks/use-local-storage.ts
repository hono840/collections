'use client'

/**
 * 型安全 + zod検証 + hydration安全な localStorage フック。
 *
 * 設計要点:
 * 1. useSyncExternalStore の getServerSnapshot は常に defaultValue を返し、
 *    サーバ・ハイドレーション時のレンダーを defaultValue で一致させる（hydration mismatch 回避）。
 * 2. クライアントの getSnapshot は localStorage を zod 検証して読む（破損/旧versionは defaultValue）。
 *    React 公式が示す「クライアント専用データを安全に扱う」エスケープハッチ。
 * 3. mounted は同じく useSyncExternalStore で算出（server=false / client=true）。
 *    未水和中のプレースホルダ表示を UI 側が選べる。
 * 4. setValue は localStorage に書き込み、同一タブ内の全リスナーへ通知して即時反映する。
 *
 * 値は JSON シリアライズ後の文字列をキャッシュし、参照同一性（getSnapshot の安定性）を保つ。
 */
import { useCallback, useSyncExternalStore } from 'react'
import type { ZodType } from 'zod'
import { safeStorage } from '@/lib/storage/safe-storage'

export interface UseLocalStorageResult<T> {
  value: T
  setValue: (next: T | ((prev: T) => T)) => void
  /** localStorage 読み込み済みかどうか（hydration ガード用） */
  mounted: boolean
}

/** キーごとのリスナー集合（同一タブ内同期用） */
const listeners = new Map<string, Set<() => void>>()

/** getSnapshot の参照安定化用キャッシュ（key → 直近の生文字列とパース済み値） */
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
  // 他タブからの変更も拾う
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
  // 値スナップショット（クライアント）。生文字列が前回と同じなら同一参照を返す。
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

  const subscribeFn = useCallback(
    (cb: () => void) => subscribe(key, cb),
    [key],
  )

  const value = useSyncExternalStore(
    subscribeFn,
    getSnapshot,
    getServerSnapshot,
  )

  // mounted: server=false / client=true。ハイドレーション後に true へ切り替わる。
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = getSnapshot()
      const resolved =
        typeof next === 'function' ? (next as (p: T) => T)(prev) : next
      safeStorage.set(key, resolved)
      // キャッシュを無効化して次回 getSnapshot で再読込させる
      snapshotCache.delete(key)
      notify(key)
    },
    [key, getSnapshot],
  )

  return { value, setValue, mounted }
}
