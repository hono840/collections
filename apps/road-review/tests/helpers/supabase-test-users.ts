/**
 * Test-only helpers for RLS / E2E tests against a LOCAL Supabase.
 *
 * Uses the service role key, so it must never be imported from src/.
 * Env (from `pnpm exec supabase status -o env`, either naming works):
 *   NEXT_PUBLIC_SUPABASE_URL      or API_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY or ANON_KEY / PUBLISHABLE_KEY
 *   SUPABASE_SERVICE_ROLE_KEY     or SERVICE_ROLE_KEY
 *
 * Sessions are created the same way the app logs in (architecture 11.3):
 *   admin.generateLink({ type: 'magiclink' }) -> properties.hashed_token
 *   -> anon client auth.verifyOtp({ type: 'email', token_hash })
 */
import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const supabaseTestEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.API_URL ?? '',
  anonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.ANON_KEY ??
    process.env.PUBLISHABLE_KEY ??
    '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY ?? '',
}

/** True only when every value needed to talk to the local Supabase is present. */
export const hasSupabaseTestEnv = Boolean(
  supabaseTestEnv.url && supabaseTestEnv.anonKey && supabaseTestEnv.serviceRoleKey,
)

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
} as const

export function createAdminClient(): SupabaseClient {
  return createClient(supabaseTestEnv.url, supabaseTestEnv.serviceRoleKey, clientOptions)
}

export function createAnonClient(): SupabaseClient {
  return createClient(supabaseTestEnv.url, supabaseTestEnv.anonKey, clientOptions)
}

export type TestUser = {
  id: string
  email: string
  /** anon-key client carrying this user's session (RLS applies). */
  client: SupabaseClient
}

export function uniqueTestEmail(label: string): string {
  return `rr-${label}-${randomUUID().slice(0, 8)}@example.test`
}

/** Creates a confirmed user directly (signup is disabled for the app; CEO decision 15.1). */
export async function createConfirmedUser(email: string): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true })
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)
  return data.user.id
}

export type MagicLinkTokens = {
  /** Value used by /auth/confirm?token_hash=...&type=email */
  hashedToken: string
  /** 6-digit code the email template shows via {{ .Token }} */
  emailOtp: string
}

export async function generateMagicLinkTokens(email: string): Promise<MagicLinkTokens> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error || !data.properties?.hashed_token) {
    throw new Error(`generateLink failed: ${error?.message}`)
  }
  return { hashedToken: data.properties.hashed_token, emailOtp: data.properties.email_otp }
}

export async function createTestUser(label: string): Promise<TestUser> {
  const email = uniqueTestEmail(label)
  const id = await createConfirmedUser(email)
  const { hashedToken } = await generateMagicLinkTokens(email)
  const client = createAnonClient()
  const { data, error } = await client.auth.verifyOtp({ type: 'email', token_hash: hashedToken })
  if (error || !data.session) throw new Error(`verifyOtp failed: ${error?.message}`)
  return { id, email, client }
}

export async function deleteTestUser(userId: string): Promise<void> {
  const admin = createAdminClient()
  // user_settings etc. are removed by ON DELETE CASCADE from auth.users.
  await admin.auth.admin.deleteUser(userId)
}
