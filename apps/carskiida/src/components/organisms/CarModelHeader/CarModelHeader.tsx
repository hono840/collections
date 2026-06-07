import { cn } from '@/lib/utils/cn'
import { AddToCompareButton } from '@/components/molecules/AddToCompareButton'
import { FavoriteButton } from '@/components/molecules/FavoriteButton'
import { BODY_TYPE_LABELS } from '@/lib/constants/specs'
import type { CarModel } from '@/types/car'

export interface CarModelHeaderProps {
  model: CarModel
  className?: string
}

/**
 * 車種詳細ヘッダー（organism）— 写真の代わりに「型式銘板（データプレート）」風。
 * 製図のタイトルブロックを意識し、車名（明朝）・英字・ボディ/年代/生産国を一級表示する。
 */
export function CarModelHeader({ model, className }: CarModelHeaderProps) {
  const years = `${model.yearFrom}–${model.yearTo ?? '現在'}`
  const isShowcase = model.depthLevel === 'showcase'

  return (
    <header
      className={cn(
        'relative overflow-hidden rounded-lg border-2 border-ck-border-strong bg-ck-primary px-5 py-6 text-ck-bg sm:px-8 sm:py-8',
        className
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ck-num text-xs uppercase tracking-widest text-ck-bg/70">
            {model.manufacturer.nameJa} / {model.manufacturer.nameEn}
          </p>
          <h1
            className="mt-1 text-4xl text-ck-bg sm:text-5xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {model.nameJa}
          </h1>
          <p className="ck-num mt-1 text-sm uppercase tracking-wide text-ck-bg/80">
            {model.nameEn}
          </p>
        </div>

        {/* タイトルブロック（製図の図枠を模した諸元枠） */}
        <dl className="ck-num grid grid-cols-2 gap-x-6 gap-y-1 rounded-md border border-ck-bg/30 px-4 py-3 text-xs text-ck-bg/90">
          <dt className="text-ck-bg/60">BODY</dt>
          <dd className="text-right">{BODY_TYPE_LABELS[model.bodyType]}</dd>
          <dt className="text-ck-bg/60">YEARS</dt>
          <dd className="text-right">{years}</dd>
          <dt className="text-ck-bg/60">ORIGIN</dt>
          <dd className="text-right">{model.originCountry}</dd>
          {isShowcase && (
            <>
              <dt className="text-ck-bg/60">GEN</dt>
              <dd className="text-right">全{model.generations.length}世代</dd>
            </>
          )}
        </dl>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {isShowcase && (
          <span className="ck-num inline-block rounded-sm border border-ck-accent px-2 py-0.5 text-xs uppercase tracking-wide text-ck-accent">
            ◆ Showcase — 作り込み済み
          </span>
        )}
        <AddToCompareButton compareRef={`${model.manufacturer.id}:${model.slug}`} />
        <FavoriteButton favoriteRef={`${model.manufacturer.id}:${model.slug}`} />
      </div>
    </header>
  )
}
