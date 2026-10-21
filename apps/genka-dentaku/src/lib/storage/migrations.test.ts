import { describe, it, expect } from 'vitest'
import { MIGRATIONS, migrateToLatest } from './migrations'

describe('migrateToLatest', () => {
  it('has no migrations registered at v1', () => {
    expect(Object.keys(MIGRATIONS)).toHaveLength(0)
  })

  it('returns a current-version object unchanged', () => {
    const raw = { schemaVersion: 1, foo: 'bar' }
    expect(migrateToLatest(raw)).toBe(raw)
  })

  it('returns an unknown/future version unchanged (downstream validation classifies it)', () => {
    const raw = { schemaVersion: 99, foo: 'bar' }
    expect(migrateToLatest(raw)).toBe(raw)
  })

  it('returns an object with no version unchanged', () => {
    const raw = { foo: 'bar' }
    expect(migrateToLatest(raw)).toBe(raw)
  })

  it('passes non-object inputs through untouched', () => {
    expect(migrateToLatest(null)).toBeNull()
    expect(migrateToLatest('str')).toBe('str')
    expect(migrateToLatest(42)).toBe(42)
    const arr = [1, 2, 3]
    expect(migrateToLatest(arr)).toBe(arr)
  })
})
