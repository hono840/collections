import 'server-only'
import { getUserId } from '@/lib/auth/get-user-id'
import { pickLatestRoadInfo, type LatestRoadInfo } from '@/lib/road-info/latest'
import { createClient } from '@/lib/supabase/server'
import { uuidSchema } from '@/lib/validation/common'
import type { Tables } from '@/types/database.types'
import type {
  Drive,
  DriveWithRoadInfo,
  PresenceStatus,
  RoadInfoItems,
  RoadInfoValues,
  TollStatus,
  TrafficLevel,
  VehicleType,
  Weather,
} from '@/types/drive'

// user_id / visibility are deliberately not selected: they never reach the UI.
const DRIVE_COLUMNS =
  'id, road_id, driven_on, vehicle_type, weather, rating_overall, rating_scenery, rating_road_surface, rating_ease_of_driving, traffic, memo, created_at, updated_at'

const ROAD_INFO_ITEM_COLUMNS =
  'motorcycle_ban, motorcycle_ban_memo, night_closure, night_closure_memo, winter_closure, winter_closure_memo, toll, toll_memo, parking, parking_memo, toilet, toilet_memo, michi_no_eki, michi_no_eki_memo, observatory, observatory_memo'

const ROAD_INFO_COLUMNS = `confirmed_on, created_at, ${ROAD_INFO_ITEM_COLUMNS}`

type DriveRow = Omit<Tables<'drives'>, 'user_id' | 'visibility'>
type RoadInfoRow = Pick<
  Tables<'road_info'>,
  | 'confirmed_on'
  | 'created_at'
  | 'motorcycle_ban'
  | 'motorcycle_ban_memo'
  | 'night_closure'
  | 'night_closure_memo'
  | 'winter_closure'
  | 'winter_closure_memo'
  | 'toll'
  | 'toll_memo'
  | 'parking'
  | 'parking_memo'
  | 'toilet'
  | 'toilet_memo'
  | 'michi_no_eki'
  | 'michi_no_eki_memo'
  | 'observatory'
  | 'observatory_memo'
>

// The check constraints in 00004 guarantee these values; the casts only narrow `string`.
function toDrive(row: DriveRow): Drive {
  return {
    id: row.id,
    roadId: row.road_id,
    drivenOn: row.driven_on,
    vehicleType: row.vehicle_type as VehicleType | null,
    weather: row.weather as Weather | null,
    ratingOverall: row.rating_overall,
    ratingScenery: row.rating_scenery,
    ratingRoadSurface: row.rating_road_surface,
    ratingEaseOfDriving: row.rating_ease_of_driving,
    traffic: row.traffic as TrafficLevel | null,
    memo: row.memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const presence = (value: string | null) => value as PresenceStatus | null

function toRoadInfoItems(row: RoadInfoRow): RoadInfoItems {
  return {
    motorcycleBan: { status: presence(row.motorcycle_ban), memo: row.motorcycle_ban_memo },
    nightClosure: { status: presence(row.night_closure), memo: row.night_closure_memo },
    winterClosure: { status: presence(row.winter_closure), memo: row.winter_closure_memo },
    toll: { status: row.toll as TollStatus | null, memo: row.toll_memo },
    parking: { status: presence(row.parking), memo: row.parking_memo },
    toilet: { status: presence(row.toilet), memo: row.toilet_memo },
    michiNoEki: { status: presence(row.michi_no_eki), memo: row.michi_no_eki_memo },
    observatory: { status: presence(row.observatory), memo: row.observatory_memo },
  }
}

function toRoadInfoValues(row: RoadInfoRow): RoadInfoValues {
  return { confirmedOn: row.confirmed_on, items: toRoadInfoItems(row) }
}

/** The 1:1 embed may come back as an object, null, or a 0/1-element array depending on relationship detection. */
function firstEmbedded<TRow>(embedded: TRow | TRow[] | null | undefined): TRow | null {
  if (Array.isArray(embedded)) return embedded[0] ?? null
  return embedded ?? null
}

/** The road's drives, newest first (driven_on desc, then created_at desc; US-07). [] when signed out. */
export async function listDrives(roadId: string): Promise<Drive[]> {
  if (!uuidSchema.safeParse(roadId).success) return []

  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return []

  const { data, error } = await supabase
    .from('drives')
    .select(DRIVE_COLUMNS)
    .eq('road_id', roadId)
    .order('driven_on', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Failed to load drives: ${error.message}`)

  return (data ?? []).map(toDrive)
}

/**
 * One drive of one road, with its road info. Filters both ids, so a drive of another road is null (404).
 * null when ids are malformed, signed out, or RLS hides it. Throws on unexpected DB errors.
 */
export async function getDrive(roadId: string, driveId: string): Promise<DriveWithRoadInfo | null> {
  if (!uuidSchema.safeParse(roadId).success || !uuidSchema.safeParse(driveId).success) return null

  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return null

  const { data, error } = await supabase
    .from('drives')
    .select(`${DRIVE_COLUMNS}, road_info (${ROAD_INFO_COLUMNS})`)
    .eq('id', driveId)
    .eq('road_id', roadId)
    .maybeSingle()
  if (error) throw new Error(`Failed to load drive: ${error.message}`)
  if (!data) return null

  const { road_info: embedded, ...driveRow } = data as DriveRow & {
    road_info: RoadInfoRow | RoadInfoRow[] | null
  }
  const roadInfoRow = firstEmbedded(embedded)
  return { ...toDrive(driveRow), roadInfo: roadInfoRow ? toRoadInfoValues(roadInfoRow) : null }
}

/**
 * Latest road info of a road, decided per item (newest confirmed_on, then created_at; US-04).
 * Every item null when ids are malformed or signed out. Throws on DB errors.
 */
export async function getLatestRoadInfo(roadId: string): Promise<LatestRoadInfo> {
  if (!uuidSchema.safeParse(roadId).success) return pickLatestRoadInfo([])

  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return pickLatestRoadInfo([])

  // A road has few drives, so drives_road_driven_idx is enough for the inner join filter.
  const { data, error } = await supabase
    .from('road_info')
    .select(`${ROAD_INFO_COLUMNS}, drives!inner (road_id)`)
    .eq('drives.road_id', roadId)
  if (error) throw new Error(`Failed to load road info: ${error.message}`)

  const rows = (data ?? []) as RoadInfoRow[]
  return pickLatestRoadInfo(
    rows.map((row) => ({ confirmedOn: row.confirmed_on, createdAt: row.created_at, items: toRoadInfoItems(row) })),
  )
}
