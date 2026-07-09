import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import { getItem, setItem, removeItem } from './safe-storage'

const schema = z.object({ n: z.number(), s: z.string() })

describe('safe-storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('round-trips a validated value', () => {
    setItem('k', { n: 1, s: 'a' })
    expect(getItem('k', schema)).toEqual({ n: 1, s: 'a' })
  })

  it('returns null for a missing key', () => {
    expect(getItem('missing', schema)).toBeNull()
  })

  it('returns null for JSON-corrupt content (does not throw)', () => {
    window.localStorage.setItem('k', '{not valid json')
    expect(getItem('k', schema)).toBeNull()
  })

  it('returns null when the value fails schema validation', () => {
    window.localStorage.setItem('k', JSON.stringify({ n: 'oops' }))
    expect(getItem('k', schema)).toBeNull()
  })

  it('removes a value', () => {
    setItem('k', { n: 1, s: 'a' })
    removeItem('k')
    expect(getItem('k', schema)).toBeNull()
  })
})
