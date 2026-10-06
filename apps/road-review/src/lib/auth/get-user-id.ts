import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns the signed-in user's id (JWT `sub`) or null.
 * getClaims() verifies the token signature and expiry, which is enough to authorize a request.
 * Call this at the start of every Server Action and query; RLS remains the real guard.
 */
export async function getUserId(supabase: Pick<SupabaseClient, 'auth'>): Promise<string | null> {
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) return null
  return data.claims.sub
}
