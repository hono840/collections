import { createSeedData } from './seed'
import { CATEGORIES } from './types'
import type { Category, Spot, SpotsData } from './types'

// localStorage persistence (spec AC13-AC15, AC22, AC30, AC33). Every function here survives a storage
// that throws (Safari private mode, blocked cookies, quota exceeded) and reports it instead.

export const STORAGE_KEY = 'drive-spots:v1'
export const BACKUP_KEY = 'drive-spots:v1:backup'
/** When the data was last exported to a file, as an ISO 8601 string (AC33). */
export const LAST_BACKUP_KEY = 'drive-spots:v1:last-backup'
/**
 * The largest nextId this app accepts (AC16). Far above anything normal use reaches, and far below
 * Number.MAX_SAFE_INTEGER, so ids can never stop being distinct safe integers. A larger nextId is
 * corrupt (saved data) or invalid (backup file), and addSpot adds nothing once it is reached.
 */
export const MAX_NEXT_ID = 1_000_000_000

/** window.localStorage, or null when there is no window or touching it throws (AC15). */
export function getBrowserStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage ?? null
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1
}

function isCategory(value: unknown): value is Category {
  return CATEGORIES.some((category) => category === value)
}

/** A Spot with exactly the known fields, or null if any field is missing or has the wrong type. */
function parseSpot(value: unknown): Spot | null {
  if (!isRecord(value)) return null
  const { id, name, region, category, distanceKm, season, memo, done } = value
  if (
    !isPositiveInteger(id) ||
    typeof name !== 'string' ||
    typeof region !== 'string' ||
    !isCategory(category) ||
    typeof distanceKm !== 'string' ||
    typeof season !== 'string' ||
    typeof memo !== 'string' ||
    typeof done !== 'boolean'
  ) {
    return null
  }
  return { id, name, region, category, distanceKm, season, memo, done }
}

/**
 * Checks an already parsed value. Returns null if anything differs from { version: 1, nextId, spots },
 * including duplicate ids, a nextId that an existing spot already uses, or a nextId above
 * MAX_NEXT_ID (AC14, AC16). Also used for the data inside a backup file, so a file is checked
 * exactly as strictly (AC34).
 */
export function parseSpotsValue(value: unknown): SpotsData | null {
  if (!isRecord(value) || value.version !== 1) return null
  const { nextId, spots: rawSpots } = value
  if (!isPositiveInteger(nextId) || nextId > MAX_NEXT_ID || !Array.isArray(rawSpots)) return null

  const spots: Spot[] = []
  const seenIds = new Set<number>()
  for (const rawSpot of rawSpots) {
    const spot = parseSpot(rawSpot)
    if (spot === null || seenIds.has(spot.id) || spot.id >= nextId) return null
    seenIds.add(spot.id)
    spots.push(spot)
  }
  return { version: 1, nextId, spots }
}

/** Parses a saved string with the same strictness as parseSpotsValue (AC14). */
export function parseSpotsData(raw: string): SpotsData | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  return parseSpotsValue(parsed)
}

/**
 * A format version written by a newer version of the app: a safe integer above 1 (AC30, AC34).
 * The string '2', 2.5 or 2^53 is not; such a value is simply corrupt.
 */
export function isNewerVersionNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 1
}

/** An object whose version is newer than this app reads (AC30), whatever the rest looks like. */
export function isNewerVersionValue(value: unknown): boolean {
  return isRecord(value) && isNewerVersionNumber(value.version)
}

/**
 * A time written by Date#toISOString (what writeLastBackupAt and backup files store), or null.
 * Only that exact form is accepted, so an impossible date such as Oct 32 or Feb 30, which Date
 * would quietly roll over, is refused (AC33, AC34).
 */
export function parseIsoDateTime(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString() === value ? date : null
}

/** What is under STORAGE_KEY, as readSavedSpots reports it. */
export type SavedSpotsRead =
  | { kind: 'unreadable' } // no storage / getItem throws
  | { kind: 'nothing' }
  | { kind: 'valid'; data: SpotsData }
  | { kind: 'corrupt' }
  | { kind: 'newer' } // saved by a newer version (AC30); not corrupt

/** SavedSpotsRead, plus the corrupt string that has to be backed up before anything overwrites it. */
type SavedState = Exclude<SavedSpotsRead, { kind: 'corrupt' }> | { kind: 'corrupt'; raw: string }

function readSavedState(storage: Storage): SavedState {
  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return { kind: 'unreadable' }
  }
  if (raw === null) return { kind: 'nothing' }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { kind: 'corrupt', raw }
  }
  // Checked before the strict check: newer data must never be treated as corrupt (AC30).
  if (isNewerVersionValue(parsed)) return { kind: 'newer' }
  const data = parseSpotsValue(parsed)
  return data === null ? { kind: 'corrupt', raw } : { kind: 'valid', data }
}

