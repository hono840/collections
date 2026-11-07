import { describe, expect, it } from 'vitest'
import { emptyRoadInfoInput } from '@/lib/validation/road-info'
import { STALE_AFTER_DAYS, daysBetween, isStaleConfirmation, pickLatestRoadInfo } from './latest'

// Latest road info per item + staleness (PRD US-10 "最新の値" / 古い情報の警告; architecture US-04).
// Contract (src/lib/road-info/latest.ts, pure):
//   type RoadInfoRecord = { confirmedOn: string; createdAt: string; items: RoadInfoInput['items'] }
//     (one road_info row = one drive's snapshot; item status null = 記録しない)
//   pickLatestRoadInfo(records: RoadInfoRecord[]): LatestRoadInfo
//     LatestRoadInfo = Record<RoadInfoItem, { status; memo; confirmedOn } | null>  (key order = ROAD_INFO_ITEMS)
//     - per item, among records whose status for that item is non-null:
//       newest confirmedOn wins; ties -> newest createdAt. Input order does not matter.
//     - an item never recorded -> null (shown as 未記録, distinct from 不明)
//   daysBetween(fromIsoDate, toIsoDate): number   - calendar-day difference (to - from), time zone independent
//   STALE_AFTER_DAYS = 366
//   isStaleConfirmation(confirmedOn, today): boolean  - daysBetween(confirmedOn, today) >= 366

type Items = ReturnType<typeof emptyRoadInfoInput>['items']

function record(confirmedOn: string, createdAt: string, set: Partial<Items>) {
  return { confirmedOn, createdAt, items: { ...emptyRoadInfoInput().items, ...set } }
}

describe('pickLatestRoadInfo()', () => {
  it('no records -> every item null (未記録), keyed in display order', () => {
    const latest = pickLatestRoadInfo([])
    expect(Object.keys(latest)).toEqual([
      'motorcycleBan',
      'nightClosure',
      'winterClosure',
      'toll',
      'parking',
      'toilet',
      'michiNoEki',
      'observatory',
    ])
    expect(Object.values(latest).every((value) => value === null)).toBe(true)
  })

  it('PRD example: 2026-05-01 あり then 2026-09-01 なし -> なし (by confirmedOn, not by insert order)', () => {
    const older = record('2026-05-01', '2026-10-01T00:00:00Z', { motorcycleBan: { status: 'yes', memo: '' } })
    const newer = record('2026-09-01', '2026-09-02T00:00:00Z', { motorcycleBan: { status: 'no', memo: '' } })
    for (const records of [
      [older, newer],
      [newer, older],
    ]) {
      expect(pickLatestRoadInfo(records).motorcycleBan).toEqual({
        status: 'no',
        memo: '',
        confirmedOn: '2026-09-01',
      })
    }
  })

  it('same confirmedOn -> the newer createdAt wins', () => {
    const first = record('2026-09-01', '2026-09-01T01:00:00Z', { toll: { status: 'paid', memo: '500円' } })
    const second = record('2026-09-01', '2026-09-01T02:00:00Z', { toll: { status: 'free', memo: '' } })
    expect(pickLatestRoadInfo([second, first]).toll).toEqual({ status: 'free', memo: '', confirmedOn: '2026-09-01' })
    expect(pickLatestRoadInfo([first, second]).toll?.status).toBe('free')
  })

  it('decides per item: a newer record that skipped an item (記録しない) keeps the older value for it', () => {
    const older = record('2025-08-01', '2025-08-01T00:00:00Z', {
      nightClosure: { status: 'yes', memo: '22時〜6時' },
      parking: { status: 'yes', memo: '約20台' },
    })
    const newer = record('2026-09-12', '2026-09-12T00:00:00Z', { parking: { status: 'unknown', memo: '' } })

    const latest = pickLatestRoadInfo([newer, older])
    expect(latest.nightClosure).toEqual({ status: 'yes', memo: '22時〜6時', confirmedOn: '2025-08-01' })
    expect(latest.parking).toEqual({ status: 'unknown', memo: '', confirmedOn: '2026-09-12' })
    expect(latest.observatory).toBeNull()
  })

  it('不明 is a recorded value (not null)', () => {
    const latest = pickLatestRoadInfo([
      record('2026-09-12', '2026-09-12T00:00:00Z', { toilet: { status: 'unknown', memo: '' } }),
    ])
    expect(latest.toilet).toEqual({ status: 'unknown', memo: '', confirmedOn: '2026-09-12' })
    expect(latest.parking).toBeNull()
  })

  it('does not mutate the input', () => {
    const records = [
      record('2026-09-01', '2026-09-01T00:00:00Z', { toll: { status: 'free', memo: '' } }),
      record('2026-05-01', '2026-05-01T00:00:00Z', { toll: { status: 'paid', memo: '' } }),
    ]
    const snapshot = JSON.stringify(records)
    pickLatestRoadInfo(records)
    expect(JSON.stringify(records)).toBe(snapshot)
  })
})

describe('daysBetween()', () => {
  it.each([
    ['2026-10-06', '2026-10-06', 0],
    ['2026-10-05', '2026-10-06', 1],
    ['2025-10-06', '2026-10-06', 365],
    ['2025-10-05', '2026-10-06', 366],
    ['2027-03-01', '2028-03-01', 366], // crosses 2028-02-29
    ['2026-03-08', '2026-03-09', 1], // no DST effect
  ])('%s -> %s = %d days', (from, to, expected) => {
    expect(daysBetween(from, to)).toBe(expected)
  })

  it('is negative when "from" is after "to"', () => {
    expect(daysBetween('2026-10-07', '2026-10-06')).toBe(-1)
  })
})

describe('isStaleConfirmation() (366 days or more)', () => {
  it('threshold is 366 days', () => {
    expect(STALE_AFTER_DAYS).toBe(366)
  })

  it('PRD boundary with today 2026-10-06: 2025-10-06 (365 days) no warning, 2025-10-05 (366 days) warning', () => {
    expect(isStaleConfirmation('2025-10-06', '2026-10-06')).toBe(false)
    expect(isStaleConfirmation('2025-10-05', '2026-10-06')).toBe(true)
  })

  it('a leap day in between makes "exactly one calendar year ago" 366 days -> warning (as specified)', () => {
    expect(isStaleConfirmation('2027-03-01', '2028-03-01')).toBe(true)
  })

  it('recent dates are not stale', () => {
    expect(isStaleConfirmation('2026-10-06', '2026-10-06')).toBe(false)
    expect(isStaleConfirmation('2026-01-01', '2026-10-06')).toBe(false)
  })
})
