import { expect, test } from '@playwright/test'
import { createAdminClient } from '../helpers/supabase-test-users'
import {
  createE2eUser,
  hasSupabaseTestEnv,
  loginViaMagicLink,
  removeE2eUser,
  SKIP_REASON,
  type E2eUser,
} from './support/login'

// US-08 (architecture) / PRD US-13: safety notice + no geolocation anywhere.
const NOTICE_M04 =
  '運転中は操作しないでください。記録は安全な場所に停車してから、またはドライブの後に行ってください。このアプリは速度やタイムを扱わず、法律の範囲内でドライブ・ツーリングを楽しむための記録帳です。'

declare global {
  interface Window {
    __geolocationCalls: string[]
  }
}

// Wraps every Geolocation entry point before any app script runs and records calls.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__geolocationCalls = []
    const geolocation = navigator.geolocation
    if (geolocation) {
      for (const method of ['getCurrentPosition', 'watchPosition', 'clearWatch'] as const) {
        const original = geolocation[method]?.bind(geolocation)
        Object.defineProperty(geolocation, method, {
          configurable: true,
          value: (...args: unknown[]) => {
            window.__geolocationCalls.push(method)
            return (original as ((...rest: unknown[]) => unknown) | undefined)?.(...args)
          },
        })
      }
    }
    const permissions = navigator.permissions
    if (permissions?.query) {
      const originalQuery = permissions.query.bind(permissions)
      permissions.query = (descriptor: PermissionDescriptor) => {
        if (descriptor?.name === 'geolocation') window.__geolocationCalls.push('permissions.query')
        return originalQuery(descriptor)
      }
    }
  })
})

test.describe('headers and geolocation (no login needed)', () => {
  test('responses carry Permissions-Policy: geolocation=()', async ({ page }) => {
    const response = await page.goto('/login')
    expect(response).not.toBeNull()
    const policy = response!.headers()['permissions-policy'] ?? ''
    expect(policy).toMatch(/(^|,\s*)geolocation=\(\)/)
  })

  test('the login page never calls the Geolocation API', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    expect(await page.evaluate(() => window.__geolocationCalls)).toEqual([])
  })
})

test.describe('first-run safety notice', () => {
  test.skip(!hasSupabaseTestEnv, SKIP_REASON)

  let user: E2eUser | undefined

  test.beforeEach(async () => {
    user = await createE2eUser('safety')
  })

  test.afterEach(async () => {
    await removeE2eUser(user)
    user = undefined
  })

  test('shown on first login, cannot be dismissed with Esc, gone after "確認しました" (also after reload and on another device)', async ({
    page,
    browser,
  }) => {
    await loginViaMagicLink(page, user!.email)
    await expect(page).toHaveURL(/\/roads/)

    const dialog = page.getByRole('dialog', { name: 'はじめに' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(NOTICE_M04)
    await expect(dialog.getByRole('button')).toHaveCount(1)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: '確認しました' }).click()
    await expect(dialog).toBeHidden()

    await page.reload()
    await expect(page.getByRole('dialog', { name: 'はじめに' })).toHaveCount(0)

    // "Another device": a fresh browser context with its own session.
    const otherContext = await browser.newContext()
    const otherPage = await otherContext.newPage()
    await loginViaMagicLink(otherPage, user!.email)
    await expect(otherPage).toHaveURL(/\/roads/)
    await expect(otherPage.getByRole('dialog', { name: 'はじめに' })).toHaveCount(0)
    await otherContext.close()

    expect(await page.evaluate(() => window.__geolocationCalls)).toEqual([])
  })

  test('signed-in pages never call the Geolocation API', async ({ page }) => {
    await loginViaMagicLink(page, user!.email)
    await expect(page).toHaveURL(/\/roads/)
    await page.waitForLoadState('networkidle')
    expect(await page.evaluate(() => window.__geolocationCalls)).toEqual([])
  })

  // Sprint 3: the record form (/roads/[id]/drives/new) exists now.
  test('the record form always shows the safety banner (M-01) and never calls the Geolocation API', async ({
    page,
  }) => {
    const { data: road, error } = await createAdminClient()
      .from('roads')
      .insert({
        user_id: user!.id,
        name: '碓氷峠',
        prefecture_code: 10,
        road_type: 'pass',
        start_lat: 36.35,
        start_lng: 138.7,
      })
      .select('id')
      .single()
    if (error) throw error

    await loginViaMagicLink(page, user!.email)
    const dialog = page.getByRole('dialog', { name: 'はじめに' })
    if (await dialog.isVisible().catch(() => false)) await dialog.getByRole('button', { name: '確認しました' }).click()

    await page.goto(`/roads/${road.id}/drives/new`)
    const banner = page.getByRole('note').filter({ hasText: '運転中は操作しないでください' })
    await expect(banner).toBeVisible()
    await expect(banner).toContainText('記録は安全な場所に停車してから、またはドライブの後に行ってください。')
    await expect(banner.getByRole('button')).toHaveCount(0)
    await page.waitForLoadState('networkidle')
    expect(await page.evaluate(() => window.__geolocationCalls)).toEqual([])
  })
})
