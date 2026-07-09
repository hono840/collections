/**
 * Schema migrations (architecture §4.2 / PRD 9.3).
 *
 * Strategy: additive default-backfill is the norm; only breaking changes bump the version.
 * MIGRATIONS is empty at v1. Imports (§4.4 / backup import-json) flow through the same path.
 *
 * migrateToLatest is deliberately non-throwing: anything it cannot upgrade (unknown / missing /
 * future version, non-object, array) is returned UNCHANGED so the downstream zod validation
 * classifies it (ok / future / corrupt) — see canonical-store.loadCanonicalState.
 */
export type Migration = (raw: Record<string, unknown>) => Record<string, unknown>

/**
 * from-version -> function that upgrades to the next version. Empty at v1.
 * Future example:
 *   1: (raw) => ({ ...raw, schemaVersion: 2, settings: { ...(raw.settings as object), newField: 0 } })
 */
export const MIGRATIONS: Record<number, Migration> = {}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Apply migrations in ascending version order until no further migration applies. */
export function migrateToLatest(raw: unknown): unknown {
  if (!isPlainObject(raw)) return raw

  let current = raw
  // Only advance while the current version has a registered migration.
  while (typeof current.schemaVersion === 'number' && MIGRATIONS[current.schemaVersion]) {
    const migrate = MIGRATIONS[current.schemaVersion]
    const next = migrate(current)
    // Guard against a no-progress migration to avoid an infinite loop.
    if (!isPlainObject(next) || next.schemaVersion === current.schemaVersion) return next
    current = next
  }
  return current
}
