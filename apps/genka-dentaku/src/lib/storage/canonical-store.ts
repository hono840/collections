/**
 * Canonical persisted store — classification-aware load + quota-aware save (architecture §4.3).
 *
 * safe-storage's "corrupt -> null -> default" is not enough on its own: it can silently discard
 * user data. To honor C3 ("export the raw data, THEN reset safely") loadCanonicalState classifies
 * the stored value into empty / ok / future / corrupt so AppStateProvider can gate mutations and
 * drive the recovery dialog before anything overwrites a corrupt/future payload.
 */
import { canonicalStateSchema, CURRENT_SCHEMA_VERSION, type CanonicalState } from '@/lib/domain/schema'
import { STORAGE_KEY, STORAGE_BACKUP_KEY } from '@/lib/constants/storage-keys'
import { migrateToLatest } from './migrations'

/** Factory so every caller gets its own mutable copy (never share the module-level object). */
function makeDefaultState(): CanonicalState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    meta: { onboardingDone: false, sampleSeeded: false },
    settings: {
      alertWarnThreshold: 30,
      alertDangerThreshold: 35,
      defaultIngredientTaxRate: 8,
      defaultSellTaxRate: 10,
      defaultPriceIncludesTax: true,
      simRoundingUnit: 10,
      currency: 'JPY',
    },
    ingredients: [],
    menus: [],
    license: { key: null, lastSeenDate: null },
  }
}

/** The empty-start state. Treat as read-only; clone before mutating. */
export const DEFAULT_STATE: CanonicalState = makeDefaultState()

export type LoadResult =
  | { status: 'empty' } // no key (first run)
  | { status: 'ok'; state: CanonicalState } // validated (migrated if needed)
  | { status: 'future'; rawText: string } // stored version > current -> read-only / refuse
  | { status: 'corrupt'; rawText: string } // JSON / schema corruption

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

/** Raw read -> version peek -> migrate -> safeParse -> classify. Never throws. */
export function loadCanonicalState(): LoadResult {
  if (!hasWindow()) return { status: 'empty' }

  let rawText: string | null
  try {
    rawText = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage unreadable (private mode / SecurityError): behave like a fresh start.
    return { status: 'empty' }
  }
  if (rawText === null) return { status: 'empty' }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    return { status: 'corrupt', rawText }
  }

  // Version peek before migrating: a newer app wrote this -> refuse (don't destroy data).
  if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
    const version = (parsed as Record<string, unknown>).schemaVersion
    if (typeof version === 'number' && version > CURRENT_SCHEMA_VERSION) {
      return { status: 'future', rawText }
    }
  }

  const migrated = migrateToLatest(parsed)
  const result = canonicalStateSchema.safeParse(migrated)
  if (result.success) return { status: 'ok', state: result.data }
  return { status: 'corrupt', rawText }
}

/** Preserve corrupt/future raw content to the backup key BEFORE any overwrite (architecture §4.3). */
export function quarantineCorrupt(rawText: string): void {
  if (!hasWindow()) return
  try {
    window.localStorage.setItem(STORAGE_BACKUP_KEY, rawText)
  } catch {
    // Best-effort; nothing else to do if even the backup write fails.
  }
}

export type SaveResult = { ok: true } | { ok: false; error: 'quota' | 'unavailable' }

/**
 * Persist the canonical state, surfacing quota failure explicitly (PRD 8.7) instead of swallowing
 * it like safe-storage. The prior stored value is left untouched on failure (no partial write).
 */
export function saveCanonicalState(state: CanonicalState): SaveResult {
  if (!hasWindow()) return { ok: false, error: 'unavailable' }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return { ok: true }
  } catch (error) {
    if (isQuotaError(error)) return { ok: false, error: 'quota' }
    return { ok: false, error: 'unavailable' }
  }
}

function isQuotaError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  }
  return error instanceof Error && error.name === 'QuotaExceededError'
}

/** Reset to a fresh default state, persist it, and return the written value. */
export function resetCanonicalState(): CanonicalState {
  const fresh = makeDefaultState()
  saveCanonicalState(fresh)
  return fresh
}
