import { expect, test, type Page } from '@playwright/test'
import { generateMagicLinkTokens } from '../helpers/supabase-test-users'
import {
  confirmMagicLinkOnPage,
  confirmUrl,
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

// Next.js injects <div role="alert" id="__next-route-announcer__">, so a bare
// getByRole('alert') is ambiguous. Match the app's alert by its text instead.
function appAlert(page: Page, text: string | RegExp) {
  return page.getByRole('alert').filter({ hasText: text })
}

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

  test('a link without token_hash shows M-23 on the confirm page with a link to /login', async ({
    page,
  }) => {
    await page.goto('/auth/confirm?type=email')
    await expect(page).toHaveURL(/\/auth\/confirm/)
    await expect(appAlert(page, LINK_INVALID_MESSAGE)).toBeVisible()
    await expect(page.getByRole('button', { name: 'ログインする' })).toHaveCount(0)
    await page.getByRole('link', { name: 'もう一度リンクを送る' }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('/auth/confirm rejects types other than email (M-23, no button)', async ({ page }) => {
    await page.goto(confirmUrl('whatever', 'recovery'))
    await expect(appAlert(page, LINK_INVALID_MESSAGE)).toBeVisible()
    await expect(page.getByRole('button', { name: 'ログインする' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'もう一度リンクを送る' })).toHaveAttribute(
      'href',
      '/login',
    )
  })

  test('/auth/confirm shows a confirm button and does not redirect on GET (S-6)', async ({
    page,
  }) => {
    await page.goto(confirmUrl('definitely-not-valid'))
    await expect(page).toHaveURL(/\/auth\/confirm\?token_hash=/)
    await expect(page.getByRole('button', { name: 'ログインする' })).toBeVisible()
    await expect(page.getByText('definitely-not-valid')).toHaveCount(0)
  })

  test('an invalid token fails only after pressing "ログインする" -> /login?error=link_invalid', async ({
    page,
  }) => {
    await confirmMagicLinkOnPage(page, 'definitely-not-valid')
    await expect(page).toHaveURL(/\/login\?error=link_invalid/)
    await expect(appAlert(page, LINK_INVALID_MESSAGE)).toBeVisible()
  })
})

test.describe('Content-Security-Policy (architecture 18.1 S-5)', () => {
  test('/login sends a nonce-based script-src without unsafe-inline', async ({ page }) => {
    const response = await page.goto('/login')
    const csp = response?.headers()['content-security-policy']
    expect(csp).toBeTruthy()

    const scriptSrc = csp!
      .split(';')
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith('script-src'))
    expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/=_-]+'/)
    expect(scriptSrc).not.toContain("'unsafe-inline'")
  })

  test('the inline theme script carries the same nonce as the header', async ({ request }) => {
    const response = await request.get('/login')
    const csp = response.headers()['content-security-policy'] ?? ''
    const headerNonce = csp.match(/'nonce-([^']+)'/)?.[1]
    expect(headerNonce).toBeTruthy()

    // Browsers hide nonce attributes from the DOM, so check the raw HTML.
    const html = await response.text()
    const inlineScripts = [...html.matchAll(/<script(?![^>]*\ssrc=)([^>]*)>/g)]
    expect(inlineScripts.length).toBeGreaterThan(0)
    for (const [, attributes] of inlineScripts) {
      expect(attributes).toContain(`nonce="${headerNonce}"`)
    }
  })

  test('two requests get different nonces', async ({ request }) => {
    const first = (await request.get('/login')).headers()['content-security-policy']
    const second = (await request.get('/login')).headers()['content-security-policy']
    const nonceOf = (value: string | undefined) => value?.match(/'nonce-([^']+)'/)?.[1]
    expect(nonceOf(first)).toBeTruthy()
    expect(nonceOf(first)).not.toBe(nonceOf(second))
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

    const { hashedToken } = await generateMagicLinkTokens(user!.email)
    await confirmMagicLinkOnPage(page, hashedToken)
    await expect(page).toHaveURL(/\/roads\?view=list$/)
  })

  test('next=https://evil.example ends on /roads', async ({ page }) => {
    await page.goto('/login?next=https%3A%2F%2Fevil.example')
    await page.getByLabel(/メールアドレス/).fill(user!.email)
    await page.getByRole('button', { name: 'ログインリンクを送る' }).click()
    await expect(page.getByText(SENT_MESSAGE)).toBeVisible()

    const { hashedToken } = await generateMagicLinkTokens(user!.email)
    await confirmMagicLinkOnPage(page, hashedToken)
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

    await expect(
      appAlert(page, 'コードが正しくないか、有効期限が切れています。もう一度お試しください。'),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('merely opening the link (GET) does not log in (mail scanner / login CSRF, S-6)', async ({
    page,
  }) => {
    const { hashedToken } = await generateMagicLinkTokens(user!.email)
    await page.goto(confirmUrl(hashedToken))
    await expect(page.getByRole('button', { name: 'ログインする' })).toBeVisible()

    await page.goto('/roads')
    await expect(page).toHaveURL(/\/login\?next=%2Froads$/)

    // The token was not consumed by the GET, so pressing the button still works.
    await confirmMagicLinkOnPage(page, hashedToken)
    await expect(page).toHaveURL(/\/roads/)
  })

  test('a used magic link cannot be reused', async ({ page, browser }) => {
    const { hashedToken } = await generateMagicLinkTokens(user!.email)
    await confirmMagicLinkOnPage(page, hashedToken)
    await expect(page).toHaveURL(/\/roads/)

    const otherContext = await browser.newContext()
    const otherPage = await otherContext.newPage()
    await otherPage.goto(confirmUrl(hashedToken))
    // GET still shows the confirm page; the failure surfaces after the press.
    await expect(otherPage.getByRole('button', { name: 'ログインする' })).toBeVisible()
    await otherPage.getByRole('button', { name: 'ログインする' }).click()
    await expect(otherPage).toHaveURL(/\/login\?error=link_invalid/)
    await expect(appAlert(otherPage, LINK_INVALID_MESSAGE)).toBeVisible()
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
