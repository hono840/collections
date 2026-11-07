import * as z from 'zod'
import { notFutureDateSchema } from './common'

// Road info captured together with a drive (1 road_info row per drive, architecture 3.2 / ch.20-1).
// Item set follows PRD US-10. status null = 記録しない (not recorded).
// Must match the road_info columns and check constraints in 00004_drives_road_info.sql.

export const ROAD_RULE_ITEMS = ['motorcycleBan', 'nightClosure', 'winterClosure', 'toll'] as const
export const FACILITY_ITEMS = ['parking', 'toilet', 'michiNoEki', 'observatory'] as const
/** Display order. */
export const ROAD_INFO_ITEMS = [...ROAD_RULE_ITEMS, ...FACILITY_ITEMS] as const

export type RoadInfoItem = (typeof ROAD_INFO_ITEMS)[number]

/** あり / なし / 不明 - every item except toll. */
export const PRESENCE_STATUSES = ['yes', 'no', 'unknown'] as const
/** 有料 / 無料 / 不明 */
export const TOLL_STATUSES = ['paid', 'free', 'unknown'] as const

export type PresenceStatus = (typeof PRESENCE_STATUSES)[number]
export type TollStatus = (typeof TOLL_STATUSES)[number]
export type RoadInfoStatus = PresenceStatus | TollStatus

export const ROAD_INFO_MEMO_MAX_LENGTH = 200
export const ROAD_INFO_MEMO_TOO_LONG_MESSAGE = '200文字以内で入力してください'
export const NO_ITEM_SELECTED_MESSAGE = '少なくとも1つの項目を選んでください' // M-27

function itemSchema<const TStatuses extends readonly [string, ...string[]]>(statuses: TStatuses) {
  return z
    .object({
      status: z.enum(statuses).nullable(),
      memo: z.string(),
    })
    .superRefine((value, context) => {
      // A 記録しない item's memo is hidden in the UI, so it is neither validated nor stored.
      if (value.status !== null && value.memo.trim().length > ROAD_INFO_MEMO_MAX_LENGTH) {
        context.addIssue({ code: 'custom', message: ROAD_INFO_MEMO_TOO_LONG_MESSAGE, path: ['memo'] })
      }
    })
    .transform((value) => ({
      status: value.status,
      memo: value.status === null ? '' : value.memo.trim(),
    }))
}

const presenceItemSchema = itemSchema(PRESENCE_STATUSES)
const tollItemSchema = itemSchema(TOLL_STATUSES)

const roadInfoItemsSchema = z.object({
  motorcycleBan: presenceItemSchema,
  nightClosure: presenceItemSchema,
  winterClosure: presenceItemSchema,
  toll: tollItemSchema,
  parking: presenceItemSchema,
  toilet: presenceItemSchema,
  michiNoEki: presenceItemSchema,
  observatory: presenceItemSchema,
})

type ItemsLike = Record<RoadInfoItem, { status: string | null }>

/** true when at least one item has a status (不明 counts). DriveForm sends roadInfo: null otherwise. */
export function hasAnyRoadInfoItem(input: { items: ItemsLike }): boolean {
  return ROAD_INFO_ITEMS.some((item) => input.items[item]?.status != null)
}

export const roadInfoInputSchema = z
  .object({
    // null -> the drive's drivenOn is used (Server Action + road_info_guard trigger).
    // May be later than the drive date (info checked afterwards); only future dates are rejected.
    confirmedOn: notFutureDateSchema.nullable(),
    items: roadInfoItemsSchema,
  })
  .refine((value) => hasAnyRoadInfoItem(value), { error: NO_ITEM_SELECTED_MESSAGE })

/** What RoadInfoFieldset holds. */
export type RoadInfoInput = z.input<typeof roadInfoInputSchema>
/** Validated road info (trimmed memos, '' for 記録しない items). */
export type RoadInfoOutput = z.output<typeof roadInfoInputSchema>

/** Fresh form state: confirmedOn null and every item 記録しない. */
export function emptyRoadInfoInput(): RoadInfoInput {
  return {
    confirmedOn: null,
    items: {
      motorcycleBan: { status: null, memo: '' },
      nightClosure: { status: null, memo: '' },
      winterClosure: { status: null, memo: '' },
      toll: { status: null, memo: '' },
      parking: { status: null, memo: '' },
      toilet: { status: null, memo: '' },
      michiNoEki: { status: null, memo: '' },
      observatory: { status: null, memo: '' },
    },
  }
}
