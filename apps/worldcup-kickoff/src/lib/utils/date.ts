/**
 * 日付ユーティリティ。
 *
 * 方針: ホストOSのタイムゾーンに依存しない決定的な変換を行う。
 * - openfootball の現地時刻+オフセット（"13:00 UTC-6"）→ UTC ISO への変換は手計算。
 * - JST表示は Intl.DateTimeFormat({ timeZone: 'Asia/Tokyo' }) で抽出（ホスト非依存）。
 */
import { DISPLAY_TZ } from '@/lib/constants/tournament'

const JST_WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'] as const

/**
 * openfootball の "HH:mm UTC±N" 形式を分単位オフセットに分解する。
 * 例: "13:00 UTC-6" → { hour: 13, minute: 0, offsetMinutes: -360 }
 */
export function parseOffsetTime(time: string): {
  hour: number
  minute: number
  offsetMinutes: number
} {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s+UTC([+-]\d{1,2})(?::(\d{2}))?$/)
  if (!match) {
    throw new Error(`不正な時刻フォーマットです: "${time}"`)
  }
  const hour = Number(match[1])
  const minute = Number(match[2])
  const offsetHour = Number(match[3])
  const offsetMin = match[4] ? Number(match[4]) : 0
  const sign = offsetHour < 0 ? -1 : 1
  const offsetMinutes = offsetHour * 60 + sign * offsetMin
  return { hour, minute, offsetMinutes }
}

/**
 * 日付("2026-06-11")と現地時刻("13:00 UTC-6")を UTC の ISO 8601 文字列に変換する。
 * 例: 2026-06-11 + "13:00 UTC-6" → "2026-06-11T19:00:00.000Z"
 */
export function toUtcIso(date: string, time: string): string {
  const dateMatch = date.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!dateMatch) {
    throw new Error(`不正な日付フォーマットです: "${date}"`)
  }
  const year = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const day = Number(dateMatch[3])
  const { hour, minute, offsetMinutes } = parseOffsetTime(time)

  // 現地時刻を一旦UTCの瞬間として組み立て、オフセット分を引いて真のUTCにする。
  // 現地 = UTC + offset ⇒ UTC = 現地 - offset
  const localAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
  const utcMs = localAsUtcMs - offsetMinutes * 60_000
  return new Date(utcMs).toISOString()
}

/** Intl で JST のwall-clock構成要素を取り出す（ホスト非依存） */
function jstParts(iso: string): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  weekday: number
} {
  const d = new Date(iso)
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: DISPLAY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  })
  const parts: Record<string, string> = {}
  for (const p of fmt.formatToParts(d)) {
    parts[p.type] = p.value
  }
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  let hour = Number(parts.hour)
  // Intl は深夜0時を "24" で返す場合があるため正規化
  if (hour === 24) hour = 0
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
    weekday: weekdayMap[parts.weekday] ?? 0,
  }
}

/**
 * JST のキックオフ表示文字列を生成する。
 * 例: "2026-06-11T19:00:00.000Z" → "6月12日(金) 4:00"
 */
export function formatKickoffJST(iso: string): string {
  const { month, day, hour, minute, weekday } = jstParts(iso)
  const wd = JST_WEEKDAYS_JA[weekday]
  const mm = String(minute).padStart(2, '0')
  return `${month}月${day}日(${wd}) ${hour}:${mm}`
}

/**
 * JST の時刻のみ（例: "4:00"）。MatchCard 等での簡易表示用。
 */
export function formatTimeJST(iso: string): string {
  const { hour, minute } = jstParts(iso)
  return `${hour}:${String(minute).padStart(2, '0')}`
}

/**
 * JST の日付見出し（例: "6月12日(金)"）。日付グルーピングの見出し用。
 */
export function formatDateHeadingJST(iso: string): string {
  const { month, day, weekday } = jstParts(iso)
  return `${month}月${day}日(${JST_WEEKDAYS_JA[weekday]})`
}

/**
 * JST の日付キー（"YYYY-MM-DD"）。同一JST日でグルーピングするための安定キー。
 */
export function jstDateKey(iso: string): string {
  const { year, month, day } = jstParts(iso)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
