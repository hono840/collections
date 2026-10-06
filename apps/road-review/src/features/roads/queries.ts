import 'server-only'
import * as z from 'zod'
import { getUserId } from '@/lib/auth/get-user-id'
import { buildCollectionStats, type CollectionStats } from '@/lib/collection/stats'
import { roundedAverage } from '@/lib/ratings/summary'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database.types'
import type { LatLng, Road, RoadSummary, RoadType } from '@/types/road'

const roadIdSchema = z.uuid()

/** Per-user road limit (roads_enforce_limit trigger in 00003_roads.sql). */
const ROAD_LIMIT = 500

// user_id / visibility are deliberately not selected: they never reach the UI.
const ROAD_COLUMNS =
  'id, name, prefecture_code, road_type, start_lat, start_lng, end_lat, end_lng, created_at, updated_at'

// road_summaries view (00004_drives_road_info.sql, security_invoker so RLS applies).
const SUMMARY_COLUMNS =
  'id, name, prefecture_code, road_type, start_lat, start_lng, end_lat, end_lng, created_at, last_driven_on, last_rating_overall, drive_count, rating_overall_sum'

type RoadRow = Pick<
  Tables<'roads'>,
  | 'id'
  | 'name'
  | 'prefecture_code'
  | 'road_type'
  | 'start_lat'
  | 'start_lng'
  | 'end_lat'
  | 'end_lng'
  | 'created_at'
  | 'updated_at'
>

function toEnd(row: RoadRow): LatLng | null {
  if (row.end_lat === null || row.end_lng === null) return null
  return { lat: row.end_lat, lng: row.end_lng }
}

function toRoad(row: RoadRow): Road {
  return {
    id: row.id,
    name: row.name,
    prefectureCode: row.prefecture_code,
    // The roads_road_type_values check constraint guarantees one of ROAD_TYPES.
    roadType: row.road_type as RoadType,
    start: { lat: row.start_lat, lng: row.start_lng },
    end: toEnd(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// View columns are nullable in the generated types; the view selects from roads (not null columns)
// and coalesces drive_count, so only the drive aggregates can really be null.
type SummaryRow = Pick<
  Tables<'road_summaries'>,
  | 'id'
  | 'name'
  | 'prefecture_code'
  | 'road_type'
  | 'start_lat'
  | 'start_lng'
  | 'end_lat'
  | 'end_lng'
  | 'created_at'
  | 'last_driven_on'
  | 'last_rating_overall'
  | 'drive_count'
  | 'rating_overall_sum'
>

function toRoadSummary(row: SummaryRow): RoadSummary {
  const driveCount = row.drive_count ?? 0
  return {
    id: row.id as string,
    name: row.name as string,
    prefectureCode: row.prefecture_code as number,
    roadType: row.road_type as RoadType,
    start: { lat: row.start_lat as number, lng: row.start_lng as number },
    end: row.end_lat === null || row.end_lng === null ? null : { lat: row.end_lat, lng: row.end_lng },
    createdAt: row.created_at as string,
    lastDrivenOn: row.last_driven_on,
    lastRatingOverall: row.last_rating_overall,
    driveCount,
    // PRD US-07 "総合 平均 X.X": sum x 10 / count, rounded half up.
    averageOverall: roundedAverage(row.rating_overall_sum ?? 0, driveCount),
  }
}

/**
 * The signed-in user's roads for the list / map: last driven first (roads without drives last),
 * then newest registration first. [] when signed out. Throws on DB errors (error.tsx).
 */
export async function listRoadSummaries(): Promise<RoadSummary[]> {
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return []

  const { data, error } = await supabase
    .from('road_summaries')
    .select(SUMMARY_COLUMNS)
    .order('last_driven_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    // D-3: matches the per-user road limit enforced by the roads_enforce_limit trigger.
    .limit(ROAD_LIMIT)
  if (error) throw new Error(`Failed to load roads: ${error.message}`)

  return (data ?? []).map(toRoadSummary)
}

/** "走った道のコレクション" numbers (PRD US-11). Zero stats when signed out. Throws on DB errors. */
export async function getCollectionStats(): Promise<CollectionStats> {
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return buildCollectionStats([])

  const { data, error } = await supabase
    .from('road_summaries')
    .select('prefecture_code, road_type, drive_count')
    .limit(ROAD_LIMIT)
  if (error) throw new Error(`Failed to load collection stats: ${error.message}`)

  return buildCollectionStats(
    (data ?? []).map((row) => ({
      prefectureCode: row.prefecture_code as number,
      roadType: row.road_type as RoadType,
      driveCount: row.drive_count ?? 0,
    })),
  )
}

/**
 * One road by id. null when the id is malformed, the user is signed out,
 * or RLS hides the row (another user's road / deleted) -> the page calls notFound().
 * Throws on unexpected DB errors.
 */
export async function getRoad(roadId: string): Promise<Road | null> {
  if (!roadIdSchema.safeParse(roadId).success) return null

  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return null

  const { data, error } = await supabase.from('roads').select(ROAD_COLUMNS).eq('id', roadId).maybeSingle()
  if (error) throw new Error(`Failed to load road: ${error.message}`)

  return data ? toRoad(data) : null
}
