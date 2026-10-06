'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import * as z from 'zod'
import { actionError, type ActionResult } from '@/lib/actions/result'
import { getUserId } from '@/lib/auth/get-user-id'
import { createClient } from '@/lib/supabase/server'
import { roadInputSchema, type RoadInput, type RoadValues } from '@/lib/validation/road'
import type { TablesInsert } from '@/types/database.types'

const UNAUTHORIZED_MESSAGE = 'ログインし直してください'
const VALIDATION_MESSAGE = '入力内容を確認してください'
const NOT_FOUND_MESSAGE = 'ページが見つかりません' // M-24
const SAVE_FAILED_MESSAGE = '保存できませんでした。もう一度お試しください。' // M-31
const ROAD_LIMIT_MESSAGE = '登録できる道は500件までです' // D-3

const roadIdSchema = z.uuid()

type RoadWriteRow = Pick<
  TablesInsert<'roads'>,
  'name' | 'prefecture_code' | 'road_type' | 'start_lat' | 'start_lng' | 'end_lat' | 'end_lng'
>

type PostgrestErrorLike = { code?: string; message?: string } | null

// user_id and visibility are never sent: the DB default auth.uid() and RLS decide ownership,
// and visibility stays at its default 'private'.
function toRoadRow(values: RoadValues): RoadWriteRow {
  return {
    name: values.name,
    prefecture_code: values.prefectureCode,
    road_type: values.roadType,
    start_lat: values.start.lat,
    start_lng: values.start.lng,
    end_lat: values.end?.lat ?? null,
    end_lng: values.end?.lng ?? null,
  }
}

function validate(input: RoadInput) {
  const parsed = roadInputSchema.safeParse(input)
  if (parsed.success) return { values: parsed.data, failure: null }
  return {
    values: null,
    failure: actionError('validation', VALIDATION_MESSAGE, z.flattenError(parsed.error).fieldErrors),
  }
}

// PGRST116: .single() found 0 rows. 42501: RLS / privilege violation. Both mean "not yours or gone".
function isNotFoundError(error: PostgrestErrorLike): boolean {
  return error?.code === 'PGRST116' || error?.code === '42501'
}

// D-3: raised by the roads_enforce_limit BEFORE INSERT trigger (00003_roads.sql).
// P0001 alone is any plpgsql RAISE, so the message must match too.
function isRoadLimitError(error: PostgrestErrorLike): boolean {
  return error?.code === 'P0001' && error.message === 'road_limit_exceeded'
}

function revalidateRoad(roadId: string) {
  revalidatePath('/roads')
  revalidatePath(`/roads/${roadId}`)
}

/** Creates a road owned by the signed-in user, then redirects to its detail page (US-02). */
export async function createRoad(input: RoadInput): Promise<ActionResult<never>> {
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return actionError('unauthorized', UNAUTHORIZED_MESSAGE)

  const { values, failure } = validate(input)
  if (!values) return failure

  const { data, error } = await supabase.from('roads').insert(toRoadRow(values)).select('id').single()
  if (isRoadLimitError(error)) return actionError('limit_exceeded', ROAD_LIMIT_MESSAGE)
  if (error || !data) return actionError('unexpected', SAVE_FAILED_MESSAGE)

  revalidateRoad(data.id)
  // redirect() throws; it is called outside any try block on purpose.
  redirect(`/roads/${data.id}`)
}

/** Updates the signed-in user's road, then redirects to its detail page (US-09 road edit). */
export async function updateRoad(roadId: string, input: RoadInput): Promise<ActionResult<never>> {
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return actionError('unauthorized', UNAUTHORIZED_MESSAGE)

  if (!roadIdSchema.safeParse(roadId).success) return actionError('not_found', NOT_FOUND_MESSAGE)

  const { values, failure } = validate(input)
  if (!values) return failure

  // RLS hides other users' roads, so their update matches 0 rows -> data null -> not_found.
  const { data, error } = await supabase
    .from('roads')
    .update(toRoadRow(values))
    .eq('id', roadId)
    .select('id')
    .maybeSingle()
  if (isNotFoundError(error)) return actionError('not_found', NOT_FOUND_MESSAGE)
  if (error) return actionError('unexpected', SAVE_FAILED_MESSAGE)
  if (!data) return actionError('not_found', NOT_FOUND_MESSAGE)

  revalidateRoad(roadId)
  redirect(`/roads/${roadId}`)
}
