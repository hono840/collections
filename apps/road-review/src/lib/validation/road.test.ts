import { describe, expect, it } from 'vitest'
import * as z from 'zod'
import { ROAD_TYPES, roadInputSchema } from './road'

// US-02 (architecture) / PRD US-04. Copy follows the UX microcopy table (M-10, M-11, M-12),
// which is the product source of truth for wording.
const NAME_REQUIRED = '道の名前を入力してください'
const NAME_TOO_LONG = '50文字以内で入力してください'
const PREFECTURE_REQUIRED = '都道府県を選んでください'
const START_REQUIRED = '地図を動かして開始地点のピンを置いてください'
const OUT_OF_JAPAN = '日本国内の位置を指定してください'

const validInput = {
  name: '碓氷峠',
  prefectureCode: 10,
  roadType: 'pass',
  start: { lat: 36.35, lng: 138.7 },
  end: null,
}

function fieldErrorsOf(input: unknown) {
  const result = roadInputSchema.safeParse(input)
  expect(result.success).toBe(false)
  if (result.success) return {}
  return z.flattenError(result.error).fieldErrors as Record<string, string[] | undefined>
}

describe('ROAD_TYPES', () => {
  it('has exactly the 5 storage values in display order (峠/スカイライン/海岸線/林道/その他)', () => {
    expect(ROAD_TYPES).toEqual(['pass', 'skyline', 'coastal', 'forest', 'other'])
  })
})

