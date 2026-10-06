import { afterEach, describe, expect, it, vi } from 'vitest'
import * as z from 'zod'
import {
  DATE_FORMAT_MESSAGE,
  FUTURE_DATE_MESSAGE,
  RATING_RANGE_MESSAGE,
  isoDateSchema,
  notFutureDateSchema,
  optionalRatingSchema,
  ratingSchema,
  toFieldErrors,
  uuidSchema,
} from './common'

// Shared zod pieces (architecture ch.8, US-03 in architecture numbering / PRD US-06).
// Contract (src/lib/validation/common.ts):
//   DATE_FORMAT_MESSAGE = '日付の形式が正しくありません'
//   FUTURE_DATE_MESSAGE = '未来の日付は選べません'            (M-13)
//   RATING_RANGE_MESSAGE = '1〜5で選んでください'
//   isoDateSchema        - z.iso.date(): real calendar date in YYYY-MM-DD
//   notFutureDateSchema  - isoDateSchema + "<= todayInTokyo()" evaluated at parse time (JST, matches today_in_tokyo()).
//                          A malformed date yields ONLY the format issue (no extra "future" issue).
//   ratingSchema         - integer 1..5 (no coercion: '3' is rejected)
//   optionalRatingSchema - ratingSchema.nullable()
//   uuidSchema           - z.uuid()
//   toFieldErrors(error: z.ZodError): Record<string, string[]>
//                        - key = issue path joined with '.', e.g. 'roadInfo.items.toll.memo'
//                        - issues with an empty path go under '_form'
//                        - messages keep issue order; a key appears only when it has messages

afterEach(() => {
  vi.useRealTimers()
})

/** Freezes Date only (React / user-event timers stay real). */
function freezeNow(isoInstant: string) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(isoInstant))
}

