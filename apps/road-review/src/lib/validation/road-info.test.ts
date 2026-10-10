import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FACILITY_ITEMS,
  NO_ITEM_SELECTED_MESSAGE,
  PRESENCE_STATUSES,
  ROAD_INFO_ITEMS,
  ROAD_INFO_MEMO_MAX_LENGTH,
  ROAD_INFO_MEMO_TOO_LONG_MESSAGE,
  ROAD_RULE_ITEMS,
  TOLL_STATUSES,
  emptyRoadInfoInput,
  hasAnyRoadInfoItem,
  roadInfoInputSchema,
} from './road-info'
import { FUTURE_DATE_MESSAGE, toFieldErrors } from './common'

// Road info captured together with a drive (architecture 3.2 road_info 1:1 per drive, RoadInfoFieldset in DriveForm)
// using the PRD US-10 item set (二輪通行止め / 夜間通行止め / 冬季閉鎖 / 有料 + 施設4つ, per-item memo, 記録しない).
// Contract (src/lib/validation/road-info.ts):
//   ROAD_RULE_ITEMS = ['motorcycleBan', 'nightClosure', 'winterClosure', 'toll']
//   FACILITY_ITEMS  = ['parking', 'toilet', 'michiNoEki', 'observatory']
//   ROAD_INFO_ITEMS = [...ROAD_RULE_ITEMS, ...FACILITY_ITEMS]     (display order)
//   PRESENCE_STATUSES = ['yes', 'no', 'unknown']    (あり / なし / 不明) - every item except toll
//   TOLL_STATUSES     = ['paid', 'free', 'unknown'] (有料 / 無料 / 不明)
//   status null = 記録しない (not recorded: keeps the previous latest value on the road detail)
//   ROAD_INFO_MEMO_MAX_LENGTH = 200, ROAD_INFO_MEMO_TOO_LONG_MESSAGE = '200文字以内で入力してください'
//   NO_ITEM_SELECTED_MESSAGE = '少なくとも1つの項目を選んでください' (M-27) - root issue (path [])
//   roadInfoInputSchema = z.object({
//     confirmedOn: notFutureDateSchema | null,   // null -> the drive's drivenOn is used (action + DB trigger)
//     items: { [item]: { status: <enum> | null, memo: string } },
//   })
//   - memo is trimmed; when status is null the memo is ignored (not validated) and output as ''
//   emptyRoadInfoInput(): RoadInfoInput  - confirmedOn null, every item { status: null, memo: '' } (fresh object each call)
//   hasAnyRoadInfoItem(input): boolean   - true when at least one status is non-null (DriveForm sends roadInfo: null otherwise)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-06T03:00:00Z')) // 2026-10-06 12:00 JST
})

afterEach(() => {
  vi.useRealTimers()
})

function withItem(item: (typeof ROAD_INFO_ITEMS)[number], status: string | null, memo = '') {
  const input = emptyRoadInfoInput()
  ;(input.items as Record<string, { status: string | null; memo: string }>)[item] = { status, memo }
  return input
}

function fieldErrorsOf(value: unknown) {
  const result = roadInfoInputSchema.safeParse(value)
  if (result.success) throw new Error('expected a validation failure')
  return toFieldErrors(result.error)
}

describe('item constants (PRD US-10)', () => {
  it('has the 4 road rules and the 4 facilities in display order', () => {
    expect(ROAD_RULE_ITEMS).toEqual(['motorcycleBan', 'nightClosure', 'winterClosure', 'toll'])
    expect(FACILITY_ITEMS).toEqual(['parking', 'toilet', 'michiNoEki', 'observatory'])
    expect(ROAD_INFO_ITEMS).toEqual([...ROAD_RULE_ITEMS, ...FACILITY_ITEMS])
  })

  it('statuses', () => {
    expect(PRESENCE_STATUSES).toEqual(['yes', 'no', 'unknown'])
    expect(TOLL_STATUSES).toEqual(['paid', 'free', 'unknown'])
  })

  it('copy', () => {
    expect(NO_ITEM_SELECTED_MESSAGE).toBe('少なくとも1つの項目を選んでください')
    expect(ROAD_INFO_MEMO_TOO_LONG_MESSAGE).toBe('200文字以内で入力してください')
    expect(ROAD_INFO_MEMO_MAX_LENGTH).toBe(200)
  })
})

describe('emptyRoadInfoInput()', () => {
  it('starts with confirmedOn null and every item 記録しない', () => {
    const input = emptyRoadInfoInput()
    expect(input.confirmedOn).toBeNull()
    expect(Object.keys(input.items)).toEqual([...ROAD_INFO_ITEMS])
    for (const item of ROAD_INFO_ITEMS) expect(input.items[item]).toEqual({ status: null, memo: '' })
  })

  it('returns a fresh object every time (form state must not be shared)', () => {
    const first = emptyRoadInfoInput()
    first.items.toll.status = 'paid'
    expect(emptyRoadInfoInput().items.toll.status).toBeNull()
  })
})

