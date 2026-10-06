import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Pencil } from 'lucide-react'
import { RoadTypeBadge } from '@/components/atoms/RoadTypeBadge'
import { ForestRoadNote } from '@/components/molecules/ForestRoadNote'
import { getRoad } from '@/features/roads/queries'
import { getPrefectureName } from '@/lib/constants/prefectures'

export const metadata: Metadata = {
  title: '道の詳細',
}

type RoadDetailPageProps = {
  params: Promise<{ roadId: string }>
}

/**
 * S-06, minimal for Sprint 2. A missing id, another user's id and a malformed id all give the
 * same 404 (getRoad -> null). Drives, road info and the small map arrive in Sprint 3.
 */
export default async function RoadDetailPage({ params }: RoadDetailPageProps) {
  const { roadId } = await params
  const road = await getRoad(roadId)
  if (!road) notFound()

  return (
    <article aria-labelledby="road-heading" className="mx-auto w-full max-w-160 space-y-6">
      <Link
        href="/roads"
        className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary hover:underline"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        道の一覧へ
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 id="road-heading" className="heading-mincho min-w-0 text-3xl break-words text-ink">
            {road.name}
          </h1>
          <Link
            href={`/roads/${road.id}/edit`}
            className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-line-strong bg-surface-raised px-3.5 text-sm font-bold text-ink hover:bg-surface-sunken"
          >
            <Pencil aria-hidden="true" className="size-4" />
            編集
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RoadTypeBadge roadType={road.roadType} />
          <span className="text-sm text-ink-muted">{getPrefectureName(road.prefectureCode)}</span>
        </div>
      </header>

      {road.roadType === 'forest' ? <ForestRoadNote /> : null}

      <section aria-labelledby="road-pins-heading" className="rounded-md border border-line bg-surface-raised p-4">
        <h2 id="road-pins-heading" className="text-base font-bold text-ink">
          地点
        </h2>
        <ul className="mt-2 space-y-1 text-sm text-ink">
          <li>開始地点: 設定済み</li>
          <li>終了地点: {road.end ? '設定済み' : '未設定'}</li>
        </ul>
      </section>
    </article>
  )
}
