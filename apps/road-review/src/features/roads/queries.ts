import 'server-only'
import * as z from 'zod'
import { getUserId } from '@/lib/auth/get-user-id'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database.types'
import type { LatLng, Road, RoadSummary, RoadType } from '@/types/road'

const roadIdSchema = z.uuid()

// user_id / visibility are deliberately not selected: they never reach the UI.
const ROAD_COLUMNS =
  'id, name, prefecture_code, road_type, start_lat, start_lng, end_lat, end_lng, created_at, updated_at'

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

function toRoadSummary(row: RoadRow): RoadSummary {
  return {
    id: row.id,
    name: row.name,
    prefectureCode: row.prefecture_code,
    roadType: row.road_type as RoadType,
    start: { lat: row.start_lat, lng: row.start_lng },
    end: toEnd(row),
    createdAt: row.created_at,
    // Sprint 2 reads the roads table directly; drive aggregates arrive with the road_summaries view (Sprint 3).
    lastDrivenOn: null,
    lastRatingOverall: null,
    driveCount: 0,
  }
}

/** The signed-in user's roads, newest first. [] when signed out. Throws on DB errors (error.tsx). */
export async function listRoadSummaries(): Promise<RoadSummary[]> {
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return []

  const { data, error } = await supabase
    .from('roads')
    .select(ROAD_COLUMNS)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Failed to load roads: ${error.message}`)

  return (data ?? []).map(toRoadSummary)
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