describe('hasAnyRoadInfoItem()', () => {
  it('false when every item is 記録しない (even with memos typed)', () => {
    const input = emptyRoadInfoInput()
    input.items.parking.memo = '約20台'
    expect(hasAnyRoadInfoItem(input)).toBe(false)
  })

  it('true when at least one item has a status (不明 counts)', () => {
    expect(hasAnyRoadInfoItem(withItem('observatory', 'unknown'))).toBe(true)
  })
})

describe('roadInfoInputSchema', () => {
  it('accepts one recorded item and keeps the others as 記録しない', () => {
    const parsed = roadInfoInputSchema.parse(withItem('motorcycleBan', 'yes', '土日のみ'))
    expect(parsed.confirmedOn).toBeNull()
    expect(parsed.items.motorcycleBan).toEqual({ status: 'yes', memo: '土日のみ' })
    expect(parsed.items.toll).toEqual({ status: null, memo: '' })
  })

  it('accepts all 8 items with every allowed status', () => {
    const input = emptyRoadInfoInput()
    input.confirmedOn = '2026-10-01'
    input.items.motorcycleBan = { status: 'yes', memo: '' }
    input.items.nightClosure = { status: 'no', memo: '' }
    input.items.winterClosure = { status: 'unknown', memo: '' }
    input.items.toll = { status: 'paid', memo: '普通車 500円' }
    input.items.parking = { status: 'yes', memo: '約20台' }
    input.items.toilet = { status: 'no', memo: '' }
    input.items.michiNoEki = { status: 'unknown', memo: '' }
    input.items.observatory = { status: 'yes', memo: '' }
    expect(roadInfoInputSchema.parse(input)).toEqual(input)
  })

  it('all items 記録しない -> M-27 as a root error', () => {
    expect(fieldErrorsOf(emptyRoadInfoInput())).toEqual({ _form: [NO_ITEM_SELECTED_MESSAGE] })
  })

  it('toll uses 有料/無料/不明: "yes" is rejected for toll and "paid" for the other items', () => {
    expect(fieldErrorsOf(withItem('toll', 'yes'))['items.toll.status']?.length).toBeGreaterThan(0)
    expect(fieldErrorsOf(withItem('motorcycleBan', 'paid'))['items.motorcycleBan.status']?.length).toBeGreaterThan(0)
    expect(fieldErrorsOf(withItem('parking', 'free'))['items.parking.status']?.length).toBeGreaterThan(0)
  })

  it('a 200-character memo is fine, 201 -> "200文字以内で入力してください" on that item', () => {
    expect(roadInfoInputSchema.safeParse(withItem('nightClosure', 'yes', 'あ'.repeat(200))).success).toBe(true)
    expect(fieldErrorsOf(withItem('nightClosure', 'yes', 'あ'.repeat(201)))).toEqual({
      'items.nightClosure.memo': [ROAD_INFO_MEMO_TOO_LONG_MESSAGE],
    })
  })

  it('trims the memo before checking the length', () => {
    const parsed = roadInfoInputSchema.parse(withItem('toll', 'paid', `  ${'あ'.repeat(200)}  `))
    expect(parsed.items.toll.memo).toBe('あ'.repeat(200))
  })

  it("a 記録しない item's memo is not sent and not validated (hidden field, UX 3.1)", () => {
    const input = withItem('toll', 'free')
    input.items.parking = { status: null, memo: 'あ'.repeat(500) }
    const parsed = roadInfoInputSchema.parse(input)
    expect(parsed.items.parking).toEqual({ status: null, memo: '' })
  })

  it('confirmedOn in the future (JST) -> M-13', () => {
    const input = withItem('toilet', 'yes')
    input.confirmedOn = '2026-10-07'
    expect(fieldErrorsOf(input)).toEqual({ confirmedOn: [FUTURE_DATE_MESSAGE] })
  })

  it('confirmedOn today is fine; it may be later than the drive date (checked afterwards)', () => {
    const input = withItem('toilet', 'yes')
    input.confirmedOn = '2026-10-06'
    expect(roadInfoInputSchema.parse(input).confirmedOn).toBe('2026-10-06')
  })

  it('rejects a malformed confirmedOn', () => {
    const input = withItem('toilet', 'yes')
    input.confirmedOn = '2026/10/01'
    expect(fieldErrorsOf(input).confirmedOn?.length).toBeGreaterThan(0)
  })

  it('a missing item object is a validation error (the client always sends all 8)', () => {
    const input = withItem('toll', 'free') as { items: Record<string, unknown> }
    delete input.items.observatory
    expect(roadInfoInputSchema.safeParse(input).success).toBe(false)
  })
})
