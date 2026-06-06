import { describe, it, expect } from 'vitest'
import {
  parseOffsetTime,
  toUtcIso,
  formatKickoffJST,
  formatTimeJST,
  formatDateHeadingJST,
  jstDateKey,
} from './date'

describe('parseOffsetTime', () => {
  it('現地時刻+オフセットを分解する', () => {
    expect(parseOffsetTime('13:00 UTC-6')).toEqual({
      hour: 13,
      minute: 0,
      offsetMinutes: -360,
    })
    expect(parseOffsetTime('20:30 UTC-4')).toEqual({
      hour: 20,
      minute: 30,
      offsetMinutes: -240,
    })
  })

  it('プラスオフセットも解釈する', () => {
    expect(parseOffsetTime('18:00 UTC+3')).toEqual({
      hour: 18,
      minute: 0,
      offsetMinutes: 180,
    })
  })

  it('不正フォーマットはエラー', () => {
    expect(() => parseOffsetTime('hello')).toThrow()
  })
})

describe('toUtcIso', () => {
  it('13:00 UTC-6 → 19:00 UTC', () => {
    expect(toUtcIso('2026-06-11', '13:00 UTC-6')).toBe(
      '2026-06-11T19:00:00.000Z',
    )
  })

  it('日付をまたぐオフセット変換', () => {
    // 20:00 UTC-6 → 翌日 02:00 UTC
    expect(toUtcIso('2026-06-11', '20:00 UTC-6')).toBe(
      '2026-06-12T02:00:00.000Z',
    )
  })

  it('UTC-4 の変換', () => {
    // 12:00 UTC-4 → 16:00 UTC
    expect(toUtcIso('2026-06-18', '12:00 UTC-4')).toBe(
      '2026-06-18T16:00:00.000Z',
    )
  })
})

describe('JST フォーマット（ホスト非依存）', () => {
  // 開幕戦: 6/11 19:00 UTC = JST 6/12 04:00 (金)
  const opener = '2026-06-11T19:00:00.000Z'

  it('formatKickoffJST', () => {
    expect(formatKickoffJST(opener)).toBe('6月12日(金) 4:00')
  })

  it('formatTimeJST', () => {
    expect(formatTimeJST(opener)).toBe('4:00')
  })

  it('formatDateHeadingJST', () => {
    expect(formatDateHeadingJST(opener)).toBe('6月12日(金)')
  })

  it('jstDateKey', () => {
    expect(jstDateKey(opener)).toBe('2026-06-12')
  })

  it('UTC深夜をまたぐJST日付（6/12 20:00 UTC → JST 6/13 05:00）', () => {
    const iso = '2026-06-12T20:00:00.000Z'
    expect(jstDateKey(iso)).toBe('2026-06-13')
    expect(formatTimeJST(iso)).toBe('5:00')
  })
})
