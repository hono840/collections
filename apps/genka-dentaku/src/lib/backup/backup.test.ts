import { describe, it, expect } from 'vitest'
import { DEFAULT_STATE } from '@/lib/storage/canonical-store'
import type { CanonicalState } from '@/lib/domain/schema'
import { buildExportEnvelope, serializeBackup, backupFilename, BACKUP_APP_MARKER } from './export-json'
import { parseBackup } from './import-json'

function sampleState(): CanonicalState {
  return {
    ...DEFAULT_STATE,
    ingredients: [
      {
        id: 'ing-1',
        name: '鶏もも肉',
        purchasePriceExTax: 900,
        inputPrice: 900,
        priceIncludesTax: false,
        taxRate: 8,
        purchaseQuantity: 1000,
        unit: 'g',
        dimension: 'weight',
        yieldPercent: 90,
        isSample: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    license: { key: 'GENKA-abc-def', lastSeenDate: '2026-07-09T00:00:00.000Z' },
  }
}

describe('export envelope', () => {
  it('wraps state with the app marker and an exportedAt timestamp', () => {
    const envelope = buildExportEnvelope(DEFAULT_STATE, new Date('2026-07-09T12:00:00.000Z'))
    expect(envelope.app).toBe(BACKUP_APP_MARKER)
    expect(envelope.exportedAt).toBe('2026-07-09T12:00:00.000Z')
    expect(envelope.state).toBe(DEFAULT_STATE)
  })

  it('includes the license key in the export (裁定4)', () => {
    const json = serializeBackup(sampleState(), new Date('2026-07-09T12:00:00.000Z'))
    expect(json).toContain('"key": "GENKA-abc-def"')
  })

  it('builds a dated filename', () => {
    expect(backupFilename(new Date('2026-07-09T12:00:00.000Z'))).toBe('genka-dentaku-backup-20260709.json')
  })
})

describe('parseBackup', () => {
  it('round-trips a valid export', () => {
    const original = sampleState()
    const json = serializeBackup(original)
    const result = parseBackup(json)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.ingredients).toHaveLength(1)
      expect(result.state.license.key).toBe('GENKA-abc-def')
    }
  })

  it('rejects unparseable text', () => {
    expect(parseBackup('{not json')).toEqual({ ok: false, error: 'parse' })
  })

  it('rejects a non-genka payload (wrong app marker)', () => {
    const foreign = JSON.stringify({ app: 'some-other-app', exportedAt: 'x', state: DEFAULT_STATE })
    expect(parseBackup(foreign)).toEqual({ ok: false, error: 'not-genka' })
  })

  it('rejects a payload with no app marker', () => {
    const bare = JSON.stringify({ state: DEFAULT_STATE })
    expect(parseBackup(bare)).toEqual({ ok: false, error: 'not-genka' })
  })

  it('rejects a future schemaVersion', () => {
    const future = JSON.stringify({
      app: BACKUP_APP_MARKER,
      exportedAt: 'x',
      state: { ...DEFAULT_STATE, schemaVersion: 2 },
    })
    expect(parseBackup(future)).toEqual({ ok: false, error: 'future' })
  })

  it('rejects a structurally invalid state', () => {
    const invalid = JSON.stringify({
      app: BACKUP_APP_MARKER,
      exportedAt: 'x',
      state: { schemaVersion: 1, garbage: true },
    })
    expect(parseBackup(invalid)).toEqual({ ok: false, error: 'invalid' })
  })
})