describe('roadInputSchema', () => {
  it('accepts a valid road and keeps the values', () => {
    const result = roadInputSchema.safeParse(validInput)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).toEqual(validInput)
  })

  describe('name', () => {
    it('is required', () => {
      expect(fieldErrorsOf({ ...validInput, name: '' }).name).toEqual([NAME_REQUIRED])
    })

    it('treats whitespace-only (incl. full-width spaces) as empty', () => {
      expect(fieldErrorsOf({ ...validInput, name: '   ' }).name).toEqual([NAME_REQUIRED])
      expect(fieldErrorsOf({ ...validInput, name: '　　' }).name).toEqual([NAME_REQUIRED])
    })

    it('trims surrounding spaces', () => {
      const result = roadInputSchema.parse({ ...validInput, name: '  碓氷峠  ' })
      expect(result.name).toBe('碓氷峠')
    })

    it('accepts exactly 50 characters', () => {
      const result = roadInputSchema.safeParse({ ...validInput, name: '道'.repeat(50) })
      expect(result.success).toBe(true)
    })

    it('rejects 51 characters with the M-11 message', () => {
      expect(fieldErrorsOf({ ...validInput, name: '道'.repeat(51) }).name).toEqual([NAME_TOO_LONG])
    })

    it('counts length after trimming (50 chars + spaces is fine)', () => {
      const result = roadInputSchema.safeParse({ ...validInput, name: ` ${'道'.repeat(50)} ` })
      expect(result.success).toBe(true)
    })
  })

  describe('prefectureCode', () => {
    it.each([1, 13, 47])('accepts %i', (code) => {
      expect(roadInputSchema.safeParse({ ...validInput, prefectureCode: code }).success).toBe(true)
    })

    it.each([
      ['null (not selected)', null],
      ['undefined', undefined],
      ['0', 0],
      ['48', 48],
      ['a fraction', 13.5],
      ['a string', '13'],
    ])('rejects %s with "都道府県を選んでください"', (_label, code) => {
      expect(fieldErrorsOf({ ...validInput, prefectureCode: code }).prefectureCode).toEqual([
        PREFECTURE_REQUIRED,
      ])
    })
  })

  describe('roadType', () => {
    it.each(['pass', 'skyline', 'coastal', 'forest', 'other'])('accepts %s', (roadType) => {
      expect(roadInputSchema.safeParse({ ...validInput, roadType }).success).toBe(true)
    })

    it('defaults to "other" when omitted', () => {
      const withoutType: Partial<typeof validInput> = { ...validInput }
      delete withoutType.roadType
      expect(roadInputSchema.parse(withoutType).roadType).toBe('other')
    })

    it.each(['forest_road', '林道', 'PASS', ''])('rejects unknown value %j', (roadType) => {
      expect(fieldErrorsOf({ ...validInput, roadType }).roadType).toBeDefined()
    })
  })

  describe('start pin', () => {
    it('is required: null gives the M-10 message', () => {
      expect(fieldErrorsOf({ ...validInput, start: null }).start).toEqual([START_REQUIRED])
    })

    it('reports all missing required fields at once', () => {
      const errors = fieldErrorsOf({ name: '', prefectureCode: null, roadType: 'other', start: null, end: null })
      expect(errors.name).toEqual([NAME_REQUIRED])
      expect(errors.prefectureCode).toEqual([PREFECTURE_REQUIRED])
      expect(errors.start).toEqual([START_REQUIRED])
    })

    it('rounds coordinates to 6 decimals', () => {
      const result = roadInputSchema.parse({
        ...validInput,
        start: { lat: 36.123456789, lng: 138.987654321 },
      })
      expect(result.start).toEqual({ lat: 36.123457, lng: 138.987654 })
    })

    it.each([
      ['lat 20 (south edge)', { lat: 20, lng: 136 }],
      ['lat 46 (north edge)', { lat: 46, lng: 142 }],
      ['lng 122 (west edge)', { lat: 24.4, lng: 122 }],
      ['lng 154 (east edge)', { lat: 24.3, lng: 154 }],
    ])('accepts the Japan bounding box boundary: %s', (_label, start) => {
      expect(roadInputSchema.safeParse({ ...validInput, start }).success).toBe(true)
    })

    it.each([
      ['lat 19.99', { lat: 19.99, lng: 136 }],
      ['lat 46.01', { lat: 46.01, lng: 142 }],
      ['lng 121.99', { lat: 24.4, lng: 121.99 }],
      ['lng 154.01', { lat: 24.3, lng: 154.01 }],
      ['Shanghai', { lat: 31.23, lng: 121.47 }],
    ])('rejects a point outside Japan: %s', (_label, start) => {
      expect(fieldErrorsOf({ ...validInput, start }).start).toEqual([OUT_OF_JAPAN])
    })

    it('rejects non-numeric coordinates', () => {
      expect(fieldErrorsOf({ ...validInput, start: { lat: '36', lng: 138 } }).start).toBeDefined()
      expect(fieldErrorsOf({ ...validInput, start: { lat: Number.NaN, lng: 138 } }).start).toBeDefined()
    })
  })

  describe('end pin', () => {
    it('is optional (null = cleared)', () => {
      const result = roadInputSchema.parse({ ...validInput, end: null })
      expect(result.end).toBeNull()
    })

    it('accepts a point in Japan and rounds it', () => {
      const result = roadInputSchema.parse({
        ...validInput,
        end: { lat: 36.40000049, lng: 138.6 },
      })
      expect(result.end).toEqual({ lat: 36.4, lng: 138.6 })
    })

    it('rejects a point outside Japan', () => {
      expect(fieldErrorsOf({ ...validInput, end: { lat: 10, lng: 138 } }).end).toEqual([OUT_OF_JAPAN])
    })

    it('rejects a half-filled pin (lat only)', () => {
      expect(fieldErrorsOf({ ...validInput, end: { lat: 36.4 } }).end).toBeDefined()
    })
  })

  it('strips unknown keys such as user_id / visibility (never trusted from the client)', () => {
    const result = roadInputSchema.parse({
      ...validInput,
      user_id: '00000000-0000-4000-8000-000000000000',
      userId: 'someone-else',
      visibility: 'public',
    })
    expect(result).not.toHaveProperty('user_id')
    expect(result).not.toHaveProperty('userId')
    expect(result).not.toHaveProperty('visibility')
  })
})
