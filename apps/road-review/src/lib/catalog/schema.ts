import * as z from 'zod'
import { PREFECTURES } from '@/lib/constants/prefectures'
import { isoDateSchema } from '@/lib/validation/common'

// Road catalog shape and approval rules (ARCH v3 3.3 / 3.4, CEO decisions 2026-10-10).
// - catalogEntrySchema / catalogFileSchema: the SHAPE (C1, C3 id format, C5 hiragana readings, C8 https).
//   `status: 'draft'` and unverified notes are still valid shapes (drafts may carry them).
// - validateApprovedCatalog: the rules for data/road-catalog.json (C2, C3 uniqueness, C6, C8 dates, C9,
//   乗鞍 excluded, unverified regulations rejected, two-wheel badge backed by a verified note).
// - geometryFileSchema: data/geometry/{id}.json (ARCH v3 4.5, C7 shape part).

export const ODBL_LICENSE = 'ODbL-1.0'
export const OSM_ATTRIBUTION = '© OpenStreetMap contributors'

/** PRD v2 US-13 + PRD v3 US-14: words that encourage dangerous / competitive driving. */
export const CATALOG_FORBIDDEN_WORDS = [
  '攻め',
  '攻めがい',
  'ワインディング度',
  'タイム',
  '最速',
  'ランキング',
  '傾き',
  '走り屋',
  '攻める',
  '攻略',
  'ドリフト',
  '全開',
  'ぶっ飛ばす',
  '飛ばす',
  'ゼロヨン',
  'ローリング',
  '峠を責め',
  'タイムアタック',
  'ベストライン',
] as const

/** CEO decision 1 (2026-10-10): 乗鞍スカイライン / 乗鞍エコーライン are not listed. Matched case-insensitively. */
export const EXCLUDED_ROAD_KEYWORDS = ['乗鞍', 'のりくら', 'norikura'] as const

// Rough bounding box of Japan (incl. remote islands): lat 20..46, lng 122..154.
const JAPAN_BOUNDS = { minLat: 20, maxLat: 46, minLng: 122, maxLng: 154 } as const

const CONTROL_OR_FORMAT_CHARACTER = /[\p{Cc}\p{Cf}]/u
const HIRAGANA_READING = /^[ぁ-ゖー]+$/u
const CATALOG_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/
const CATALOG_VERSION = /^(\d{4}-\d{2}-\d{2})\.[1-9]\d*$/

function hasAtMostDecimals(value: number, decimals: number): boolean {
  return Number(value.toFixed(decimals)) === value
}

const latitudeSchema = z.number().min(JAPAN_BOUNDS.minLat).max(JAPAN_BOUNDS.maxLat)
const longitudeSchema = z.number().min(JAPAN_BOUNDS.minLng).max(JAPAN_BOUNDS.maxLng)

const latLngSchema = z.strictObject({ lat: latitudeSchema, lng: longitudeSchema })

const representativePointSchema = z.strictObject({
  lat: latitudeSchema.refine((value) => hasAtMostDecimals(value, 5), { error: 'lat must have at most 5 decimals' }),
  lng: longitudeSchema.refine((value) => hasAtMostDecimals(value, 5), { error: 'lng must have at most 5 decimals' }),
})

const httpsUrlSchema = z.url({ protocol: /^https$/, error: 'https:// の URL だけ使えます' })

/** Display text: NFKC-normalized, no control / bidi / format characters. */
function displayTextSchema(min: number, max: number) {
  return z
    .string()
    .min(min)
    .max(max)
    .refine((value) => value === value.normalize('NFKC'), { error: 'NFKC で正規化した文字にしてください' })
    .refine((value) => !CONTROL_OR_FORMAT_CHARACTER.test(value), { error: '制御文字は使えません' })
}

const readingSchema = z
  .string()
  .min(1)
  .max(60)
  .regex(HIRAGANA_READING, { error: '読みはひらがなと「ー」だけで書いてください' })

const osmIdListSchema = z.array(z.number().int().positive()).min(1)

const bboxSchema = z
  .tuple([latitudeSchema, longitudeSchema, latitudeSchema, longitudeSchema])
  .refine(([south, west, north, east]) => south <= north && west <= east, { error: 'bbox は [南, 西, 北, 東] の順です' })

