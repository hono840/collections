'use client'

import { useSyncExternalStore } from 'react'
import { MAX_COMPARE } from './data'

/**
 * 比較トレイのクライアント状態（localStorage 永続・タブ間/コンポーネント間同期）。
 * ref 形式は "manufacturer:model"（モデル単位）。比較ページで世代/グレードを既定解決する。
 */

const KEY = 'ck-compare'
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
    // ignore quota / unavailable
  }
  emit()
}

export const compareStore = {
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
  add(ref: string) {
    if (cache.includes(ref) || cache.length >= MAX_COMPARE) return
    persist([...cache, ref])
  },
  remove(ref: string) {
    persist(cache.filter((r) => r !== ref))
  },
  toggle(ref: string) {
    if (cache.includes(ref)) this.remove(ref)
    else this.add(ref)
  },
  clear() {
    persist([])
  },
}

export function useCompareList(): string[] {
  return useSyncExternalStore(
    compareStore.subscribe,
    compareStore.getSnapshot,
    compareStore.getServerSnapshot
  )
}
