/**
 * SSR安全な localStorage 低レベルラッパ。
 *
 * - typeof window ガードで SSR / 非ブラウザ環境では何もしない。
 * - 読み出しは zod スキーマで必ず検証し、不正・破損・旧バージョンは握り潰して null を返す。
 *   これにより壊れた localStorage がアプリをクラッシュさせない。
 */
import type { ZodType } from 'zod'

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

/**
 * 検証付きで値を取得する。存在しない・JSON破損・スキーマ不一致は null。
 */
export function getItem<T>(key: string, schema: ZodType<T>): T | null {
  if (!hasWindow()) return null

  let rawValue: string | null
  try {
    rawValue = window.localStorage.getItem(key)
  } catch {
    // SecurityError 等（プライベートモード等）
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
 * 値を保存する。失敗（容量超過等）は握り潰す。
 */
export function setItem<T>(key: string, value: T): void {
  if (!hasWindow()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // QuotaExceededError 等は無視
  }
}

/**
 * 値を削除する。
 */
export function removeItem(key: string): void {
  if (!hasWindow()) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // 無視
  }
}

export const safeStorage = {
  get: getItem,
  set: setItem,
  remove: removeItem,
}
