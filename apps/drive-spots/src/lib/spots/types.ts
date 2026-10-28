// Domain types and constants shared by the spot logic, storage and screens (spec AC3, AC4, AC13).

/** The five categories, in the design's chip order. */
export const CATEGORIES = ['峠', '絶景ロード', '海沿い', 'サーキット', '都市高速'] as const
export type Category = (typeof CATEGORIES)[number]

/** One-character mark shown on the left of each list card (AC4). */
export const CATEGORY_MARKS: Record<Category, string> = {
  峠: '峠',
  絶景ロード: '景',
  海沿い: '海',
  サーキット: '走',
  都市高速: '高',
}

/** Category filter value that shows every category (AC3). */
export const ALL_CATEGORIES = 'すべて'
export type CategoryFilter = typeof ALL_CATEGORIES | Category

/** 'want' = 行きたい, 'done' = 行った (AC2). */
export type Tab = 'want' | 'done'

export type Spot = {
  id: number
  name: string
  region: string
  category: Category
  distanceKm: string // '' = not entered
  exitInterchange: string // 降りるIC; '' = not entered (added in version 2, AC46)
  season: string
  memo: string
  done: boolean
}

/**
 * The format version this app writes, and the newest it reads (AC13, AC46). Version 1 (no
 * exitInterchange) is still read and handed on as version 2; anything above this is AC30.
 */
export const SPOTS_DATA_VERSION = 2

/** The saved shape under localStorage 'drive-spots:v1' (AC13). */
export type SpotsData = { version: typeof SPOTS_DATA_VERSION; nextId: number; spots: Spot[] }

/** What the add and edit forms collect. id and done are kept by addSpot / updateSpot. */
export type SpotInput = Omit<Spot, 'id' | 'done'>

/**
 * Why saving is off, as the list and the backup screen show it: 'unavailable' = this device cannot
 * save (AC15), 'newer-version' = data from a newer version of the app is saved (AC30).
 */
export type SaveNotice = 'none' | 'unavailable' | 'newer-version'

/** The notice texts, shared so the list and the backup screen say exactly the same (AC15, AC30, AC32). */
export const SAVE_NOTICE_TEXTS: Record<Exclude<SaveNotice, 'none'>, string> = {
  unavailable: 'この端末では保存できません（再読み込みで消えます）',
  'newer-version':
    '新しい版のアプリで保存されたデータがあります。ページを再読み込みしてください（このままでは保存されません）',
}