export const catalogIdSchema = z
  .string()
  .min(3)
  .max(60)
  .regex(CATALOG_ID, { error: 'ID は小文字の英数字とハイフンだけです' })
  .refine((value) => !value.startsWith('own-'), { error: 'own- で始まる ID は使えません' })

const aliasSchema = z
  .strictObject({
    name: displayTextSchema(1, 60),
    reading: readingSchema.optional(),
    kind: z.enum(['official', 'route', 'former', 'common']),
  })
  .refine((alias) => (alias.kind === 'common' || alias.kind === 'former' ? alias.reading !== undefined : true), {
    error: 'common・former の別名には読みが要ります',
    path: ['reading'],
  })

const noteSchema = z.strictObject({
  kind: z.enum(['winterClosure', 'nightClosure', 'carRestriction', 'toll', 'motorcycleBan', 'bicycleBan', 'other']),
  text: displayTextSchema(1, 80),
  sourceUrl: httpsUrlSchema,
  checkedOn: isoDateSchema,
  verified: z.boolean(),
})

const osmRecipeSchema = z
  .strictObject({
    relations: osmIdListSchema.optional(),
    ways: osmIdListSchema.optional(),
    nameQuery: z.strictObject({ name: z.string().min(1).max(60), bbox: bboxSchema }).optional(),
    cutFrom: latLngSchema,
    cutTo: latLngSchema,
    excludeWays: osmIdListSchema.optional(),
    allowGaps: z.boolean().optional(),
    expectedLengthKm: z.number().positive().optional(),
  })
  .refine((osm) => osm.relations !== undefined || osm.ways !== undefined || osm.nameQuery !== undefined, {
    error: 'relations・ways・nameQuery のどれかが要ります',
  })

const sourceSchema = z.strictObject({
  title: z.string().min(1).max(120),
  url: httpsUrlSchema,
  checkedOn: isoDateSchema,
})

export const catalogEntrySchema = z
  .strictObject({
    id: catalogIdSchema,
    status: z.enum(['draft', 'approved', 'retired']),
    name: displayTextSchema(1, 40),
    reading: readingSchema,
    aliases: z.array(aliasSchema).max(8),
    roadType: z.enum(['pass', 'skyline', 'coastal', 'forest', 'other']),
    prefectureCodes: z
      .array(z.number().int().min(1).max(PREFECTURES.length))
      .min(1)
      .max(3)
      .refine((codes) => new Set(codes).size === codes.length, { error: '都道府県コードが重なっています' }),
    rank: z.number().int().min(1),
    section: z.strictObject({ from: displayTextSchema(1, 30), to: displayTextSchema(1, 30) }).optional(),
    elevationM: z.number().int().min(0).max(3500).optional(),
    representativePoint: representativePointSchema,
    restrictionsChecked: z.boolean(),
    notes: z.array(noteSchema).max(6),
    flags: z.strictObject({ twoWheelBanned: z.boolean(), safetyCaution: z.boolean() }),
    osm: osmRecipeSchema,
    sources: z.array(sourceSchema).min(1),
    // Required for approved / retired entries; enforced by validateApprovedCatalog (review_missing).
    review: z.strictObject({ approvedOn: isoDateSchema, approvedBy: z.literal('ceo') }).optional(),
    // Required for retired entries; enforced by validateApprovedCatalog (retired_missing).
    retired: z.strictObject({ on: isoDateSchema, reason: displayTextSchema(1, 200) }).optional(),
  })
  .refine((entry) => entry.elevationM === undefined || entry.roadType === 'pass', {
    error: '標高は峠（pass）だけに付けられます',
    path: ['elevationM'],
  })

export const catalogFileSchema = z.strictObject({
  catalogSchemaVersion: z.literal(1),
  catalogVersion: z
    .string()
    .regex(CATALOG_VERSION, { error: 'catalogVersion は「YYYY-MM-DD.連番」です' })
    .refine((value) => isoDateSchema.safeParse(value.split('.')[0]).success, { error: '実在する日付ではありません' }),
  license: z.literal(ODBL_LICENSE),
  attribution: z.literal(OSM_ATTRIBUTION),
  roads: z.array(catalogEntrySchema),
})

const MAX_GEOMETRY_POINTS = 2000

