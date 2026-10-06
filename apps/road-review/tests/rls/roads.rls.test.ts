/**
 * RLS + constraints for public.roads (architecture 3.1, 3.2, 4, 11.3; US-01 isolation, US-02).
 * Requires a local Supabase with migration 00003_roads.sql applied. Skips cleanly when env is absent:
 *   pnpm exec supabase start && pnpm exec supabase db reset
 *   set -a; eval "$(pnpm exec supabase status -o env)"; set +a; pnpm test:rls
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  createAdminClient,
  createAnonClient,
  createTestUser,
  deleteTestUser,
  hasSupabaseTestEnv,
  type TestUser,
} from '../helpers/supabase-test-users'

const roadRow = {
  name: '碓氷峠',
  prefecture_code: 10,
  road_type: 'pass',
  start_lat: 36.35,
  start_lng: 138.7,
  end_lat: 36.4,
  end_lng: 138.65,
}

describe.skipIf(!hasSupabaseTestEnv)('roads RLS (user A vs user B)', () => {
  let userA: TestUser
  let userB: TestUser
  let roadIdA: string

  async function readAsAdmin(roadId: string) {
    const { data, error } = await createAdminClient().from('roads').select('*').eq('id', roadId).maybeSingle()
    if (error) throw error
    return data
  }

  beforeAll(async () => {
    userA = await createTestUser('roads-a')
    userB = await createTestUser('roads-b')
    // Inserted the same way the app does: no user_id (DB default auth.uid()).
    const { data, error } = await userA.client.from('roads').insert(roadRow).select('id').single()
    if (error) throw error
    roadIdA = data.id
  })

  afterAll(async () => {
    if (userA) await deleteTestUser(userA.id)
    if (userB) await deleteTestUser(userB.id)
  })

  it("A's insert without user_id gets user_id = auth.uid(), visibility 'private' and road_type default", async () => {
    const row = await readAsAdmin(roadIdA)
    expect(row?.user_id).toBe(userA.id)
    expect(row?.visibility).toBe('private')

    const withoutType: Partial<typeof roadRow> = { ...roadRow }
    delete withoutType.road_type
    const { data, error } = await userA.client
      .from('roads')
      .insert({ ...withoutType, name: '種別なし' })
      .select('road_type')
      .single()
    expect(error).toBeNull()
    expect(data?.road_type).toBe('other')
  })

  it('A can read their own road', async () => {
    const { data, error } = await userA.client.from('roads').select('id, name').eq('id', roadIdA)
    expect(error).toBeNull()
    expect(data).toEqual([{ id: roadIdA, name: '碓氷峠' }])
  })

  it("B cannot select A's road (by id or by listing)", async () => {
    const byId = await userB.client.from('roads').select('*').eq('id', roadIdA)
    expect(byId.error).toBeNull()
    expect(byId.data).toEqual([])

    const all = await userB.client.from('roads').select('user_id')
    expect(all.error).toBeNull()
    expect((all.data ?? []).every((row) => row.user_id === userB.id)).toBe(true)
  })

  it("B's update of A's road affects 0 rows and A's data is unchanged", async () => {
    const { data, error } = await userB.client
      .from('roads')
      .update({ name: '乗っ取り' })
      .eq('id', roadIdA)
      .select()
    expect(error).toBeNull()
    expect(data).toEqual([])
    expect((await readAsAdmin(roadIdA))?.name).toBe('碓氷峠')
  })

  it("B's delete of A's road affects 0 rows and the road remains", async () => {
    const { data, error } = await userB.client.from('roads').delete().eq('id', roadIdA).select()
    expect(error).toBeNull()
    expect(data).toEqual([])
    expect(await readAsAdmin(roadIdA)).not.toBeNull()
  })

  it('B cannot insert a road owned by A', async () => {
    const { error } = await userB.client.from('roads').insert({ ...roadRow, user_id: userA.id })
    expect(error).not.toBeNull()
    expect(error?.code).toBe('42501')
  })

  it('A cannot hand their road over to B (user_id rewrite is rejected)', async () => {
    const { error } = await userA.client.from('roads').update({ user_id: userB.id }).eq('id', roadIdA)
    expect(error).not.toBeNull()
    expect((await readAsAdmin(roadIdA))?.user_id).toBe(userA.id)
  })

  it("visibility is constrained to 'private' (insert and update)", async () => {
    const insert = await userA.client.from('roads').insert({ ...roadRow, visibility: 'public' })
    expect(insert.error).not.toBeNull()
    expect(insert.error?.code).toBe('23514')

    const update = await userA.client.from('roads').update({ visibility: 'public' }).eq('id', roadIdA)
    expect(update.error).not.toBeNull()
    expect((await readAsAdmin(roadIdA))?.visibility).toBe('private')
  })

  it('A can update and delete their own road; updated_at is refreshed', async () => {
    const { data: created } = await userA.client
      .from('roads')
      .insert({ ...roadRow, name: '一時的な道' })
      .select('id, updated_at')
      .single()
    await new Promise((resolve) => setTimeout(resolve, 20))

    const updated = await userA.client
      .from('roads')
      .update({ name: '一時的な道（改）', end_lat: null, end_lng: null })
      .eq('id', created!.id)
      .select('name, end_lat, end_lng, updated_at')
      .single()
    expect(updated.error).toBeNull()
    expect(updated.data).toMatchObject({ name: '一時的な道（改）', end_lat: null, end_lng: null })
    expect(new Date(updated.data!.updated_at).getTime()).toBeGreaterThan(
      new Date(created!.updated_at).getTime(),
    )

    const removed = await userA.client.from('roads').delete().eq('id', created!.id).select('id')
    expect(removed.error).toBeNull()
    expect(removed.data).toHaveLength(1)
    expect(await readAsAdmin(created!.id)).toBeNull()
  })

  it('anon (signed out) has no access at all', async () => {
    const { error } = await createAnonClient().from('roads').select('*')
    expect(error).not.toBeNull()
    expect(error?.code).toBe('42501')
  })

  it("deleting the auth user cascades to the user's roads", async () => {
    const temporary = await createTestUser('roads-cascade')
    const { data } = await temporary.client.from('roads').insert(roadRow).select('id').single()
    expect(await readAsAdmin(data!.id)).not.toBeNull()

    await deleteTestUser(temporary.id)
    expect(await readAsAdmin(data!.id)).toBeNull()
  })
})

describe.skipIf(!hasSupabaseTestEnv)('roads check constraints (architecture 3.2)', () => {
  let user: TestUser

  beforeAll(async () => {
    user = await createTestUser('roads-constraints')
  })

  afterAll(async () => {
    if (user) await deleteTestUser(user.id)
  })

  async function insertExpectingCheckViolation(overrides: Record<string, unknown>) {
    const { error } = await user.client.from('roads').insert({ ...roadRow, ...overrides })
    expect(error, JSON.stringify(overrides)).not.toBeNull()
    expect(error?.code).toBe('23514')
  }

  it('name: 50 chars ok, 51 chars / empty / untrimmed rejected', async () => {
    const ok = await user.client.from('roads').insert({ ...roadRow, name: '道'.repeat(50) })
    expect(ok.error).toBeNull()
    await insertExpectingCheckViolation({ name: '道'.repeat(51) })
    await insertExpectingCheckViolation({ name: '' })
    await insertExpectingCheckViolation({ name: ' 碓氷峠 ' })
  })

  it('prefecture_code must be 1..47', async () => {
    await insertExpectingCheckViolation({ prefecture_code: 0 })
    await insertExpectingCheckViolation({ prefecture_code: 48 })
  })

  it("road_type must be one of pass/skyline/coastal/forest/other", async () => {
    await insertExpectingCheckViolation({ road_type: 'forest_road' })
    for (const roadType of ['pass', 'skyline', 'coastal', 'forest', 'other']) {
      const { error } = await user.client.from('roads').insert({ ...roadRow, road_type: roadType })
      expect(error, roadType).toBeNull()
    }
  })

  it('start pin must be inside Japan', async () => {
    await insertExpectingCheckViolation({ start_lat: 19.9 })
    await insertExpectingCheckViolation({ start_lat: 46.1 })
    await insertExpectingCheckViolation({ start_lng: 121.9 })
    await insertExpectingCheckViolation({ start_lng: 154.1 })
  })

  it('start pin is required (not null)', async () => {
    const { error } = await user.client.from('roads').insert({ ...roadRow, start_lat: null })
    expect(error).not.toBeNull()
    expect(error?.code).toBe('23502')
  })

  it('end pin: both or neither, and inside Japan', async () => {
    await insertExpectingCheckViolation({ end_lat: 36.4, end_lng: null })
    await insertExpectingCheckViolation({ end_lat: null, end_lng: 138.65 })
    await insertExpectingCheckViolation({ end_lat: 10, end_lng: 138.65 })
    const neither = await user.client.from('roads').insert({ ...roadRow, end_lat: null, end_lng: null })
    expect(neither.error).toBeNull()
  })

  it('has no speed / time / ranking columns (PRD US-14)', async () => {
    const { data, error } = await createAdminClient().from('roads').select('*').limit(1)
    expect(error).toBeNull()
    const columns = Object.keys(data?.[0] ?? {})
    expect(columns.length).toBeGreaterThan(0)
    for (const column of columns) {
      expect(column).not.toMatch(/speed|lap|time_of|duration|rank|slope|incline/i)
    }
  })
})
