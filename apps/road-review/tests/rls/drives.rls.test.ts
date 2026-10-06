/**
 * RLS + constraints for public.drives / public.road_info / public.road_summaries
 * (architecture 3.1-3.3, 4, 11.3; US-01 isolation, US-03 future date / ratings, US-04 confirmed_on default).
 * Requires a local Supabase with migrations up to 00004_drives_road_info.sql. Skips cleanly when env is absent
 * (Sprint 3: local Supabase is not available; the CEO moved DB verification to Sprint 5):
 *   pnpm exec supabase start && pnpm exec supabase db reset
 *   set -a; eval "$(pnpm exec supabase status -o env)"; set +a; pnpm test:rls
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { todayInTokyo } from '@/lib/utils/date'
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
  end_lat: null,
  end_lng: null,
}

const driveRow = {
  driven_on: '2026-09-14',
  vehicle_type: 'motorcycle',
  weather: 'sunny',
  rating_overall: 4,
  rating_scenery: 5,
  rating_road_surface: null,
  rating_ease_of_driving: 3,
  traffic: 'few',
  memo: '紅葉',
}

const noItems = {
  motorcycle_ban: null,
  night_closure: null,
  winter_closure: null,
  toll: null,
  parking: null,
  toilet: null,
  michi_no_eki: null,
  observatory: null,
}

/** JST tomorrow as YYYY-MM-DD (the DB compares with today_in_tokyo()). */
function tomorrowInTokyo(): string {
  const [year, month, day] = todayInTokyo().split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10)
}