/** Reads what is saved without writing anything (AC22, AC30). */
export function readSavedSpots(storage: Storage | null): SavedSpotsRead {
  if (storage === null) return { kind: 'unreadable' }
  const savedState = readSavedState(storage)
  return savedState.kind === 'corrupt' ? { kind: 'corrupt' } : savedState
}

/**
 * Makes sure BACKUP_KEY holds the corrupt string before anything may overwrite it (AC14).
 * Returns true when it already did or the copy was written, false when the copy failed.
 */
function backUpCorruptString(storage: Storage, corruptRaw: string): boolean {
  try {
    if (storage.getItem(BACKUP_KEY) === corruptRaw) return true
  } catch {
    // The backup could not be checked; try to write it anyway.
  }
  try {
    storage.setItem(BACKUP_KEY, corruptRaw)
    return true
  } catch {
    return false
  }
}

/**
 * Reads the saved data.
 * - no storage / getItem throws -> seed data, persistent false (AC15)
 * - nothing saved -> seed data, persistent true; nothing is written yet (AC1)
 * - corrupt -> seed data; the original string is copied to BACKUP_KEY. persistent is true when the
 *   copy is there and false when it could not be written, so nothing overwrites the original (AC14)
 * - saved by a newer version -> seed data, persistent false, newerVersion true; nothing is backed up
 *   or written (AC30)
 * hasSavedData is true only for valid data (AC38, AC39).
 */
export function loadSpotsData(storage: Storage | null): {
  data: SpotsData
  persistent: boolean
  newerVersion: boolean
  hasSavedData: boolean
} {
  const notSaved = { newerVersion: false, hasSavedData: false }
  if (storage === null) return { data: createSeedData(), persistent: false, ...notSaved }
  const savedState = readSavedState(storage)
  switch (savedState.kind) {
    case 'unreadable':
      return { data: createSeedData(), persistent: false, ...notSaved }
    case 'nothing':
      return { data: createSeedData(), persistent: true, ...notSaved }
    case 'valid':
      return { data: savedState.data, persistent: true, newerVersion: false, hasSavedData: true }
    case 'corrupt':
      return { data: createSeedData(), persistent: backUpCorruptString(storage, savedState.raw), ...notSaved }
    case 'newer':
      return { data: createSeedData(), persistent: false, newerVersion: true, hasSavedData: false }
  }
}

/** Writes the data under STORAGE_KEY. Returns false instead of throwing when it cannot (AC15). */
export function saveSpotsData(storage: Storage | null, data: SpotsData): boolean {
  if (storage === null) return false
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

/**
 * Applies a change and saves it on top of the LATEST saved data, re-read right before writing, so
 * a change saved meanwhile by another tab or a restored page is kept (AC22). `fallback` is the data
 * the screen shows; it is used only when nothing valid is saved.
 * - no storage / getItem throws -> change(fallback), nothing is written, saved false (AC15)
 * - nothing saved -> change(fallback) is written
 * - valid data -> change(saved data) is written (spots and nextId from other tabs survive, AC16)
 * - corrupt -> change(fallback) is written once BACKUP_KEY holds the corrupt string (already, or
 *   copied now). If the copy fails nothing is written and saved is false (AC14)
 * - saved by a newer version -> change(fallback), nothing is written (not even BACKUP_KEY), saved
 *   false, newerVersion true (AC30)
 * - setItem throws -> saved false (AC15)
 */
export function updateSpotsData(
  storage: Storage | null,
  fallback: SpotsData,
  change: (data: SpotsData) => SpotsData,
): { data: SpotsData; saved: boolean; newerVersion: boolean } {
  if (storage === null) return { data: change(fallback), saved: false, newerVersion: false }
  const savedState = readSavedState(storage)
  if (savedState.kind === 'unreadable') return { data: change(fallback), saved: false, newerVersion: false }
  if (savedState.kind === 'newer') return { data: change(fallback), saved: false, newerVersion: true }
  if (savedState.kind === 'valid') {
    const data = change(savedState.data)
    return { data, saved: saveSpotsData(storage, data), newerVersion: false }
  }
  const data = change(fallback)
  if (savedState.kind === 'corrupt' && !backUpCorruptString(storage, savedState.raw)) {
    return { data, saved: false, newerVersion: false }
  }
  return { data, saved: saveSpotsData(storage, data), newerVersion: false }
}

/** The last export time, or null when there is none, it is not a time, or storage cannot be read (AC33). */
export function readLastBackupAt(storage: Storage | null): Date | null {
  if (storage === null) return null
  try {
    return parseIsoDateTime(storage.getItem(LAST_BACKUP_KEY))
  } catch {
    return null
  }
}

/** Records an export time under LAST_BACKUP_KEY only. Returns false instead of throwing (AC33). */
export function writeLastBackupAt(storage: Storage | null, at: Date): boolean {
  if (storage === null) return false
  try {
    storage.setItem(LAST_BACKUP_KEY, at.toISOString())
    return true
  } catch {
    return false
  }
}
