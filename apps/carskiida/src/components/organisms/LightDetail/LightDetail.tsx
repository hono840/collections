import { cn } from '@/lib/utils/cn'
import { SectionHeading } from '@/components/atoms/SectionHeading'
import { SourceBadge } from '@/components/atoms/SourceBadge'
import { CompletenessMeter } from '@/components/molecules/CompletenessMeter'
import type { CarModel } from '@/types/car'

export interface LightDetailProps {
  model: CarModel
  className?: string
}

/**
 * ライト詳細（organism）— breadth 車種用。
 * 自動収録の最小情報＋出典を示し、「まだ深掘りされていない」ことを正直に明示する。
 */
export function LightDetail({ model, className }: LightDetailProps) {
  const summarySource = model.fieldSources?.summary

  return (
    <div className={cn('space-y-6', className)}>
      <section>
        <SectionHeading label="Overview">概要</SectionHeading>
        {model.summaryJa ? (
          <p className="flex flex-wrap items-baseline gap-2 text-base leading-relaxed text-ck-text">
            <span>{model.summaryJa}</span>
            {summarySource && <SourceBadge source={summarySource} />}
          </p>
        ) : (
          <p className="text-sm text-ck-text-muted">概要は収録準備中です。</p>
        )}
      </section>

      <section>
        <SectionHeading label="Completeness">データ充足度</SectionHeading>
        <CompletenessMeter value={model.completeness} />
      </section>

      <section className="rounded-md border border-dashed border-ck-border bg-ck-surface px-4 py-4">
        <p className="text-sm text-ck-text-muted">
          この車種はまだ深掘り（世代史・パーツ構造・生産地）が収録されていません。
          出典付きの詳細データを順次追加していきます。
        </p>
      </section>
    </div>
  )
}
