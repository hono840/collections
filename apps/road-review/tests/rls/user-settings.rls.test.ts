/**
 * RLS for public.user_settings (architecture ch.3 / ch.4, US-08).
 * Requires a local Supabase with migration 00001 applied. Skips cleanly when env is absent:
 *   pnpm exec supabase start && pnpm exec supabase db reset
 *   set -a; eval "$(pnpm exec supabase status -o env)"; set +a; pnpm test:rls
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  createAdminClient,
  createAnonClient,
  createConfirmedUser,
  createTestUser,
  deleteTestUser,
  generateMagicLinkTokens,
  hasSupabaseTestEnv,
  uniqueTestEmail,
  type TestUser,
} from '../helpers/supabase-test-users'

const ACKNOWLEDGED_AT = '2026-10-07T03:00:00.000Z'

describe.skipIf(!hasSupabaseTestEnv)('user_settings RLS (user A vs user B)', () => {
  let userA: TestUser
  let userB: TestUser

  async function readAsAdmin(userId: string) {
    const { data, error } = await createAdminClient()
      .from('user_settings')
      .select('user_id, safety_notice_acknowledged_at')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  beforeAll(async () => {
    userA = await createTestUser('a')
    userB = await createTestUser('b')
    // A acknowledges the notice the same way the app does (no user_id sent; DB default auth.uid()).
    const { error } = await userA.client
      .from('user_settings')
      .upsert({ safety_notice_acknowledged_at: ACKNOWLEDGED_AT }, { onConflict: 'user_id' })
    if (error) throw error
  })

  afterAll(async () => {
    if (userA) await deleteTestUser(userA.id)
    if (userB) await deleteTestUser(userB.id)
  })

  it('A can read their own row, and user_id defaulted to auth.uid()', async () => {
    const { data, error } = await userA.client.from('user_settings').select('*')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data?.[0].user_id).toBe(userA.id)
    expect(new Date(data?.[0].safety_notice_acknowledged_at).toISOString()).toBe(ACKNOWLEDGED_AT)
  })

  it("B cannot read A's row (filtered by id or listing all)", async () => {
    const byId = await userB.client.from('user_settings').select('*').eq('user_id', userA.id)
    expect(byId.error).toBeNull()
    expect(byId.data).toEqual([])

    const all = await userB.client.from('user_settings').select('user_id')
    expect(all.error).toBeNull()
    expect((all.data ?? []).every((row) => row.user_id === userB.id)).toBe(true)
  })

  it("B's update of A's row affects 0 rows and A's data is unchanged", async () => {
    const { data, error } = await userB.client
      .from('user_settings')
      .update({ safety_notice_acknowledged_at: null })
      .eq('user_id', userA.id)
      .select()
    expect(error).toBeNull()
    expect(data).toEqual([])

    const row = await readAsAdmin(userA.id)
    expect(row?.safety_notice_acknowledged_at).not.toBeNull()
  })

  it('B cannot insert a row for A', async () => {
    const { error } = await userB.client
      .from('user_settings')
      .insert({ user_id: userA.id, safety_notice_acknowledged_at: null })
    expect(error).not.toBeNull()
    expect(error?.code).toBe('42501')
  })

  it("B cannot overwrite A's row through upsert", async () => {
    await userB.client
      .from('user_settings')
      .upsert({ user_id: userA.id, safety_notice_acknowledged_at: null }, { onConflict: 'user_id' })
    const row = await readAsAdmin(userA.id)
    expect(row?.safety_notice_acknowledged_at).not.toBeNull()
  })

  it("B cannot delete A's row (no DELETE policy)", async () => {
    await userB.client.from('user_settings').delete().eq('user_id', userA.id)
    expect(await readAsAdmin(userA.id)).not.toBeNull()
  })

  it('A cannot hand their row over to B (user_id rewrite is rejected)', async () => {
    const { error } = await userA.client
      .from('user_settings')
      .update({ user_id: userB.id })
      .eq('user_id', userA.id)
    expect(error).not.toBeNull()
    expect(await readAsAdmin(userA.id)).not.toBeNull()
  })

  it('B can create their own row; a missing row means "not acknowledged"', async () => {
    const before = await userB.client.from('user_settings').select('*').maybeSingle()
    expect(before.error).toBeNull()
    expect(before.data).toBeNull()

    const { error } = await userB.client
      .from('user_settings')
      .upsert({ safety_notice_acknowledged_at: ACKNOWLEDGED_AT }, { onConflict: 'user_id' })
    expect(error).toBeNull()
    expect((await readAsAdmin(userB.id))?.user_id).toBe(userB.id)
    // A is still untouched
    expect(new Date((await readAsAdmin(userA.id))?.safety_notice_acknowledged_at).toISOString()).toBe(
      ACKNOWLEDGED_AT,
    )
  })

  it('updated_at is refreshed by the trigger on update', async () => {
    const before = await readAsAdmin(userA.id)
    const { data: beforeFull } = await createAdminClient()
      .from('user_settings')
      .select('updated_at')
      .eq('user_id', userA.id)
      .single()
    await new Promise((resolve) => setTimeout(resolve, 20))
    const { error } = await userA.client
      .from('user_settings')
      .update({ safety_notice_acknowledged_at: before?.safety_notice_acknowledged_at })
      .eq('user_id', userA.id)
    expect(error).toBeNull()
    const { data: afterFull } = await createAdminClient()
      .from('user_settings')
      .select('updated_at')
      .eq('user_id', userA.id)
      .single()
    expect(new Date(afterFull?.updated_at).getTime()).toBeGreaterThan(
      new Date(beforeFull?.updated_at).getTime(),
    )
  })

  it('anon (signed out) has no access at all', async () => {
    const { error } = await createAnonClient().from('user_settings').select('*')
    expect(error).not.toBeNull()
    expect(error?.code).toBe('42501')
  })

  it('deleting the auth user cascades to user_settings', async () => {
    const temporary = await createTestUser('cascade')
    await temporary.client
      .from('user_settings')
      .upsert({ safety_notice_acknowledged_at: ACKNOWLEDGED_AT }, { onConflict: 'user_id' })
    expect(await readAsAdmin(temporary.id)).not.toBeNull()

    await deleteTestUser(temporary.id)
    expect(await readAsAdmin(temporary.id)).toBeNull()
  })
})

describe.skipIf(!hasSupabaseTestEnv)('magic link token_hash flow (architecture 15 Sprint 1)', () => {
  let userId: string | undefined

  afterAll(async () => {
    if (userId) await deleteTestUser(userId)
  })

  it("generateLink's hashed_token is accepted by verifyOtp({ type: 'email' }) exactly once", async () => {
    const email = uniqueTestEmail('link')
    userId = await createConfirmedUser(email)
    const { hashedToken, emailOtp } = await generateMagicLinkTokens(email)
    expect(emailOtp).toMatch(/^\d{6}$/)

    const first = await createAnonClient().auth.verifyOtp({ type: 'email', token_hash: hashedToken })
    expect(first.error).toBeNull()
    expect(first.data.session?.user.id).toBe(userId)

    const reused = await createAnonClient().auth.verifyOtp({ type: 'email', token_hash: hashedToken })
    expect(reused.error).not.toBeNull()
  })

  it('the 6-digit email_otp works with verifyOtp({ email, token, type: "email" })', async () => {
    const email = uniqueTestEmail('otp')
    const id = await createConfirmedUser(email)
    try {
      const { emailOtp } = await generateMagicLinkTokens(email)
      const { data, error } = await createAnonClient().auth.verifyOtp({
        email,
        token: emailOtp,
        type: 'email',
      })
      expect(error).toBeNull()
      expect(data.session?.user.id).toBe(id)
    } finally {
      await deleteTestUser(id)
    }
  })

  it('signInWithOtp with shouldCreateUser:false does not create an account for an unknown email', async () => {
    const email = uniqueTestEmail('stranger')
    await createAnonClient().auth.signInWithOtp({ email, options: { shouldCreateUser: false } })

    const { data } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 })
    expect(data.users.some((user) => user.email === email)).toBe(false)
  })
})