describe.skipIf(!hasSupabaseTestEnv)('drives / road_info RLS and constraints (user A vs user B)', () => {
  let userA: TestUser
  let userB: TestUser
  let roadIdA: string
  let otherRoadIdA: string
  let driveIdA: string
  let roadIdB: string
  let driveIdB: string

  const admin = () => createAdminClient()

  async function insertRoad(user: TestUser, name: string) {
    const { data, error } = await user.client.from('roads').insert({ ...roadRow, name }).select('id').single()
    if (error) throw error
    return data.id as string
  }

  async function insertDrive(user: TestUser, roadId: string, overrides: Record<string, unknown> = {}) {
    const { data, error } = await user.client
      .from('drives')
      .insert({ ...driveRow, road_id: roadId, ...overrides })
      .select('id')
      .single()
    if (error) throw error
    return data.id as string
  }

  beforeAll(async () => {
    userA = await createTestUser('drives-a')
    userB = await createTestUser('drives-b')
    roadIdA = await insertRoad(userA, '碓氷峠')
    otherRoadIdA = await insertRoad(userA, '別の道')
    roadIdB = await insertRoad(userB, 'Bの道')
    driveIdA = await insertDrive(userA, roadIdA)
    driveIdB = await insertDrive(userB, roadIdB)
    const { error } = await userA.client
      .from('road_info')
      .insert({ drive_id: driveIdA, ...noItems, toll: 'free' })
    if (error) throw error
  })

  afterAll(async () => {
    if (userA) await deleteTestUser(userA.id)
    if (userB) await deleteTestUser(userB.id)
  })

  // ---------- ownership defaults ----------
  it("A's drive gets user_id = auth.uid() and visibility 'private' without sending them", async () => {
    const { data } = await admin().from('drives').select('user_id, visibility').eq('id', driveIdA).single()
    expect(data).toEqual({ user_id: userA.id, visibility: 'private' })
  })

  it('road_info.confirmed_on defaults to the drive date and user_id to auth.uid()', async () => {
    const { data } = await admin().from('road_info').select('confirmed_on, user_id').eq('drive_id', driveIdA).single()
    expect(data).toEqual({ confirmed_on: '2026-09-14', user_id: userA.id })
  })

  // ---------- isolation ----------
  it.each(['drives', 'road_info'])("B cannot select A's %s rows", async (table) => {
    const { data, error } = await userB.client.from(table).select('*')
    expect(error).toBeNull()
    expect((data ?? []).every((row) => (row as { user_id: string }).user_id === userB.id)).toBe(true)
  })

  it("B's road_summaries only contain B's roads (security_invoker view)", async () => {
    const { data, error } = await userB.client.from('road_summaries').select('id')
    expect(error).toBeNull()
    expect((data ?? []).map((row) => row.id)).toEqual([roadIdB])
  })

  it("B's update / delete of A's drive affect 0 rows", async () => {
    const update = await userB.client.from('drives').update({ memo: '乗っ取り' }).eq('id', driveIdA).select()
    expect(update.error).toBeNull()
    expect(update.data).toEqual([])
    const removal = await userB.client.from('drives').delete().eq('id', driveIdA).select()
    expect(removal.data).toEqual([])
    const { data } = await admin().from('drives').select('memo').eq('id', driveIdA).single()
    expect(data?.memo).toBe('紅葉')
  })

  it("B cannot insert a drive on A's road (parent ownership check) -> 42501", async () => {
    const { error } = await userB.client.from('drives').insert({ ...driveRow, road_id: roadIdA })
    expect(error?.code).toBe('42501')
  })

  it("B cannot attach road_info to A's drive -> 42501", async () => {
    const { error } = await userB.client.from('road_info').insert({ drive_id: driveIdA, ...noItems, toilet: 'yes' })
    expect(error?.code).toBe('42501')
  })

  it("B cannot move B's drive onto A's road (road_id has no UPDATE grant)", async () => {
    const { error } = await userB.client.from('drives').update({ road_id: roadIdA }).eq('id', driveIdB)
    expect(error).not.toBeNull()
    const { data } = await admin().from('drives').select('road_id').eq('id', driveIdB).single()
    expect(data?.road_id).toBe(roadIdB)
  })

  it('road_id is immutable even for the owner and even via service role (trigger road_id_is_immutable)', async () => {
    const asOwner = await userA.client.from('drives').update({ road_id: otherRoadIdA }).eq('id', driveIdA)
    expect(asOwner.error).not.toBeNull()
    const asAdmin = await admin().from('drives').update({ road_id: otherRoadIdA }).eq('id', driveIdA)
    expect(asAdmin.error?.message).toContain('road_id_is_immutable')
  })

  it.each([
    ['user_id', () => userB.id],
    ['visibility', () => 'private'],
  ])('clients cannot write %s (no column grant) -> 42501', async (column, value) => {
    const { error } = await userA.client.from('drives').insert({ ...driveRow, road_id: roadIdA, [column]: value() })
    expect(error?.code).toBe('42501')
  })

  it('anon cannot read drives / road_info / road_summaries', async () => {
    for (const table of ['drives', 'road_info', 'road_summaries']) {
      const { error } = await createAnonClient().from(table).select('*')
      expect(error, table).not.toBeNull()
    }
  })

  // ---------- constraints ----------
  it('driven_on tomorrow (JST) -> driven_on_in_future (23514); today is fine', async () => {
    const future = await userA.client.from('drives').insert({ ...driveRow, road_id: roadIdA, driven_on: tomorrowInTokyo() })
    expect(future.error?.code).toBe('23514')
    expect(future.error?.message).toContain('driven_on_in_future')

    const today = await userA.client.from('drives').insert({ ...driveRow, road_id: roadIdA, driven_on: todayInTokyo() })
    expect(today.error).toBeNull()
  })

  it('driven_on before 2000-01-01 is rejected', async () => {
    const { error } = await userA.client.from('drives').insert({ ...driveRow, road_id: roadIdA, driven_on: '1999-12-31' })
    expect(error?.code).toBe('23514')
  })

  it.each([
    ['rating_overall', 0],
    ['rating_overall', 6],
    ['rating_scenery', 0],
    ['rating_road_surface', 6],
    ['rating_ease_of_driving', 9],
    ['traffic', 'low'],
    ['weather', 'storm'],
    ['vehicle_type', 'truck'],
    ['memo', 'あ'.repeat(2001)],
  ])('%s = %j violates a check (23514)', async (column, value) => {
    const { error } = await userA.client.from('drives').insert({ ...driveRow, road_id: roadIdA, [column]: value })
    expect(error?.code).toBe('23514')
  })

  it('rating_overall is required (23502)', async () => {
    const { error } = await userA.client.from('drives').insert({ ...driveRow, road_id: roadIdA, rating_overall: null })
    expect(error?.code).toBe('23502')
  })

  it('road_info: no item recorded, a wrong toll value, a 201-char memo or a future confirmed_on are rejected', async () => {
    const driveId = await insertDrive(userA, roadIdA)
    const cases: Array<Record<string, unknown>> = [
      { ...noItems },
      { ...noItems, toll: 'yes' },
      { ...noItems, parking: 'paid' },
      { ...noItems, parking: 'yes', parking_memo: 'あ'.repeat(201) },
      { ...noItems, toilet: 'yes', confirmed_on: tomorrowInTokyo() },
    ]
    for (const row of cases) {
      const { error } = await userA.client.from('road_info').insert({ drive_id: driveId, ...row })
      expect(error, JSON.stringify(row).slice(0, 80)).not.toBeNull()
    }
  })

  it('road_info.drive_id cannot be changed', async () => {
    const otherDrive = await insertDrive(userA, roadIdA)
    const { error } = await userA.client.from('road_info').update({ drive_id: otherDrive }).eq('drive_id', driveIdA)
    expect(error).not.toBeNull()
  })

  // ---------- road_summaries ----------
  it("road_summaries: latest drive date / rating, count and sum for A's road", async () => {
    const roadId = await insertRoad(userA, '集計の道')
    await insertDrive(userA, roadId, { driven_on: '2026-05-03', rating_overall: 3 })
    await insertDrive(userA, roadId, { driven_on: '2026-09-14', rating_overall: 5 })
    await insertDrive(userA, roadId, { driven_on: '2026-07-01', rating_overall: 4 })

    const { data, error } = await userA.client
      .from('road_summaries')
      .select('last_driven_on, last_rating_overall, drive_count, rating_overall_sum')
      .eq('id', roadId)
      .single()
    expect(error).toBeNull()
    expect(data).toEqual({ last_driven_on: '2026-09-14', last_rating_overall: 5, drive_count: 3, rating_overall_sum: 12 })
  })

  it('road_summaries for a road without drives: nulls and 0', async () => {
    const roadId = await insertRoad(userA, '未走行の道')
    const { data } = await userA.client
      .from('road_summaries')
      .select('last_driven_on, last_rating_overall, drive_count')
      .eq('id', roadId)
      .single()
    expect(data).toEqual({ last_driven_on: null, last_rating_overall: null, drive_count: 0 })
  })

  // ---------- cascade ----------
  it('deleting a road removes its drives and road_info', async () => {
    const roadId = await insertRoad(userA, '消す道')
    const driveId = await insertDrive(userA, roadId)
    await userA.client.from('road_info').insert({ drive_id: driveId, ...noItems, toilet: 'yes' })

    const { error } = await userA.client.from('roads').delete().eq('id', roadId)
    expect(error).toBeNull()
    const drives = await admin().from('drives').select('id').eq('road_id', roadId)
    const roadInfo = await admin().from('road_info').select('drive_id').eq('drive_id', driveId)
    expect(drives.data).toEqual([])
    expect(roadInfo.data).toEqual([])
  })
})
