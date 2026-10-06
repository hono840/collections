import { expect, type Page } from '@playwright/test'
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

export function confirmUrl(tokenHash: string, type = 'email'): string {
  return `/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${type}`
}

/**
 * Opens the confirm page and presses "ログインする" (architecture 18.1 S-6:
 * GET only shows the page; the token is verified by the server action).
 */
export async function confirmMagicLinkOnPage(page: Page, tokenHash: string): Promise<void> {
  await page.goto(confirmUrl(tokenHash))
  await page.getByRole('button', { name: 'ログインする' }).click()
}

/**
 * Logs in the way a user clicking the email link would (architecture 11.4 / 18.1 S-6):
 * generateLink -> open /auth/confirm?token_hash=...&type=email -> press "ログインする"
 * -> wait until the app leaves /auth/confirm. No mailbox access.
 */
export async function loginViaMagicLink(page: Page, email: string): Promise<void> {
  const { hashedToken } = await generateMagicLinkTokens(email)
  await confirmMagicLinkOnPage(page, hashedToken)
  await expect(page).toHaveURL(/\/roads/)
}
