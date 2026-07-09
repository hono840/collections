/**
 * JSON backup import (PRD 4.g / 8.9 — Free). Validation order:
 *   parse -> envelope app marker -> future-version guard -> migrate -> schema validate.
 * Every failure is a typed result (never throws), and the caller keeps current data on failure.
 */
import { canonicalStateSchema, CURRENT_SCHEMA_VERSION, type CanonicalState } from '@/lib/domain/schema'
import { migrateToLatest } from '@/lib/storage/migrations'
import { BACKUP_APP_MARKER } from './export-json'

export type ImportError = 'parse' | 'not-genka' | 'future' | 'invalid'

export type ImportResult = { ok: true; state: CanonicalState } | { ok: false; error: ImportError }

/** Parse + validate a backup file's text into a CanonicalState (or a typed error). */
export function parseBackup(text: string): ImportResult {
  let envelope: unknown
  try {
    envelope = JSON.parse(text)
  } catch {
    return { ok: false, error: 'parse' }
  }

  if (typeof envelope !== 'object' || envelope === null || Array.isArray(envelope)) {
    return { ok: false, error: 'not-genka' }
  }
  const record = envelope as Record<string, unknown>
  if (record.app !== BACKUP_APP_MARKER) {
    return { ok: false, error: 'not-genka' }
  }

  const rawState = record.state

  // Future-version guard: refuse data written by a newer app (avoid destructive downgrade).
  if (typeof rawState === 'object' && rawState !== null && !Array.isArray(rawState)) {
    const version = (rawState as Record<string, unknown>).schemaVersion
    if (typeof version === 'number' && version > CURRENT_SCHEMA_VERSION) {
      return { ok: false, error: 'future' }
    }
  }

  const migrated = migrateToLatest(rawState)
  const result = canonicalStateSchema.safeParse(migrated)
  if (!result.success) return { ok: false, error: 'invalid' }
  return { ok: true, state: result.data }
}
