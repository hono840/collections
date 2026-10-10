import * as z from 'zod'
import { notFutureDateSchema, optionalRatingSchema, ratingSchema } from './common'
import { roadInfoInputSchema } from './road-info'

// Drive record input (architecture ch.8). Enums must match the drives check constraints in 00004.
// No speed / time / lap / ranking fields by design (PRD US-14).

export const VEHICLE_TYPES = ['car', 'motorcycle'] as const
export const WEATHERS = ['sunny', 'cloudy', 'rain', 'snow', 'other'] as const
/** A situation of the day, not a score. */
export const TRAFFIC_LEVELS = ['few', 'normal', 'many'] as const

export type VehicleType = (typeof VEHICLE_TYPES)[number]
export type Weather = (typeof WEATHERS)[number]
export type TrafficLevel = (typeof TRAFFIC_LEVELS)[number]

export const MIN_DRIVEN_ON = '2000-01-01'
export const DRIVEN_ON_TOO_OLD_MESSAGE = '2000年1月1日以降の日付を選んでください'
export const OVERALL_REQUIRED_MESSAGE = '総合評価を選んでください' // M-14
export const MEMO_MAX_LENGTH = 2000
export const MEMO_TOO_LONG_MESSAGE = '2000文字以内で入力してください'

/**
 * Form state starts as null (nothing selected) -> M-14. A missing key is treated the same way.
 * The output type is a non-null 1..5 integer.
 */
const requiredOverallSchema = ratingSchema
  .nullable()
  .optional()
  .transform((value, context) => {
    if (value === null || value === undefined) {
      context.addIssue({ code: 'custom', message: OVERALL_REQUIRED_MESSAGE })
      return z.NEVER
    }
    return value
  })

// roadId is not part of the input: createDrive(roadId, input) takes it separately and
// updateDrive(driveId, input) never changes it (road_id is immutable). Unknown keys are stripped.
export const driveInputSchema = z.object({
  drivenOn: notFutureDateSchema.refine((value) => value >= MIN_DRIVEN_ON, { error: DRIVEN_ON_TOO_OLD_MESSAGE }),
  vehicleType: z.enum(VEHICLE_TYPES).nullable(),
  weather: z.enum(WEATHERS).nullable(),
  ratingOverall: requiredOverallSchema,
  ratingScenery: optionalRatingSchema,
  ratingRoadSurface: optionalRatingSchema,
  ratingEaseOfDriving: optionalRatingSchema,
  traffic: z.enum(TRAFFIC_LEVELS).nullable(),
  memo: z.string().max(MEMO_MAX_LENGTH, { error: MEMO_TOO_LONG_MESSAGE }).default(''),
  // null -> no road_info row.
  roadInfo: roadInfoInputSchema.nullable(),
})

/** What DriveForm holds and sends to createDrive / updateDrive. */
export type DriveInput = z.input<typeof driveInputSchema>
/** Validated values (non-null ratingOverall, memo defaulted). */
export type DriveValues = z.output<typeof driveInputSchema>
