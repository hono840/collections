import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import { CompletenessMeter } from '@/components/molecules/CompletenessMeter'
import { AddToCompareButton } from '@/components/molecules/AddToCompareButton'
import { FavoriteButton } from '@/components/molecules/FavoriteButton'
import { BODY_TYPE_LABELS } from '@/lib/constants/specs'
import type { CarModelSummary } from '@/types/car'

export interface CarCardProps {
  model: CarModelSummary
  className?: string
}

/**
 * 一覧カード（molecule）。
 * breadth/depth を透過的に並べ、depth には Showcase バッジを付ける。
 * 比較ボタンはリンクの入れ子を避けるため兄弟要素として重ねる。
 */
export function CarCard({ model, className }: CarCardProps) {
  const years = `${model.yearFrom}–${model.yearTo ?? '現在'}`
  const isShowcase = model.depthLevel === 'showcase'
  const compareRef = `${model.manufacturerSlug}:${model.slug}`

  return (
    <div className={cn('relative', className)}>
      <Link
        href={`/cars/${model.manufacturerSlug}/${model.slug}`}
        className="group flex flex-col rounded-md border border-ck-border bg-ck-surface px-4 py-4 transition-colors hover:border-ck-accent"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="ck-num text-xs uppercase tracking-wide text-ck-text-muted">
              {model.manufacturerNameJa}
            </p>
            <h3
              className="mt-0.5 text-xl text-ck-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {model.nameJa}
            </h3>
          </div>
          {isShowcase && (
            <span className="ck-num shrink-0 rounded-sm border border-ck-accent px-1.5 py-0.5 text-xs uppercase tracking-wide text-ck-accent">
              ◆ Showcase
            </span>
          )}
        </div>

        <dl className="ck-num mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ck-text-muted">
          <div className="flex gap-1">
            <dt className="text-ck-text-muted/70">BODY</dt>
            <dd>{BODY_TYPE_LABELS[model.bodyType]}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ck-text-muted/70">YEARS</dt>
            <dd>{years}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ck-text-muted/70">ORIGIN</dt>
            <dd>{model.originCountry}</dd>
          </div>
        </dl>

        <div className="mt-3 pr-40">
          <CompletenessMeter value={model.completeness} />
        </div>
      </Link>

      <div className="absolute bottom-4 right-4 flex gap-1.5">
        <FavoriteButton favoriteRef={compareRef} />
        <AddToCompareButton compareRef={compareRef} />
      </div>
    </div>
  )
}
