import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { CarSeed } from './normalize'

/**
 * Supabase への冪等ロード（service_role / RLS バイパス）。
 * 値の upsert と field_source の記録を必ずセットで行う（出典なしの値を作らない）。
 *
 * 環境変数: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
export function createLoaderClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'ETL に NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です'
    )
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** メーカーを upsert し id を返す */
async function upsertManufacturer(
  db: SupabaseClient,
  seed: CarSeed
): Promise<number> {
  const { data, error } = await db
    .from('manufacturer')
    .upsert(
      {
        slug: seed.manufacturerSlug,
        name_ja: seed.manufacturerName,
        name_en: seed.manufacturerName,
        primary_source: 'vpic',
      },
      { onConflict: 'slug' }
    )
    .select('id')
    .single()
  if (error) throw error
  return data.id as number
}

/** 車種を breadth として upsert（既存値は壊さない・冪等） */
async function upsertCarModel(
  db: SupabaseClient,
  manufacturerId: number,
  seed: CarSeed
): Promise<number> {
  const { data, error } = await db
    .from('car_model')
    .upsert(
      {
        manufacturer_id: manufacturerId,
        slug: seed.slug,
        name_ja: seed.nameEn, // 日本語名は後段で Wikidata 等から補完
        name_en: seed.nameEn,
        body_type: seed.bodyType,
        origin_country: seed.originCountry,
        depth_level: 'breadth',
        primary_source: 'vpic',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'manufacturer_id,slug' }
    )
    .select('id')
    .single()
  if (error) throw error
  return data.id as number
}

/** フィールド単位の出典を記録（値と原子的に） */
async function recordFieldSource(
  db: SupabaseClient,
  entityId: number,
  field: string,
  externalRef: string
): Promise<void> {
  const { error } = await db.from('field_source').upsert(
    {
      entity_type: 'car_model',
      entity_id: entityId,
      field_name: field,
      source_type: 'vpic',
      source_url: 'https://vpic.nhtsa.dot.gov/api/',
      source_ref: externalRef,
      license: 'public-domain',
      confidence: 40,
      retrieved_at: new Date().toISOString(),
    },
    { onConflict: 'entity_type,entity_id,field_name' }
  )
  if (error) throw error
}

export async function loadCarSeed(
  db: SupabaseClient,
  seed: CarSeed
): Promise<void> {
  const manufacturerId = await upsertManufacturer(db, seed)
  const modelId = await upsertCarModel(db, manufacturerId, seed)
  await recordFieldSource(db, modelId, 'name_en', seed.externalId)
  await recordFieldSource(db, modelId, 'body_type', seed.externalId)
}
