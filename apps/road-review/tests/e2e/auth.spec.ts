import { expect, test, type Page } from '@playwright/test'
import { generateMagicLinkTokens } from '../helpers/supabase-test-users'
import {
  createE2eUser,
  hasSupabaseTestEnv,
  loginViaMagicLink,
  removeE2eUser,
  SKIP_REASON,
  type E2eUser,
} from './support/login'

// US-01 (login) — architecture 11.5 / CEO decisions 15.1
const SENT_MESSAGE = /にログイン用のメールを送りました/
const LINK_INVALID_MESSAGE =
  'ログインリンクの有効期限が切れているか、すでに使われています。もう一度メールアドレスを入力してください。'

async function acknowledgeSafetyNoticeIfShown(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'はじめに' })
  if (await dialog.isVisible()) {
    await dialog.getByRole('button', { name: '確認しました' }).click()
    await expect(dialog).toBeHidden()
  }
}

test.describe('unauthenticated access', () => {
  test('a protected page redirects to /login?next=<original path>', async ({ page }) => {
    await page.goto('/roads')
    await expect(page).toHaveURL(/\/login\?next=%2Froads$/)
    await expect(page.getByLabel(/メールアドレス/)).toBeVisible()
  })

  test('the query string is kept in next', async ({ page }) => {
    await page.goto('/roads?view=list')
    const url = new URL(page.url())
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('next')).toBe('/roads?view=list')
  })

  test('/ goes to /login as well', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('invalid email shows M-21 and does not send', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/メールアドレス/).fill('not-an-email')
    await page.getByRole('button', { name: 'ログインリンクを送る' }).click()
    await expect(page.getByText('メールアドレスの形式が正しくありません')).toBeVisible()
    await expect(page.getByText(SENT_MESSAGE)).toHaveCount(0)
  })

  test('the login page shows the policy footer (M-29)', async ({ page }) => {
    await page.goto('/login')
    await expect(
      page.getByText('法律の範囲内で楽しむための記録帳です。速度やタイムは扱いません。'),
    ).toBeVisible()
  })

  test('an invalid or used link lands on /login?error=link_invalid with M-23', async ({ page }) => {
    await page.goto('/auth/confirm?token_hash=definitely-not-valid&type=email')
    await expect(page).toHaveURL(/\/login\?error=link_invalid/)
    await expect(page.getByRole('alert')).toContainText(LINK_INVALID_MESSAGE)
  })

  test('/auth/confirm rejects types other than email', async ({ page }) => {
    await page.goto('/auth/confirm?token_hash=whatever&type=recovery')
    await expect(page).toHaveURL(/\/login\?error=link_invalid/)
  })
})

test.describe('login with a real local Supabase', () => {
  test.skip(!hasSupabaseTestEnv, SKIP_REASON)

  let user: E2eUser | undefined

  test.beforeEach(async () => {
    user = await createE2eUser('auth')
  })

  test.afterEach(async () => {
    await removeE2eUser(user)
    user = undefined
  })

  test('sending shows the sent message and the 6-digit code field on the same screen', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.getByLabel(/メールアドレス/).fill(user!.email)
    await page.getByRole('button', { name: 'ログインリンクを送る' }).click()

    await expect(page.getByText(SENT_MESSAGE)).toBeVisible()
    await expect(page.getByLabel(/6桁のコード/)).toBeVisible()
  })

  test('an unknown address gets the exact same message (no account enumeration)', async ({
    page,
  }) => {
    const unknownEmail = `nobody-${Date.now()}@example.test`
    await page.goto('/login')
    await page.getByLabel(/メールアドレス/).fill(unknownEmail)
    await page.getByRole('button', { name: 'ログインリンクを送る' }).click()

    await expect(page.getByText(SENT_MESSAGE)).toBeVisible()
    await expect(page.getByText(unknownEmail, { exact: false })).toBeVisible()
    await expect(page.getByLabel(/6桁のコード/)).toBeVisible()
  })

  test('magic link login returns to the original page (rr_next)', async ({ page }) => {
    await page.goto('/roads?view=list')
    await expect(page).toHaveURL(/\/login\?next=/)
    await page.getByLabel(/メールアドレス/).fill(user!.email)
    await page.getByRole('button', { name: 'ログインリンクを送る' }).click()
    await expect(page.getByText(SENT_MESSAGE)).toBeVisible()

    const rrNext = (await page.context().cookies()).find((cookie) => cookie.name === 'rr_next')
    expect(rrNext?.httpOnly).toBe(true)

    await loginViaMagicLink(page, user!.email)
    await expect(page).toHaveURL(/\/roads\?view=list$/)
  })

  test('next=https://evil.example ends on /roads', async ({ page }) => {
    await page.goto('/login?next=https%3A%2F%2Fevil.example')
    await page.getByLabel(/メールアドレス/).fill(user!.email)
    await page.getByRole('button', { name: 'ログインリンクを送る' }).click()
    await expect(page.getByText(SENT_MESSAGE)).toBeVisible()

    await loginViaMagicLink(page, user!.email)
    await expect(page).toHaveURL(/\/roads$/)
  })

  test('6-digit code login works (CEO decision 15.1)', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/メールアドレス/).fill(user!.email)
    await page.getByRole('button', { name: 'ログインリンクを送る' }).click()
    await expect(page.getByLabel(/6桁のコード/)).toBeVisible()

    // Issue a fresh code through the admin API instead of reading the mailbox.
    const { emailOtp } = await generateMagicLinkTokens(user!.email)
    await page.getByLabel(/6桁のコード/).fill(emailOtp)
    await page.getByRole('button', { name: /ログインする/ }).click()

    await expect(page).toHaveURL(/\/roads$/)
  })

  test('a wrong code shows an error and stays on /login', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/メールアドレス/).fill(user!.email)
    await page.getByRole('button', { name: 'ログインリンクを送る' }).click()
    await page.getByLabel(/6桁のコード/).fill('000000')
    await page.getByRole('button', { name: /ログインする/ }).click()

    await expect(page.getByRole('alert')).toContainText(
      'コードが正しくないか、有効期限が切れています。もう一度お試しください。',
    )
    await expect(page).toHaveURL(/\/login/)
  })

  test('a used magic link cannot be reused', async ({ page, browser }) => {
    const { hashedToken } = await generateMagicLinkTokens(user!.email)
    await page.goto(`/auth/confirm?token_hash=${hashedToken}&type=email`)
    await expect(page).toHaveURL(/\/roads/)

    const otherContext = await browser.newContext()
    const otherPage = await otherContext.newPage()
    await otherPage.goto(`/auth/confirm?token_hash=${hashedToken}&type=email`)
    await expect(otherPage).toHaveURL(/\/login\?error=link_invalid/)
    await otherContext.close()
  })

  test('a signed-in user opening /login is sent to /roads', async ({ page }) => {
    await loginViaMagicLink(page, user!.email)
    await expect(page).toHaveURL(/\/roads/)
    await page.goto('/login')
    await expect(page).toHaveURL(/\/roads$/)
  })

  test('logout clears the session; Back does not reveal protected content', async ({ page }) => {
    await loginViaMagicLink(page, user!.email)
    await expect(page).toHaveURL(/\/roads/)
    await acknowledgeSafetyNoticeIfShown(page)

    await page.getByRole('button', { name: 'ログアウト' }).click()
    await expect(page).toHaveURL(/\/login/)

    await page.goBack()
    await page.reload()
    await expect(page).toHaveURL(/\/login/)
  })
})
