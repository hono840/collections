import { z } from 'zod'
import type { VpicModel } from './sources/vpic'

/**
 * 生データ → 中間スキーマへの正規化（zod 検証）。
 * breadth 最小スキーマ（メーカー/車名/スラッグ/ボディタイプ/原産国）を満たす。
 */

export const carSeedSchema = z.object({
  manufacturerSlug: z.string().min(1),
  manufacturerName: z.string().min(1),
  nameEn: z.string().min(1),
  slug: z.string().min(1),
  bodyType: z.string().default('other'),
  originCountry: z.string().nullable().default(null),
  externalId: z.string(),
})

export type CarSeed = z.infer<typeof carSeedSchema>

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** vPIC のモデル行を中間 CarSeed に正規化する */
export function normalizeVpicModel(make: string, row: VpicModel): CarSeed | null {
  if (!row.Model_Name || !row.Make_Name) return null
  const candidate = {
    manufacturerSlug: slugify(make),
    manufacturerName: row.Make_Name,
    nameEn: row.Model_Name,
    slug: slugify(row.Model_Name),
    bodyType: 'other',
    originCountry: null,
    externalId: `vpic:${row.Model_ID}`,
  }
  const parsed = carSeedSchema.safeParse(candidate)
  return parsed.success ? parsed.data : null
}
