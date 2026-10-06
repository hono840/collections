import * as z from 'zod'
import { todayInTokyo } from '@/lib/utils/date'

// Shared zod pieces (architecture ch.8). Used by both the forms (client) and the Server Actions.

export const DATE_FORMAT_MESSAGE = '日付の形式が正しくありません'
export const FUTURE_DATE_MESSAGE = '未来の日付は選べません' // M-13
export const RATING_RANGE_MESSAGE = '1〜5で選んでください'

/**
 * A real calendar date as YYYY-MM-DD.
 * abort: a malformed value stops here, so later refinements (future / too old) never add a second issue.
 */
export const isoDateSchema = z.iso.date({ error: DATE_FORMAT_MESSAGE, abort: true })

/** isoDateSchema + "not after today in Japan". todayInTokyo() is evaluated at parse time (matches today_in_tokyo()). */
export const notFutureDateSchema = isoDateSchema.refine((value) => value <= todayInTokyo(), {
  error: FUTURE_DATE_MESSAGE,
})

/** Integer 1..5. No coercion: '3' is rejected (direct server calls included). */
export const ratingSchema = z
  .number({ error: RATING_RANGE_MESSAGE })
  .int({ error: RATING_RANGE_MESSAGE })
  .min(1, { error: RATING_RANGE_MESSAGE })
  .max(5, { error: RATING_RANGE_MESSAGE })

/** null = not rated. */
export const optionalRatingSchema = ratingSchema.nullable()

export const uuidSchema = z.uuid()

/** Root-level issues (empty path) are collected under this key. */
export const FORM_ERROR_KEY = '_form'

/**
 * Flattens zod issues into `{ 'roadInfo.items.toll.memo': [...] }`.
 * Unlike z.flattenError, nested paths stay addressable (joined with '.').
 */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.length === 0 ? FORM_ERROR_KEY : issue.path.map((segment) => String(segment)).join('.')
    ;(fieldErrors[key] ??= []).push(issue.message)
  }
  return fieldErrors
}
