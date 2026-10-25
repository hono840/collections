import { isNewerVersionNumber, isNewerVersionValue, parseIsoDateTime, parseSpotsValue } from './storage'
import type { SpotsData } from './types'

// Backup files: export, import checks and the reminder (spec AC32-AC38). Pure functions; dates are
// read in the device's local calendar, never in UTC.

/** Files above this size are refused before they are read (AC34). */
export const BACKUP_FILE_MAX_BYTES = 1_000_000
/** The list marks the backup button from this many calendar days after the last export (AC38). */
export const BACKUP_REMINDER_DAYS = 30
export const BACKUP_FILE_MIME_TYPE = 'application/json'

const BACKUP_APP_NAME = 'drive-spots'
const BACKUP_FORMAT_VERSION = 1
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

/** What reminder the list's backup button shows (AC38). */
export type BackupReminder = 'none' | 'never' | 'stale'

/**
 * The file content (AC32): { app, backupVersion, exportedAt, data } as JSON indented with 2 spaces.
 * exportedAt is Date#toISOString; data is written as it is (nextId, ids and order included).
 */
export function createBackupFileContent(data: SpotsData, exportedAt: Date): string {
  const backupFile = {
    app: BACKUP_APP_NAME,
    backupVersion: BACKUP_FORMAT_VERSION,
    exportedAt: exportedAt.toISOString(),
    data,
  }
  return `${JSON.stringify(backupFile, null, 2)}\n`
}

function padToTwoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

/** `drive-spots-YYYY-MM-DD.json` with the device's calendar date (AC32). */
export function backupFileName(exportedAt: Date): string {
  const year = exportedAt.getFullYear()
  const month = padToTwoDigits(exportedAt.getMonth() + 1)
  const day = padToTwoDigits(exportedAt.getDate())
  return `drive-spots-${year}-${month}-${day}.json`
}

export type ParsedBackupFile =
  | { kind: 'ok'; data: SpotsData; exportedAt: Date }
  | { kind: 'newer' }
  | { kind: 'invalid' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Checks a chosen file's text before anything changes (AC34).
 * - not JSON / not an object / app is not 'drive-spots' -> invalid
 * - backupVersion or data.version is a safe integer above 1 -> newer (checked before the strict
 *   checks, so a newer file is never called broken)
 * - backupVersion is not 1 / exportedAt is not a time / data fails parseSpotsValue (AC14) -> invalid
 */
export function parseBackupFile(text: string): ParsedBackupFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { kind: 'invalid' }
  }
  if (!isRecord(parsed) || parsed.app !== BACKUP_APP_NAME) return { kind: 'invalid' }
  if (isNewerVersionNumber(parsed.backupVersion) || isNewerVersionValue(parsed.data)) return { kind: 'newer' }
  if (parsed.backupVersion !== BACKUP_FORMAT_VERSION) return { kind: 'invalid' }
  const exportedAt = parseIsoDateTime(parsed.exportedAt)
  const data = parseSpotsValue(parsed.data)
  if (exportedAt === null || data === null) return { kind: 'invalid' }
  return { kind: 'ok', data, exportedAt }
}

/** Midnight UTC of the date's local calendar day, so a day is one day long even across DST. */
function calendarDayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MILLISECONDS_PER_DAY
}

/**
 * Calendar days from `from` to `to` in the device's calendar: 23:59 -> 00:01 is 1 day (AC33).
 * A `from` in the future (a clock moved back) counts as 0.
 */
export function calendarDaysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round(calendarDayNumber(to) - calendarDayNumber(from)))
}

/** '2026年10月25日' in the device's calendar, without leading zeros (AC33, AC35). */
export function formatCalendarDate(at: Date): string {
  return `${at.getFullYear()}年${at.getMonth() + 1}月${at.getDate()}日`
}

/** '2026年10月25日（今日）' / '2026年10月20日（5日前）' (AC33). */
export function formatBackupDate(at: Date, now: Date): string {
  const daysAgo = calendarDaysBetween(at, now)
  return `${formatCalendarDate(at)}（${daysAgo === 0 ? '今日' : `${daysAgo}日前`}）`
}

/**
 * The list's reminder (AC38): only when data is saved on this device, and it was never exported
 * ('never') or the last export is BACKUP_REMINDER_DAYS calendar days ago or more ('stale').
 */
export function backupReminder(hasSavedData: boolean, lastBackupAt: Date | null, now: Date): BackupReminder {
  if (!hasSavedData) return 'none'
  if (lastBackupAt === null) return 'never'
  return calendarDaysBetween(lastBackupAt, now) >= BACKUP_REMINDER_DAYS ? 'stale' : 'none'
}
