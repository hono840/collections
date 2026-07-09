import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { STORAGE_KEY, STORAGE_BACKUP_KEY } from '@/lib/constants/storage-keys'
import {
  DEFAULT_STATE,
  loadCanonicalState,
  quarantineCorrupt,
  saveCanonicalState,
  resetCanonicalState,
} from './canonical-store'

function validStateJson(): string {
  return JSON.stringify(DEFAULT_STATE)
}

describe('DEFAULT_STATE', () => {
  it('matches the architecture §4.3 defaults', () => {
    expect(DEFAULT_STATE.schemaVersion).toBe(1)
    expect(DEFAULT_STATE.meta).toEqual({ onboardingDone: false, sampleSeeded: false })
    expect(DEFAULT_STATE.settings).toEqual({
      alertWarnThreshold: 30,
      alertDangerThreshold: 35,
      defaultIngredientTaxRate: 8,
      defaultSellTaxRate: 10,
      defaultPriceIncludesTax: true,
      simRoundingUnit: 10,
      currency: 'JPY',
    })
    expect(DEFAULT_STATE.ingredients).toEqual([])
    expect(DEFAULT_STATE.menus).toEqual([])
    expect(DEFAULT_STATE.license).toEqual({ key: null, lastSeenDate: null })
  })
})

describe('loadCanonicalState classification', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('empty: no stored key', () => {
    expect(loadCanonicalState()).toEqual({ status: 'empty' })
  })

  it('ok: a valid stored state parses', () => {
    window.localStorage.setItem(STORAGE_KEY, validStateJson())
    const result = loadCanonicalState()
    expect(result.status).toBe('ok')
    if (result.status === 'ok') expect(result.state.schemaVersion).toBe(1)
  })

  it('future: stored schemaVersion is newer than current', () => {
    const future = { ...DEFAULT_STATE, schemaVersion: 2 }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(future))
    const result = loadCanonicalState()
    expect(result.status).toBe('future')
    if (result.status === 'future') expect(result.rawText).toContain('"schemaVersion":2')
  })

  it('corrupt: unparseable JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{broken json')
    const result = loadCanonicalState()
    expect(result.status).toBe('corrupt')
    if (result.status === 'corrupt') expect(result.rawText).toBe('{broken json')
  })

  it('corrupt: valid JSON that fails the schema', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, garbage: true }))
    expect(loadCanonicalState().status).toBe('corrupt')
  })
})

describe('quarantineCorrupt', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('writes the raw text to the backup key before any overwrite of the main key', () => {
    const corrupt = '{corrupt-original'
    window.localStorage.setItem(STORAGE_KEY, corrupt)

    quarantineCorrupt(corrupt)

    // Backup holds the corrupt content, and the main key is still untouched at this point.
    expect(window.localStorage.getItem(STORAGE_BACKUP_KEY)).toBe(corrupt)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(corrupt)

    // A subsequent reset overwrites the main key but the backup is preserved.
    resetCanonicalState()
    expect(window.localStorage.getItem(STORAGE_BACKUP_KEY)).toBe(corrupt)
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBe(corrupt)
  })
})

describe('saveCanonicalState', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('persists and returns ok:true', () => {
    expect(saveCanonicalState(DEFAULT_STATE)).toEqual({ ok: true })
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(validStateJson())
  })

  it('returns {ok:false, error:quota} when setItem throws a QuotaExceededError', () => {
    const original = window.localStorage.getItem(STORAGE_KEY)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    const result = saveCanonicalState(DEFAULT_STATE)
    expect(result).toEqual({ ok: false, error: 'quota' })
    // Prior stored value is left untouched (no partial write).
    expect(original).toBeNull()
  })

  it('returns {ok:false, error:unavailable} for a non-quota write failure', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('nope', 'SecurityError')
    })
    expect(saveCanonicalState(DEFAULT_STATE)).toEqual({ ok: false, error: 'unavailable' })
  })
})

describe('resetCanonicalState', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('writes a fresh default state and returns it', () => {
    window.localStorage.setItem(STORAGE_KEY, '{corrupt')
    const fresh = resetCanonicalState()
    expect(fresh).toEqual(DEFAULT_STATE)
    expect(fresh).not.toBe(DEFAULT_STATE) // fresh copy, not the shared reference
    expect(loadCanonicalState()).toEqual({ status: 'ok', state: fresh })
  })
})