export const geometryFileSchema = z.strictObject({
  geometrySchemaVersion: z.literal(1),
  id: catalogIdSchema,
  license: z.literal(ODBL_LICENSE),
  attribution: z.literal(OSM_ATTRIBUTION),
  osm: z.strictObject({
    relations: osmIdListSchema.optional(),
    ways: osmIdListSchema.optional(),
    dataTimestamp: z.iso.datetime(),
  }),
  toleranceM: z.number().positive(),
  lengthM: z.number().nonnegative(),
  bbox: bboxSchema,
  lines: z
    .array(z.array(z.tuple([latitudeSchema, longitudeSchema])).min(2))
    .min(1)
    .max(3)
    .refine((lines) => lines.reduce((total, line) => total + line.length, 0) <= MAX_GEOMETRY_POINTS, {
      error: `点は合計 ${MAX_GEOMETRY_POINTS} 点までです`,
    }),
})

export type CatalogEntry = z.output<typeof catalogEntrySchema>
export type CatalogFile = z.output<typeof catalogFileSchema>
export type GeometryFile = z.output<typeof geometryFileSchema>

export type CatalogIssueCode =
  | 'schema'
  | 'draft_in_approved'
  | 'review_missing'
  | 'retired_missing'
  | 'retired_unexpected'
  | 'duplicate_id'
  | 'duplicate_name'
  | 'future_date'
  | 'forbidden_word'
  | 'excluded_road'
  | 'unverified_note'
  | 'two_wheel_flag_unbacked'

export type CatalogIssue = {
  code: CatalogIssueCode
  path: Array<string | number>
  message: string
}

export type ApprovedCatalogResult = { ok: true; data: CatalogFile } | { ok: false; issues: CatalogIssue[] }

/**
 * Key for "same road name" (C6). Follows the first steps of ARCH v3 5.2 (NFKC, lower case,
 * katakana -> hiragana, drop spaces / separators / long vowel marks).
 * TODO(stage 7): replace with normalizeForSearch from src/lib/search once it exists.
 */
