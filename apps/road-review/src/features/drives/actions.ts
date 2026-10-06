'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { actionError, type ActionResult } from '@/lib/actions/result'
import { getUserId } from '@/lib/auth/get-user-id'
import { createClient } from '@/lib/supabase/server'
import { FUTURE_DATE_MESSAGE, toFieldErrors, uuidSchema } from '@/lib/validation/common'
import { driveInputSchema, type DriveInput, type DriveValues } from '@/lib/validation/drive'
import type { RoadInfoOutput } from '@/lib/validation/road-info'
import type { TablesInsert } from '@/types/database.types'

const UNAUTHORIZED_MESSAGE = 'ログインし直してください'
const VALIDATION_MESSAGE = '入力内容を確認してください'
const NOT_FOUND_MESSAGE = 'ページが見つかりません' // M-24
const SAVE_FAILED_MESSAGE = '保存できませんでした。もう一度お試しください。' // M-31

type DriveWriteRow = Pick<
  TablesInsert<'drives'>,
  | 'driven_on'
  | 'vehicle_type'
  | 'weather'
  | 'rating_overall'
  | 'rating_scenery'
  | 'rating_road_surface'
  | 'rating_ease_of_driving'
  | 'traffic'
  | 'memo'
>

type RoadInfoWriteRow = Omit<TablesInsert<'road_info'>, 'drive_id' | 'user_id' | 'created_at' | 'updated_at'> & {
  confirmed_on: string
}

type PostgrestErrorLike = { code?: string; message?: string } | null

// user_id / visibility / id are never sent: the DB default auth.uid() and RLS decide ownership,
// visibility stays 'private', and the column grants reject them anyway (42501).
function toDriveRow(values: DriveValues): DriveWriteRow {
  return {
    driven_on: values.drivenOn,
    vehicle_type: values.vehicleType,
    weather: values.weather,
    rating_overall: values.ratingOverall,
    rating_scenery: values.ratingScenery,
    rating_road_surface: values.ratingRoadSurface,
    rating_ease_of_driving: values.ratingEaseOfDriving,
    traffic: values.traffic,
    memo: values.memo,
  }
}

// confirmed_on is always sent (null -> the drive date); the road_info_guard trigger does the same as a fallback.
function toRoadInfoRow(roadInfo: RoadInfoOutput, drivenOn: string): RoadInfoWriteRow {
  const { items } = roadInfo
  return {
    confirmed_on: roadInfo.confirmedOn ?? drivenOn,
    motorcycle_ban: items.motorcycleBan.status,
    motorcycle_ban_memo: items.motorcycleBan.memo,
    night_closure: items.nightClosure.status,
    night_closure_memo: items.nightClosure.memo,
    winter_closure: items.winterClosure.status,
    winter_closure_memo: items.winterClosure.memo,
    toll: items.toll.status,
    toll_memo: items.toll.memo,
    parking: items.parking.status,
    parking_memo: items.parking.memo,
    toilet: items.toilet.status,
    toilet_memo: items.toilet.memo,
    michi_no_eki: items.michiNoEki.status,
    michi_no_eki_memo: items.michiNoEki.memo,
    observatory: items.observatory.status,
    observatory_memo: items.observatory.memo,
  }
}

function validate(input: DriveInput) {
  const parsed = driveInputSchema.safeParse(input)
  if (parsed.success) return { values: parsed.data, failure: null }
  return { values: null, failure: actionError('validation', VALIDATION_MESSAGE, toFieldErrors(parsed.error)) }
}

// PGRST116: .single() found 0 rows. 42501: RLS / privilege violation. Both mean "not yours or gone".
function isNotFoundError(error: PostgrestErrorLike): boolean {
  return error?.code === 'PGRST116' || error?.code === '42501'
}

// 23514 alone is any check violation; the trigger message tells which date was in the future.
function isTriggerError(error: PostgrestErrorLike, message: string): boolean {
  return error?.code === '23514' && (error.message ?? '').includes(message)
}

