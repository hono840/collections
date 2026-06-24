/**
 * carskiida breadth ETL オーケストレーション。
 *
 * 使い方:
 *   pnpm etl --make=mazda --limit=50 --dry-run     # DB に書かず内容を表示
 *   pnpm etl --make=mazda --limit=50               # Supabase へ冪等 upsert
 *
 * 設計原則（docs/product/carskiida-architecture.md §3）:
 *   - 冪等 upsert（自然キー）
 *   - 値と field_source を必ずセットで書く
 *   - 欠損は NULL のまま（既存値を上書きしない）
 *   - スクレイピング転載・画像/ロゴ取込は行わない
 */
import { getModelsForMake } from './sources/vpic'
import { normalizeVpicModel, type CarSeed } from './normalize'
import { createLoaderClient, loadCarSeed } from './load'

interface Args {
  make: string
  limit: number
  dryRun: boolean
}

function parseArgs(argv: string[]): Args {
  const get = (name: string) =>
    argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
  return {
    make: get('make') ?? 'mazda',
    limit: Number(get('limit') ?? '50'),
    dryRun: argv.includes('--dry-run'),
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  console.log(`[etl] make=${args.make} limit=${args.limit} dryRun=${args.dryRun}`)

  const rows = await getModelsForMake(args.make)
  console.log(`[etl] vPIC returned ${rows.length} models`)

  const seeds: CarSeed[] = []
  const seenSlugs = new Set<string>()
  for (const row of rows) {
    const seed = normalizeVpicModel(args.make, row)
    if (!seed) continue
    if (seenSlugs.has(seed.slug)) continue // 同一スラッグの重複を除去
    seenSlugs.add(seed.slug)
    seeds.push(seed)
    if (seeds.length >= args.limit) break
  }
  console.log(`[etl] normalized ${seeds.length} unique seeds`)

  if (args.dryRun) {
    for (const s of seeds) {
      console.log(`  - ${s.manufacturerName} / ${s.nameEn} (${s.slug}) [${s.externalId}]`)
    }
    console.log('[etl] dry-run complete (no writes)')
    return
  }

  const db = createLoaderClient()
  let ok = 0
  let failed = 0
  for (const seed of seeds) {
    try {
      await loadCarSeed(db, seed)
      ok++
    } catch (e) {
      failed++
      console.error(`[etl] failed ${seed.slug}:`, (e as Error).message)
    }
  }
  console.log(`[etl] done. upserted=${ok} failed=${failed}`)

  // TODO: 検索インデックスのマテビュー REFRESH と revalidateTag Webhook を叩く
}

main().catch((e) => {
  console.error('[etl] fatal:', e)
  process.exit(1)
})