function normalizeNameKey(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/gu, (character) => String.fromCharCode(character.charCodeAt(0) - 0x60))
    .replace(/[ゕゖ]/gu, 'け')
    .replace(/[\s・･\-‐−–—_.,、。()「」'’ー〜～]/gu, '')
}

function forbiddenWordIn(text: string): string | undefined {
  const normalized = text.normalize('NFKC')
  return CATALOG_FORBIDDEN_WORDS.find((word) => normalized.includes(word))
}

function excludedKeywordIn(text: string): string | undefined {
  const normalized = text.normalize('NFKC').toLowerCase()
  return EXCLUDED_ROAD_KEYWORDS.find((keyword) => normalized.includes(keyword))
}

/** Checks one road against the approved-catalog rules (everything except cross-road duplicates). */
function collectEntryIssues(road: CatalogEntry, index: number, today: string): CatalogIssue[] {
  const issues: CatalogIssue[] = []
  const at = (...rest: Array<string | number>) => ['roads', index, ...rest]

  // C2
  if (road.status === 'draft') {
    issues.push({ code: 'draft_in_approved', path: at('status'), message: `${road.id}: 承認済みのリストに下書きがあります` })
  }
  if (road.status !== 'draft' && road.review === undefined) {
    issues.push({ code: 'review_missing', path: at('review'), message: `${road.id}: review（承認日）がありません` })
  }
  if (road.status === 'retired' && road.retired === undefined) {
    issues.push({ code: 'retired_missing', path: at('retired'), message: `${road.id}: retired（引退の日と理由）がありません` })
  }
  if (road.status !== 'retired' && road.retired !== undefined) {
    issues.push({ code: 'retired_unexpected', path: at('retired'), message: `${road.id}: 引退していない道に retired があります` })
  }

  // C8: dates must not be in the future.
  const datedFields: Array<[string, Array<string | number>]> = [
    ...road.notes.map((note, noteIndex): [string, Array<string | number>] => [note.checkedOn, at('notes', noteIndex, 'checkedOn')]),
    ...road.sources.map((source, sourceIndex): [string, Array<string | number>] => [
      source.checkedOn,
      at('sources', sourceIndex, 'checkedOn'),
    ]),
  ]
  if (road.review) datedFields.push([road.review.approvedOn, at('review', 'approvedOn')])
  if (road.retired) datedFields.push([road.retired.on, at('retired', 'on')])
  for (const [date, path] of datedFields) {
    if (date > today) issues.push({ code: 'future_date', path, message: `${road.id}: ${date} は未来の日付です` })
  }

  // C9: forbidden words in every free text except the road name itself.
  const texts: Array<[string, Array<string | number>]> = [
    ...road.aliases.map((alias, aliasIndex): [string, Array<string | number>] => [alias.name, at('aliases', aliasIndex, 'name')]),
    ...road.notes.map((note, noteIndex): [string, Array<string | number>] => [note.text, at('notes', noteIndex, 'text')]),
  ]
  if (road.section) {
    texts.push([road.section.from, at('section', 'from')], [road.section.to, at('section', 'to')])
  }
  if (road.retired) texts.push([road.retired.reason, at('retired', 'reason')])
  for (const [text, path] of texts) {
    const word = forbiddenWordIn(text)
    if (word) issues.push({ code: 'forbidden_word', path, message: `${road.id}: 禁止語「${word}」があります` })
  }

  // CEO decision 1: 乗鞍 is excluded (id, name, reading and aliases).
  const identityTexts: Array<[string, Array<string | number>]> = [
    [road.id, at('id')],
    [road.name, at('name')],
    [road.reading, at('reading')],
  ]
  road.aliases.forEach((alias, aliasIndex) => {
    identityTexts.push([alias.name, at('aliases', aliasIndex, 'name')])
    if (alias.reading) identityTexts.push([alias.reading, at('aliases', aliasIndex, 'reading')])
  })
  for (const [text, path] of identityTexts) {
    const keyword = excludedKeywordIn(text)
    if (keyword) issues.push({ code: 'excluded_road', path, message: `${road.id}: 除外する道（${keyword}）です` })
  }

  // CEO decision 3: regulations not confirmed on an official page are not shown (retired roads included).
  road.notes.forEach((note, noteIndex) => {
    if (!note.verified) {
      issues.push({ code: 'unverified_note', path: at('notes', noteIndex, 'verified'), message: `${road.id}: 未確認の注意があります` })
    }
  })

  // CEO decision 2: the "二輪通行不可" badge needs a verified motorcycleBan note.
  if (road.flags.twoWheelBanned && !road.notes.some((note) => note.kind === 'motorcycleBan' && note.verified)) {
    issues.push({
      code: 'two_wheel_flag_unbacked',
      path: at('flags', 'twoWheelBanned'),
      message: `${road.id}: 二輪通行不可の印に、確かめた motorcycleBan の注意がありません`,
    })
  }

  return issues
}

/** C3 (unique id) and C6 (same normalized name + overlapping prefecture). */
function collectDuplicateIssues(roads: CatalogEntry[]): CatalogIssue[] {
  const issues: CatalogIssue[] = []
  const seenIds = new Set<string>()
  roads.forEach((road, index) => {
    if (seenIds.has(road.id)) {
      issues.push({ code: 'duplicate_id', path: ['roads', index, 'id'], message: `ID ${road.id} が重なっています` })
    }
    seenIds.add(road.id)

    const nameKey = normalizeNameKey(road.name)
    const twinIndex = roads.findIndex(
      (other, otherIndex) =>
        otherIndex < index &&
        normalizeNameKey(other.name) === nameKey &&
        other.prefectureCodes.some((code) => road.prefectureCodes.includes(code)),
    )
    if (twinIndex !== -1) {
      issues.push({
        code: 'duplicate_name',
        path: ['roads', index, 'name'],
        message: `${road.id}: ${roads[twinIndex]?.id} と名前と都道府県が重なっています`,
      })
    }
  })
  return issues
}

/**
 * Validates data/road-catalog.json as the APPROVED catalog (ARCH v3 3.4 C1-C3, C6, C8, C9 + CEO decisions).
 * `today` is YYYY-MM-DD (upper bound for dates). Shape errors are returned alone (code 'schema').
 */
export function validateApprovedCatalog(input: unknown, options: { today: string }): ApprovedCatalogResult {
  const parsed = catalogFileSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        code: 'schema',
        path: issue.path.map((segment) => (typeof segment === 'number' ? segment : String(segment))),
        message: issue.message,
      })),
    }
  }

  const roads = parsed.data.roads
  const issues = [
    ...roads.flatMap((road, index) => collectEntryIssues(road, index, options.today)),
    ...collectDuplicateIssues(roads),
  ]
  return issues.length > 0 ? { ok: false, issues } : { ok: true, data: parsed.data }
}
