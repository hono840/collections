import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DRIVEN_ON_TOO_OLD_MESSAGE,
  MEMO_MAX_LENGTH,
  MEMO_TOO_LONG_MESSAGE,
  MIN_DRIVEN_ON,
  OVERALL_REQUIRED_MESSAGE,
  TRAFFIC_LEVELS,
  VEHICLE_TYPES,
  WEATHERS,
  driveInputSchema,
} from './drive'
import { FUTURE_DATE_MESSAGE, RATING_RANGE_MESSAGE, toFieldErrors } from './common'
import { emptyRoadInfoInput } from './road-info'

// Drive record input (architecture ch.8 drive.ts; architecture US-03 / PRD US-06).
// Contract (src/lib/validation/drive.ts):
//   VEHICLE_TYPES = ['car', 'motorcycle']                      (四輪 / 二輪)
//   WEATHERS = ['sunny', 'cloudy', 'rain', 'snow', 'other']    (晴 / 曇 / 雨 / 雪 / その他)
//   TRAFFIC_LEVELS = ['few', 'normal', 'many']                 (少 / 普通 / 多; a situation, not a score)
//   MIN_DRIVEN_ON = '2000-01-01', DRIVEN_ON_TOO_OLD_MESSAGE = '2000年1月1日以降の日付を選んでください' (PRD US-06)
//   OVERALL_REQUIRED_MESSAGE = '総合評価を選んでください' (M-14)
//   MEMO_MAX_LENGTH = 2000, MEMO_TOO_LONG_MESSAGE = '2000文字以内で入力してください' (PRD copy wins over ch.8)
//   driveInputSchema = z.object({
//     drivenOn: notFutureDateSchema + >= MIN_DRIVEN_ON,
//     vehicleType: enum | null, weather: enum | null, traffic: enum | null,
//     ratingOverall: number | null  -> null is "not selected" -> M-14; output is a non-null 1..5 integer
//     ratingScenery / ratingRoadSurface / ratingEaseOfDriving: 1..5 | null,
//     memo: string <= 2000 (default ''),
//     roadInfo: roadInfoInputSchema | null      (null -> no road_info row)
//   })
//   - roadId is NOT part of the input: createDrive(roadId, input) takes it separately and
//     updateDrive(driveId, input) never changes it (road_id is immutable).
//   - unknown keys (speed, time, user_id, roadId, ...) are stripped.
//   type DriveInput = z.input<typeof driveInputSchema>; type DriveValues = z.output<typeof driveInputSchema>

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-06T03:00:00Z')) // 2026-10-06 12:00 JST
})

afterEach(() => {
  vi.useRealTimers()
})

const validInput = {
  drivenOn: '2026-09-14',
  vehicleType: 'motorcycle' as const,
  weather: 'sunny' as const,
  ratingOverall: 4,
  ratingScenery: 5,
  ratingRoadSurface: null,
  ratingEaseOfDriving: 3,
  traffic: 'few' as const,
  memo: '紅葉がきれいだった',
  roadInfo: null,
}

function fieldErrorsOf(value: unknown) {
  const result = driveInputSchema.safeParse(value)
  if (result.success) throw new Error('expected a validation failure')
  return toFieldErrors(result.error)
}

describe('constants', () => {
  it('enums match the DB check constraints (00004)', () => {
    expect(VEHICLE_TYPES).toEqual(['car', 'motorcycle'])
    expect(WEATHERS).toEqual(['sunny', 'cloudy', 'rain', 'snow', 'other'])
    expect(TRAFFIC_LEVELS).toEqual(['few', 'normal', 'many'])
  })

  it('copy follows the PRD / UX microcopy', () => {
    expect(OVERALL_REQUIRED_MESSAGE).toBe('総合評価を選んでください')
    expect(MEMO_TOO_LONG_MESSAGE).toBe('2000文字以内で入力してください')
    expect(DRIVEN_ON_TOO_OLD_MESSAGE).toBe('2000年1月1日以降の日付を選んでください')
    expect(MIN_DRIVEN_ON).toBe('2000-01-01')
    expect(MEMO_MAX_LENGTH).toBe(2000)
  })
})

describe('driveInputSchema: valid input', () => {
  it('accepts a full record and keeps the values', () => {
    expect(driveInputSchema.parse(validInput)).toEqual(validInput)
  })

  it('only 走行日 and 総合 are required (every optional field null, memo defaults to "")', () => {
    const minimal = {
      drivenOn: '2026-10-06',
      vehicleType: null,
      weather: null,
      ratingOverall: 3,
      ratingScenery: null,
      ratingRoadSurface: null,
      ratingEaseOfDriving: null,
      traffic: null,
      roadInfo: null,
    }
    expect(driveInputSchema.parse(minimal)).toEqual({ ...minimal, memo: '' })
  })

  it('today (JST) is allowed', () => {
    expect(driveInputSchema.safeParse({ ...validInput, drivenOn: '2026-10-06' }).success).toBe(true)
  })

  it('2000-01-01 is allowed', () => {
    expect(driveInputSchema.safeParse({ ...validInput, drivenOn: '2000-01-01' }).success).toBe(true)
  })

  it('a 2000-character memo is allowed', () => {
    expect(driveInputSchema.safeParse({ ...validInput, memo: 'あ'.repeat(2000) }).success).toBe(true)
  })

  it('accepts a road info block', () => {
    const roadInfo = emptyRoadInfoInput()
    roadInfo.items.toll = { status: 'free', memo: '' }
    const parsed = driveInputSchema.parse({ ...validInput, roadInfo })
    expect(parsed.roadInfo?.items.toll).toEqual({ status: 'free', memo: '' })
  })
})

