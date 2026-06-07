'use client'

import { useSyncExternalStore } from 'react'

/**
 * お気に入りのクライアント状態（localStorage 永続・コンポーネント間/タブ間同期）。
 * ref 形式は "manufacturer:model"。MVP はログイン不要（localStorage のみ）。
 */

const KEY = 'ck-favorites'
const listeners = new Set<() => void>()
let cache: string[] = []
let initialized = false

function read(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

function ensureInit() {
  if (initialized || typeof window === 'undefined') return
  cache = read()
  initialized = true
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      cache = read()
      emit()
    }
  })
}

function emit() {
  for (const l of listeners) l()
}

function persist(next: string[]) {
  cache = next
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
  emit()
}

export const favoritesStore = {
  subscribe(listener: () => void) {
    ensureInit()
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot(): string[] {
    ensureInit()
    return cache
  },
  getServerSnapshot(): string[] {
    return []
  },
  has(ref: string) {
    return cache.includes(ref)
  },
  toggle(ref: string) {
    if (cache.includes(ref)) persist(cache.filter((r) => r !== ref))
    else persist([...cache, ref])
  },
}

export function useFavorites(): string[] {
  return useSyncExternalStore(
    favoritesStore.subscribe,
    favoritesStore.getSnapshot,
    favoritesStore.getServerSnapshot
  )
}
