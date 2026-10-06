const tokyoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Returns the calendar date in Japan (Asia/Tokyo) as `YYYY-MM-DD`,
 * independent of the server/browser time zone. Used as the upper bound
 * for "no future dates" checks so it matches the DB's today_in_tokyo().
 */
export function todayInTokyo(now: Date = new Date()): string {
  const parts = tokyoDateFormatter.formatToParts(now)
  const pick = (type: 'year' | 'month' | 'day') =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${pick('year')}-${pick('month')}-${pick('day')}`
}
