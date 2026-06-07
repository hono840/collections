import Link from 'next/link'
import { CarCard } from '@/components/molecules/CarCard'
import type { CarModelSummary } from '@/types/car'

export interface SearchResultsProps {
  models: CarModelSummary[]
  total: number
}

/**
 * 検索結果（organism）。結果カードグリッド＋件数。0件は空状態を出す（エラーにしない）。
 */
export function SearchResults({ models, total }: SearchResultsProps) {
  if (total === 0) {
    return (
      <div className="rounded-md border border-dashed border-ck-border bg-ck-surface px-5 py-10 text-center">
        <p className="text-base text-ck-text">
          条件に一致する車種が見つかりませんでした。
        </p>
        <p className="mt-2 text-sm text-ck-text-muted">
          キーワードや絞り込みを変えてみてください。
        </p>
        <Link
          href="/search"
          className="ck-num mt-4 inline-block text-xs uppercase tracking-wide text-ck-accent hover:underline"
        >
          フィルタをリセット
        </Link>
      </div>
    )
  }

  return (
    <div>
      <p className="ck-num mb-3 text-xs uppercase tracking-wide text-ck-text-muted">
        {total} 件
      </p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {models.map((m) => (
          <li key={m.id}>
            <CarCard model={m} />
          </li>
        ))}
      </ul>
    </div>
  )
}
