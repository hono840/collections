import type { Page } from '@playwright/test'
import {
  createConfirmedUser,
  deleteTestUser,
  generateMagicLinkTokens,
  hasSupabaseTestEnv,
  uniqueTestEmail,
} from '../../helpers/supabase-test-users'

export { hasSupabaseTestEnv }

export const SKIP_REASON =
  'Needs local Supabase + SUPABASE_SERVICE_ROLE_KEY (eval "$(pnpm exec supabase status -o env)")'

export type E2eUser = { id: string; email: string }

export async function createE2eUser(label: string): Promise<E2eUser> {
  const email = uniqueTestEmail(`e2e-${label}`)
  const id = await createConfirmedUser(email)
  return { id, email }
}

export async function removeE2eUser(user: E2eUser | undefined): Promise<void> {
  if (user) await deleteTestUser(user.id)
}

/**
 * Logs in the way a user clicking the email link would (architecture 11.4):
 * generateLink -> open /auth/confirm?token_hash=...&type=email. No mailbox access.
 */
export async function loginViaMagicLink(page: Page, email: string): Promise<void> {
  const { hashedToken } = await generateMagicLinkTokens(email)
  await page.goto(`/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=email`)
}
