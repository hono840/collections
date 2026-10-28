import { MAX_NEXT_ID } from './storage'
import { ALL_CATEGORIES, SPOTS_DATA_VERSION } from './types'
import type { CategoryFilter, Spot, SpotInput, SpotsData, Tab } from './types'

// Pure operations on the saved data. None of them mutate their arguments.

const MISSING_REGION = '未入力'
const NAME_REQUIRED_MESSAGE = 'スポット名を入れてください'
const DISTANCE_INVALID_MESSAGE = '0以上の数字を入れてください'
// AC11: only a plain half-width decimal such as 60 or 12.5. Without the u flag \d is ASCII 0-9 only,
// so full-width digits fail, and there is no room for a sign, an exponent, hex or a bare dot.
const PLAIN_DECIMAL_PATTERN = /^\d+(\.\d+)?$/

/**
 * The 7 form fields as adding and editing both save them (AC12, AC43, AC47): every field trimmed
 * (String#trim also removes the full-width space; line breaks inside the memo stay), an empty
 * region as '未入力'. Only these fields are copied, so an id or done inside the input never gets through.
 */
function normalizeSpotInput(input: SpotInput): SpotInput {
  const region = input.region.trim()
  return {
    name: input.name.trim(),
    region: region === '' ? MISSING_REGION : region,
    category: input.category,
    distanceKm: input.distanceKm.trim(),
    exitInterchange: input.exitInterchange.trim(),
    season: input.season.trim(),
    memo: input.memo.trim(),
  }
}

/**
 * Adds a 行きたい spot at the top, saved as normalizeSpotInput says (AC12, AC47); the id is nextId (AC16).
 * Once nextId has reached MAX_NEXT_ID nothing is added (the same content comes back), so the data
 * never gets a nextId the app would read as corrupt. Only a crafted file gets there, so no message (AC16).
 */
export function addSpot(data: SpotsData, input: SpotInput): SpotsData {
  if (data.nextId >= MAX_NEXT_ID) return { ...data, spots: [...data.spots] }
  const spot: Spot = { id: data.nextId, ...normalizeSpotInput(input), done: false }
  return { version: SPOTS_DATA_VERSION, nextId: data.nextId + 1, spots: [spot, ...data.spots] }
}

/**
 * The edit form's starting values (AC42): the 7 fields as saved, except that a region of exactly
 * '未入力' opens as an empty field (saving it empty gives '未入力' again).
 */
export function spotToInput(spot: Spot): SpotInput {
  return {
    name: spot.name,
    region: spot.region === MISSING_REGION ? '' : spot.region,
    category: spot.category,
    distanceKm: spot.distanceKm,
    exitInterchange: spot.exitInterchange,
    season: spot.season,
    memo: spot.memo,
  }
}

/**
 * Replaces the 7 form fields of one spot, saved exactly as addSpot saves them (AC43). done, the id,
 * the order and nextId stay; editing adds nothing, so the MAX_NEXT_ID cap does not apply. An unknown
 * id changes nothing, so a spot deleted elsewhere is not brought back (AC45).
 */
export function updateSpot(data: SpotsData, id: number, input: SpotInput): SpotsData {
  const savedFields = normalizeSpotInput(input)
  return {
    ...data,
    spots: data.spots.map((spot) => (spot.id === id ? { id: spot.id, ...savedFields, done: spot.done } : spot)),
  }
}

/** Moves a spot between 行きたい and 行った (AC7). */
export function toggleDone(data: SpotsData, id: number): SpotsData {
  return {
    ...data,
    spots: data.spots.map((spot) => (spot.id === id ? { ...spot, done: !spot.done } : spot)),
  }
}

/** Deletes a spot. nextId stays as it is so the id is never reused (AC8, AC16). */
export function removeSpot(data: SpotsData, id: number): SpotsData {
  return { ...data, spots: data.spots.filter((spot) => spot.id !== id) }
}

/**
 * Replaces the memo of one spot, trimmed like addSpot does; line breaks inside stay (AC24). Nothing
 * else changes (AC26). An unknown id changes nothing, so a spot deleted elsewhere is not brought
 * back (AC27).
 */
export function updateMemo(data: SpotsData, id: number, memo: string): SpotsData {
  const trimmedMemo = memo.trim()
  return {
    ...data,
    spots: data.spots.map((spot) => (spot.id === id ? { ...spot, memo: trimmedMemo } : spot)),
  }
}

/** Spots of the tab AND the category, in list order (AC2, AC3). */
export function filterSpots(spots: Spot[], tab: Tab, category: CategoryFilter): Spot[] {
  return spots.filter(
    (spot) =>
      spot.done === (tab === 'done') && (category === ALL_CATEGORIES || spot.category === category),
  )
}

/** Tab counts over all spots, ignoring the category filter (AC2). */
export function countByTab(spots: Spot[]): { want: number; done: number } {
  const doneCount = spots.filter((spot) => spot.done).length
  return { want: spots.length - doneCount, done: doneCount }
}

export type SpotInputErrors = { name?: string; distanceKm?: string }

/** Form errors (AC10, AC11). An empty object means the input can be saved. */
export function validateSpotInput(input: SpotInput): SpotInputErrors {
  const errors: SpotInputErrors = {}
  if (input.name.trim() === '') {
    errors.name = NAME_REQUIRED_MESSAGE
  }
  const distanceText = input.distanceKm.trim()
  if (distanceText !== '' && !PLAIN_DECIMAL_PATTERN.test(distanceText)) {
    errors.distanceKm = DISTANCE_INVALID_MESSAGE
  }
  return errors
}
