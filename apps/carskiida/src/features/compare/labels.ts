import { seedModels } from '@/lib/seed'

/**
 * 比較 ref（"manufacturer:model"）→ 表示ラベルのクライアント安全な解決。
 * seed は純データのためクライアントバンドルに含めて問題ない（件数も小さい）。
 * Supabase 移行後は軽量な一覧キャッシュに差し替える。
 */
const labelMap = new Map(
  seedModels.map((m) => [
    `${m.manufacturer.id}:${m.slug}`,
    `${m.manufacturer.nameJa} ${m.nameJa}`,
  ])
)

export function compareLabel(ref: string): string {
  return labelMap.get(ref) ?? ref
}
