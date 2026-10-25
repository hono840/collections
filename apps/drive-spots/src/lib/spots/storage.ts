import { createSeedData } from './seed'
import { CATEGORIES } from './types'
import type { Category, Spot, SpotsData } from './types'

// localStorage persistence (spec AC13-AC15, AC22). Every function here survives a storage that
// throws (Safari private mode, blocked cookies, quota exceeded) and reports it instead.

export const STORAGE_KEY = 'drive-spots:v1'
export const BACKUP_KEY = 'drive-spots:v1:backup'

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
 * Parses a saved string. Returns null if anything differs from { version: 1, nextId, spots },
 * including duplicate ids or a nextId that an existing spot already uses (AC14, AC16).
 */
export function parseSpotsData(raw: string): SpotsData | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(parsed) || parsed.version !== 1) return null
  const { nextId, spots: rawSpots } = parsed
  if (!isPositiveInteger(nextId) || !Array.isArray(rawSpots)) return null

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

/** What is under STORAGE_KEY right now. */
type SavedState =
  | { kind: 'unreadable' } // getItem throws
  | { kind: 'nothing' }
  | { kind: 'valid'; data: SpotsData }
  | { kind: 'corrupt'; raw: string }

function readSavedState(storage: Storage): SavedState {
  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return { kind: 'unreadable' }
  }
  if (raw === null) return { kind: 'nothing' }
  const data = parseSpotsData(raw)
  return data === null ? { kind: 'corrupt', raw } : { kind: 'valid', data }
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
 */
export function loadSpotsData(storage: Storage | null): { data: SpotsData; persistent: boolean } {
  if (storage === null) return { data: createSeedData(), persistent: false }
  const savedState = readSavedState(storage)
  switch (savedState.kind) {
    case 'unreadable':
      return { data: createSeedData(), persistent: false }
    case 'nothing':
      return { data: createSeedData(), persistent: true }
    case 'valid':
      return { data: savedState.data, persistent: true }
    case 'corrupt':
      return { data: createSeedData(), persistent: backUpCorruptString(storage, savedState.raw) }
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
 * - setItem throws -> saved false (AC15)
 */
export function updateSpotsData(
  storage: Storage | null,
  fallback: SpotsData,
  change: (data: SpotsData) => SpotsData,
): { data: SpotsData; saved: boolean } {
  if (storage === null) return { data: change(fallback), saved: false }
  const savedState = readSavedState(storage)
  if (savedState.kind === 'unreadable') return { data: change(fallback), saved: false }
  if (savedState.kind === 'valid') {
    const data = change(savedState.data)
    return { data, saved: saveSpotsData(storage, data) }
  }
  const data = change(fallback)
  if (savedState.kind === 'corrupt' && !backUpCorruptString(storage, savedState.raw)) {
    return { data, saved: false }
  }
  return { data, saved: saveSpotsData(storage, data) }
}
