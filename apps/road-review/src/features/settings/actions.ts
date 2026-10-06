'use server'

import { revalidatePath } from 'next/cache'
import { actionError, actionOk, type ActionResult } from '@/lib/actions/result'
import { getUserId } from '@/lib/auth/get-user-id'
import { createClient } from '@/lib/supabase/server'

const UNAUTHORIZED_MESSAGE = 'ログインし直してください'
const SAVE_FAILED_MESSAGE = '保存できませんでした。もう一度お試しください。'

/** Records that the signed-in user acknowledged the safety notice (US-08). */
export async function acknowledgeSafetyNotice(): Promise<ActionResult> {
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return actionError('unauthorized', UNAUTHORIZED_MESSAGE)

  // user_id is omitted on purpose: the DB default auth.uid() fills it and RLS checks it.
  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { safety_notice_acknowledged_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  if (error) return actionError('unexpected', SAVE_FAILED_MESSAGE)

  revalidatePath('/', 'layout')
  return actionOk(undefined)
}