describe('driveInputSchema: errors', () => {
  it('総合 not selected (null) -> M-14 on ratingOverall', () => {
    expect(fieldErrorsOf({ ...validInput, ratingOverall: null })).toEqual({
      ratingOverall: [OVERALL_REQUIRED_MESSAGE],
    })
  })

  it('総合 missing entirely -> M-14 too', () => {
    const withoutOverall: Record<string, unknown> = { ...validInput }
    delete withoutOverall.ratingOverall
    expect(fieldErrorsOf(withoutOverall).ratingOverall).toEqual([OVERALL_REQUIRED_MESSAGE])
  })

  it.each([0, 6, 2.5, '4', -1])('総合 = %j sent directly to the server is rejected', (value) => {
    expect(fieldErrorsOf({ ...validInput, ratingOverall: value }).ratingOverall).toContain(RATING_RANGE_MESSAGE)
  })

  it.each(['ratingScenery', 'ratingRoadSurface', 'ratingEaseOfDriving'] as const)(
    '%s outside 1..5 is rejected',
    (field) => {
      for (const value of [0, 6, 1.5, '3']) {
        expect(fieldErrorsOf({ ...validInput, [field]: value })[field]).toContain(RATING_RANGE_MESSAGE)
      }
    },
  )

  it('走行日 tomorrow (JST) -> M-13', () => {
    expect(fieldErrorsOf({ ...validInput, drivenOn: '2026-10-07' })).toEqual({ drivenOn: [FUTURE_DATE_MESSAGE] })
  })

  it('走行日 before 2000-01-01 -> "2000年1月1日以降の日付を選んでください"', () => {
    expect(fieldErrorsOf({ ...validInput, drivenOn: '1999-12-31' })).toEqual({
      drivenOn: [DRIVEN_ON_TOO_OLD_MESSAGE],
    })
  })

  it('走行日 empty or malformed is an error on drivenOn', () => {
    expect(fieldErrorsOf({ ...validInput, drivenOn: '' }).drivenOn?.length).toBeGreaterThan(0)
    expect(fieldErrorsOf({ ...validInput, drivenOn: '2026-13-01' }).drivenOn?.length).toBeGreaterThan(0)
  })

  it('a 2001-character memo -> "2000文字以内で入力してください"', () => {
    expect(fieldErrorsOf({ ...validInput, memo: 'あ'.repeat(2001) })).toEqual({ memo: [MEMO_TOO_LONG_MESSAGE] })
  })

  it.each([
    ['vehicleType', 'truck'],
    ['weather', 'storm'],
    ['traffic', 'low'],
    ['traffic', 'high'],
  ])('%s = %j is not an allowed value', (field, value) => {
    expect(fieldErrorsOf({ ...validInput, [field]: value })[field]?.length).toBeGreaterThan(0)
  })

  it('reports several field errors at once (the form can show all of them)', () => {
    const fieldErrors = fieldErrorsOf({ ...validInput, ratingOverall: null, drivenOn: '2026-10-07', memo: 'x'.repeat(2001) })
    expect(Object.keys(fieldErrors).sort()).toEqual(['drivenOn', 'memo', 'ratingOverall'])
  })

  it('road info errors are nested under roadInfo.* paths', () => {
    const roadInfo = emptyRoadInfoInput()
    roadInfo.items.parking = { status: 'yes', memo: 'あ'.repeat(201) }
    expect(fieldErrorsOf({ ...validInput, roadInfo })).toEqual({
      'roadInfo.items.parking.memo': ['200文字以内で入力してください'],
    })
  })
})

describe('driveInputSchema: no speed / time / ranking data (PRD US-14)', () => {
  it('the schema has no speed / time / lap / ranking fields', () => {
    const keys = Object.keys(driveInputSchema.shape).join(' ')
    expect(keys).not.toMatch(/speed|time|lap|duration|rank|lean|速度|時刻|タイム|順位/i)
  })

  it('strips unknown keys a tampered client might send (speed, time, user_id, roadId, visibility)', () => {
    const parsed = driveInputSchema.parse({
      ...validInput,
      speed: 120,
      drivenAt: '2026-09-14T10:00:00Z',
      lapTime: 95,
      user_id: 'user-b',
      roadId: '11111111-2222-4333-8444-555555555555',
      visibility: 'public',
    })
    expect(Object.keys(parsed).sort()).toEqual(
      [
        'drivenOn',
        'memo',
        'ratingEaseOfDriving',
        'ratingOverall',
        'ratingRoadSurface',
        'ratingScenery',
        'roadInfo',
        'traffic',
        'vehicleType',
        'weather',
      ].sort(),
    )
  })
})