function messagesOf(schema: z.ZodType, value: unknown): string[] {
  const result = schema.safeParse(value)
  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe('isoDateSchema', () => {
  it.each(['2026-10-06', '2000-01-01', '2028-02-29'])('accepts %s', (value) => {
    expect(isoDateSchema.safeParse(value).success).toBe(true)
  })

  it.each(['2026/10/06', '2026-10-6', '2026-02-30', '2027-02-29', '', '2026-10-06T00:00:00Z', 20261006, null])(
    'rejects %j with "日付の形式が正しくありません"',
    (value) => {
      expect(messagesOf(isoDateSchema, value)).toEqual([DATE_FORMAT_MESSAGE])
    },
  )

  it('uses the Japanese copy', () => {
    expect(DATE_FORMAT_MESSAGE).toBe('日付の形式が正しくありません')
  })
})

describe('notFutureDateSchema (JST today, M-13)', () => {
  it('copy is M-13', () => {
    expect(FUTURE_DATE_MESSAGE).toBe('未来の日付は選べません')
  })

  it('accepts today and past dates', () => {
    freezeNow('2026-10-06T03:00:00Z') // 12:00 JST
    expect(notFutureDateSchema.safeParse('2026-10-06').success).toBe(true)
    expect(notFutureDateSchema.safeParse('2026-10-05').success).toBe(true)
    expect(notFutureDateSchema.safeParse('2000-01-01').success).toBe(true)
  })

  it('rejects tomorrow (JST) with M-13', () => {
    freezeNow('2026-10-06T03:00:00Z')
    expect(messagesOf(notFutureDateSchema, '2026-10-07')).toEqual([FUTURE_DATE_MESSAGE])
  })

  it('at 23:59:59 JST, the next JST day is still the future', () => {
    freezeNow('2026-10-06T14:59:59Z') // 2026-10-06 23:59:59 JST
    expect(messagesOf(notFutureDateSchema, '2026-10-07')).toEqual([FUTURE_DATE_MESSAGE])
  })

  it('right after JST midnight, the new JST day is today even though UTC is still the previous day', () => {
    freezeNow('2026-10-06T15:00:00Z') // 2026-10-07 00:00:00 JST, UTC date 2026-10-06
    expect(notFutureDateSchema.safeParse('2026-10-07').success).toBe(true)
    expect(messagesOf(notFutureDateSchema, '2026-10-08')).toEqual([FUTURE_DATE_MESSAGE])
  })

  it('evaluates "today" at parse time, not at module load time', () => {
    freezeNow('2026-10-06T03:00:00Z')
    expect(notFutureDateSchema.safeParse('2026-10-07').success).toBe(false)
    vi.setSystemTime(new Date('2026-10-07T03:00:00Z'))
    expect(notFutureDateSchema.safeParse('2026-10-07').success).toBe(true)
  })

  it('a malformed date yields only the format error (no extra future error)', () => {
    freezeNow('2026-10-06T03:00:00Z')
    expect(messagesOf(notFutureDateSchema, '2026/10/06')).toEqual([DATE_FORMAT_MESSAGE])
    expect(messagesOf(notFutureDateSchema, '9999-99-99')).toEqual([DATE_FORMAT_MESSAGE])
  })
})

describe('ratingSchema (1..5)', () => {
  it('copy', () => {
    expect(RATING_RANGE_MESSAGE).toBe('1〜5で選んでください')
  })

  it.each([1, 2, 3, 4, 5])('accepts %d', (value) => {
    expect(ratingSchema.parse(value)).toBe(value)
  })

  it.each([0, 6, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY, '3', null, undefined, true])(
    'rejects %j (direct server calls included)',
    (value) => {
      const messages = messagesOf(ratingSchema, value)
      expect(messages.length).toBeGreaterThan(0)
      expect(messages).toContain(RATING_RANGE_MESSAGE)
    },
  )
})

describe('optionalRatingSchema', () => {
  it('accepts null (not rated) and 1..5', () => {
    expect(optionalRatingSchema.parse(null)).toBeNull()
    expect(optionalRatingSchema.parse(5)).toBe(5)
  })

  it.each([0, 6, 3.5, '2'])('still rejects %j', (value) => {
    expect(optionalRatingSchema.safeParse(value).success).toBe(false)
  })
})

describe('uuidSchema', () => {
  it('accepts a v4 uuid and rejects junk', () => {
    expect(uuidSchema.safeParse('6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b').success).toBe(true)
    for (const value of ['', 'not-a-uuid', '../etc', '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5bx']) {
      expect(uuidSchema.safeParse(value).success).toBe(false)
    }
  })
})

describe('toFieldErrors()', () => {
  const schema = z
    .object({
      drivenOn: z.string().min(1, { error: 'A' }),
      roadInfo: z.object({
        confirmedOn: z.string().min(1, { error: 'B' }),
        items: z.object({ toll: z.object({ memo: z.string().max(1, { error: 'C' }) }) }),
      }),
    })
    .refine(() => false, { error: 'ROOT' })

  function errorOf(value: unknown): z.ZodError {
    const result = schema.safeParse(value)
    if (result.success) throw new Error('expected failure')
    return result.error
  }

  it('joins nested paths with "." (nested road info errors stay addressable)', () => {
    const fieldErrors = toFieldErrors(
      errorOf({ drivenOn: '', roadInfo: { confirmedOn: '', items: { toll: { memo: 'xx' } } } }),
    )
    expect(fieldErrors).toMatchObject({
      drivenOn: ['A'],
      'roadInfo.confirmedOn': ['B'],
      'roadInfo.items.toll.memo': ['C'],
    })
  })

  it('puts issues with an empty path under "_form"', () => {
    const fieldErrors = toFieldErrors(
      errorOf({ drivenOn: 'x', roadInfo: { confirmedOn: 'x', items: { toll: { memo: '' } } } }),
    )
    expect(fieldErrors).toEqual({ _form: ['ROOT'] })
  })

  it('collects several messages for one path in order', () => {
    const multi = z.string().min(3, { error: 'short' }).regex(/^\d+$/, { error: 'digits' })
    const result = z.object({ code: multi }).safeParse({ code: 'a' })
    if (result.success) throw new Error('expected failure')
    expect(toFieldErrors(result.error)).toEqual({ code: ['short', 'digits'] })
  })
})
