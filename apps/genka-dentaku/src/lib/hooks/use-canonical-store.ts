'use client'

/**
 * CanonicalState persisted store (architecture §4.4). A thin wrapper over useLocalStorage that
 * layers migration on top via z.preprocess: stale versions auto-migrate, corrupt data fails
 * validation and falls back to DEFAULT_STATE (silent-fallback contract unchanged).
 *
 * Corrupt/future CLASSIFICATION is handled separately by canonical-store.loadCanonicalState and
 * gated in AppStateProvider — this reactive store keeps the hydration-safe, cross-tab-synced,
 * referentially-stable read path.
 */
import { z } from 'zod'
import { canonicalStateSchema, type CanonicalState } from '@/lib/domain/schema'
import { STORAGE_KEY } from '@/lib/constants/storage-keys'
import { DEFAULT_STATE } from '@/lib/storage/canonical-store'
import { migrateToLatest } from '@/lib/storage/migrations'
import { useLocalStorage } from './use-local-storage'

// Migration-aware validation schema (architecture §4.4).
const migratingSchema = z.preprocess(migrateToLatest, canonicalStateSchema) as unknown as z.ZodType<CanonicalState>

export interface UseCanonicalStoreResult {
  state: CanonicalState
  setState: (next: CanonicalState | ((prev: CanonicalState) => CanonicalState)) => void
  mounted: boolean
}

export function useCanonicalStore(): UseCanonicalStoreResult {
  const { value, setValue, mounted } = useLocalStorage(STORAGE_KEY, migratingSchema, DEFAULT_STATE)
  return { state: value, setState: setValue, mounted }
}