/** Maps a Postgres error to the user-facing result (architecture 7.1). */
function toErrorResult(error: NonNullable<PostgrestErrorLike>): ActionResult<never> {
  if (isNotFoundError(error)) return actionError('not_found', NOT_FOUND_MESSAGE)
  if (isTriggerError(error, 'driven_on_in_future')) {
    return actionError('validation', VALIDATION_MESSAGE, { drivenOn: [FUTURE_DATE_MESSAGE] })
  }
  if (isTriggerError(error, 'confirmed_on_in_future')) {
    return actionError('validation', VALIDATION_MESSAGE, { 'roadInfo.confirmedOn': [FUTURE_DATE_MESSAGE] })
  }
  return actionError('unexpected', SAVE_FAILED_MESSAGE)
}

function revalidateRoad(roadId: string) {
  revalidatePath('/roads')
  revalidatePath(`/roads/${roadId}`)
}

/**
 * Creates a drive record (and its road info snapshot) on the signed-in user's road,
 * then redirects to the road detail page (US-03 / US-04).
 */
export async function createDrive(roadId: string, input: DriveInput): Promise<ActionResult<never>> {
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return actionError('unauthorized', UNAUTHORIZED_MESSAGE)

  if (!uuidSchema.safeParse(roadId).success) return actionError('not_found', NOT_FOUND_MESSAGE)

  const { values, failure } = validate(input)
  if (!values) return failure

  // RLS hides other users' roads, so this is null for them (the insert policy would reject it too).
  const road = await supabase.from('roads').select('id').eq('id', roadId).maybeSingle()
  if (road.error) return toErrorResult(road.error)
  if (!road.data) return actionError('not_found', NOT_FOUND_MESSAGE)

  const drive = await supabase
    .from('drives')
    .insert({ road_id: roadId, ...toDriveRow(values) })
    .select('id')
    .single()
  if (drive.error) return toErrorResult(drive.error)
  if (!drive.data) return actionError('unexpected', SAVE_FAILED_MESSAGE)
  const driveId = drive.data.id

  if (values.roadInfo) {
    const roadInfo = await supabase
      .from('road_info')
      .insert({ drive_id: driveId, ...toRoadInfoRow(values.roadInfo, values.drivenOn) })
    if (roadInfo.error) {
      // Compensation (ch.20-9): do not leave a half-saved record behind. If this delete fails too,
      // a drive without road info remains, which is still valid data (accepted risk).
      await supabase.from('drives').delete().eq('id', driveId)
      return toErrorResult(roadInfo.error)
    }
  }

  revalidateRoad(roadId)
  // redirect() throws; it is called outside any try block on purpose.
  redirect(`/roads/${roadId}`)
}

/**
 * Updates the signed-in user's drive record and its road info, then redirects to its road (US-09 record edit).
 * road_id is never sent (immutable); the redirect target comes from the updated row, not from the client.
 */
export async function updateDrive(driveId: string, input: DriveInput): Promise<ActionResult<never>> {
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return actionError('unauthorized', UNAUTHORIZED_MESSAGE)

  if (!uuidSchema.safeParse(driveId).success) return actionError('not_found', NOT_FOUND_MESSAGE)

  const { values, failure } = validate(input)
  if (!values) return failure

  // RLS hides other users' drives, so their update matches 0 rows -> data null -> not_found.
  const drive = await supabase
    .from('drives')
    .update(toDriveRow(values))
    .eq('id', driveId)
    .select('id, road_id')
    .maybeSingle()
  if (drive.error) return toErrorResult(drive.error)
  if (!drive.data) return actionError('not_found', NOT_FOUND_MESSAGE)
  const roadId = drive.data.road_id

  if (values.roadInfo) {
    const row = toRoadInfoRow(values.roadInfo, values.drivenOn)
    // No upsert: drive_id has no UPDATE grant. Update first, insert when the drive had no row yet.
    const updated = await supabase
      .from('road_info')
      .update(row)
      .eq('drive_id', driveId)
      .select('drive_id')
      .maybeSingle()
    if (updated.error) return toErrorResult(updated.error)
    if (!updated.data) {
      const inserted = await supabase.from('road_info').insert({ drive_id: driveId, ...row })
      if (inserted.error) return toErrorResult(inserted.error)
    }
  } else {
    const removed = await supabase.from('road_info').delete().eq('drive_id', driveId)
    if (removed.error) return toErrorResult(removed.error)
  }

  revalidateRoad(roadId)
  redirect(`/roads/${roadId}`)
}
