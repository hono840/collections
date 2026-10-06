import 'server-only'
import { getUserId } from '@/lib/auth/get-user-id'
import { createClient } from '@/lib/supabase/server'

export type UserSettings = {
  /** null = the safety notice has not been acknowledged yet (also when no row exists). */
  safetyNoticeAcknowledgedAt: string | null
}

/** Returns null when signed out. Throws on DB errors (handled by error.tsx). */
export async function getUserSettings(): Promise<UserSettings | null> {
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return null

  const { data, error } = await supabase
    .from('user_settings')
    .select('safety_notice_acknowledged_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`Failed to load user settings: ${error.message}`)

  return { safetyNoticeAcknowledgedAt: data?.safety_notice_acknowledged_at ?? null }
}
