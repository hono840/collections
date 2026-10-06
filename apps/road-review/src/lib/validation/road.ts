import * as z from 'zod'

// Storage values of roads.road_type, in display order (峠/スカイライン/海岸線/林道/その他).
// Must match the roads_road_type_values check constraint in 00003_roads.sql.
export const ROAD_TYPES = ['pass', 'skyline', 'coastal', 'forest', 'other'] as const

// Copy follows the UX microcopy table (M-10 to M-12; architecture ch.19-1).
export const NAME_REQUIRED_MESSAGE = '道の名前を入力してください'
export const NAME_TOO_LONG_MESSAGE = '50文字以内で入力してください'
export const PREFECTURE_REQUIRED_MESSAGE = '都道府県を選んでください'
export const ROAD_TYPE_REQUIRED_MESSAGE = '種別を選んでください'
export const START_REQUIRED_MESSAGE = '地図を動かして開始地点のピンを置いてください'
export const OUT_OF_JAPAN_MESSAGE = '日本国内の位置を指定してください'
export const COORDINATE_NOT_NUMBER_MESSAGE = '緯度と経度を数値で入力してください'

export const NAME_MAX_LENGTH = 50

// Japan bounding box (architecture 3.1). Mirrors roads_start_in_japan / roads_end_in_japan.
export const JAPAN_BOUNDS = { minLat: 20, maxLat: 46, minLng: 122, maxLng: 154 } as const

// 6 decimals is about 0.1 m.
const roundTo6 = (value: number) => Math.round(value * 1e6) / 1e6

const coordinateNumber = z.number({ error: COORDINATE_NOT_NUMBER_MESSAGE })

export const latLngSchema = z.object({
  lat: coordinateNumber
    .min(JAPAN_BOUNDS.minLat, { error: OUT_OF_JAPAN_MESSAGE })
    .max(JAPAN_BOUNDS.maxLat, { error: OUT_OF_JAPAN_MESSAGE })
    .transform(roundTo6),
  lng: coordinateNumber
    .min(JAPAN_BOUNDS.minLng, { error: OUT_OF_JAPAN_MESSAGE })
    .max(JAPAN_BOUNDS.maxLng, { error: OUT_OF_JAPAN_MESSAGE })
    .transform(roundTo6),
})

export const roadInputSchema = z.object({
  // trim() first so the length checks see the trimmed value (String.prototype.trim also removes U+3000).
  name: z
    .string({ error: NAME_REQUIRED_MESSAGE })
    .trim()
    .min(1, { error: NAME_REQUIRED_MESSAGE })
    .max(NAME_MAX_LENGTH, { error: NAME_TOO_LONG_MESSAGE }),
  // UI state starts as null (nothing selected); the output type is non-null.
  prefectureCode: z
    .number({ error: PREFECTURE_REQUIRED_MESSAGE })
    .int({ error: PREFECTURE_REQUIRED_MESSAGE })
    .min(1, { error: PREFECTURE_REQUIRED_MESSAGE })
    .max(47, { error: PREFECTURE_REQUIRED_MESSAGE })
    .nullable()
    .transform((value, context) => {
      if (value === null) {
        context.addIssue({ code: 'custom', message: PREFECTURE_REQUIRED_MESSAGE })
        return z.NEVER
      }
      return value
    }),
  roadType: z.enum(ROAD_TYPES, { error: ROAD_TYPE_REQUIRED_MESSAGE }).default('other'),
  // UI state starts as null; the output type is non-null so the action never sees a missing start pin.
  start: latLngSchema.nullable().transform((value, context) => {
    if (value === null) {
      context.addIssue({ code: 'custom', message: START_REQUIRED_MESSAGE })
      return z.NEVER
    }
    return value
  }),
  // null = no end pin (or cleared).
  end: latLngSchema.nullable(),
})

/** What the form holds and sends to createRoad / updateRoad. */
export type RoadInput = z.input<typeof roadInputSchema>
/** Validated values (trimmed name, rounded coordinates, non-null prefecture and start). */
export type RoadValues = z.output<typeof roadInputSchema>
