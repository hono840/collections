import { describe, expect, it } from 'vitest'
import { todayInTokyo } from './date'

describe('todayInTokyo', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(todayInTokyo(new Date('2026-10-06T03:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('is still the previous day one second before JST midnight', () => {
    // 2026-10-06 23:59:59 JST
    expect(todayInTokyo(new Date('2026-10-06T14:59:59Z'))).toBe('2026-10-06')
  })

  it('switches to the next day exactly at JST midnight', () => {
    // 2026-10-07 00:00:00 JST
    expect(todayInTokyo(new Date('2026-10-06T15:00:00Z'))).toBe('2026-10-07')
  })

  it('is already the next day in JST while UTC is still the previous day', () => {
    // UTC 2026-12-31 20:00 = JST 2027-01-01 05:00 (year boundary)
    expect(todayInTokyo(new Date('2026-12-31T20:00:00Z'))).toBe('2027-01-01')
  })

  it('handles a leap day', () => {
    expect(todayInTokyo(new Date('2028-02-28T15:00:00Z'))).toBe('2028-02-29')
  })

  it('does not depend on the process time zone', () => {
    const original = process.env.TZ
    try {
      process.env.TZ = 'America/Los_Angeles'
      expect(todayInTokyo(new Date('2026-10-06T15:00:00Z'))).toBe('2026-10-07')
    } finally {
      process.env.TZ = original
    }
  })

  it('defaults to the current time', () => {
    expect(todayInTokyo()).toBe(todayInTokyo(new Date()))
  })
})
