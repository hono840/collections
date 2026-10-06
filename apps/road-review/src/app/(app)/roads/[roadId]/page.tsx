import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Pencil } from 'lucide-react'
import { Plus } from 'lucide-react'
import { RoadTypeBadge } from '@/components/atoms/RoadTypeBadge'
import { ForestRoadNote } from '@/components/molecules/ForestRoadNote'
import { RatingSummary } from '@/components/molecules/RatingSummary'
import { RoadInfoSummary } from '@/components/molecules/RoadInfoSummary'
import { DriveList } from '@/components/organisms/DriveList'
import { RoadDetailTemplate } from '@/components/templates/RoadDetailTemplate'
import { getLatestRoadInfo, listDrives } from '@/features/drives/queries'
import { getRoad } from '@/features/roads/queries'
import { getPrefectureName } from '@/lib/constants/prefectures'
import { summarizeDrives } from '@/lib/ratings/summary'

export const metadata: Metadata = {
  title: '道の詳細',
}

type RoadDetailPageProps = {
  params: Promise<{ roadId: string }>
}

const HEADING_ID = 'road-heading'

/**
 * S-06 (US-07 / US-04 display; PRD US-08). A missing id, another user's id and a malformed id all give the
 * same 404 (getRoad -> null). The three reads run in parallel; drives / road info of a hidden road come back
 * empty through RLS, and the page 404s before rendering them anyway.
 */
export default async function RoadDetailPage({ params }: RoadDetailPageProps) {
  const { roadId } = await params
  const [road, drives, latestRoadInfo] = await Promise.all([
    getRoad(roadId),
    listDrives(roadId),
    getLatestRoadInfo(roadId),
  ])
  if (!road) notFound()

  const driveCount = drives.length
  const lastDrivenOn = drives.reduce<string | null>(
    (latest, drive) => (latest === null || drive.drivenOn > latest ? drive.drivenOn : latest),
    null,
  )
  const addDriveHref = `/roads/${road.id}/drives/new`

  return (
    <RoadDetailTemplate
      labelledBy={HEADING_ID}
      header={
        <header className="space-y-3">
          <Link
            href="/roads"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary hover:underline"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            道の一覧へ
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 id={HEADING_ID} className="heading-mincho min-w-0 text-3xl break-words text-ink">
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
          {driveCount > 0 && lastDrivenOn ? (
            <p className="num text-sm text-ink-muted">{`走った回数 ${driveCount}回・最後 ${lastDrivenOn}`}</p>
          ) : null}
        </header>
      }
      notice={road.roadType === 'forest' ? <ForestRoadNote /> : undefined}
      ratings={driveCount > 0 ? <RatingSummary summary={summarizeDrives(drives)} /> : undefined}
      roadInfo={<RoadInfoSummary info={latestRoadInfo} />}
      pins={
        <section aria-labelledby="road-pins-heading" className="rounded-md border border-line bg-surface-raised p-4">
          <h2 id="road-pins-heading" className="text-base font-bold text-ink">
            地点
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-ink">
            <li>開始地点: 設定済み</li>
            <li>終了地点: {road.end ? '設定済み' : '未設定'}</li>
          </ul>
        </section>
      }
      drives={
        <section aria-labelledby="road-drives-heading">
          <h2 id="road-drives-heading" className="mb-3 text-lg font-bold text-ink">
            走行記録
          </h2>
          <DriveList roadId={road.id} drives={drives} />
        </section>
      }
      actions={
        driveCount > 0 ? (
          <Link
            href={addDriveHref}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm border border-transparent bg-primary px-5 text-base font-bold text-on-primary transition-colors duration-140 ease-standard hover:bg-primary-hover active:bg-primary-active md:w-auto"
          >
            <Plus aria-hidden="true" className="size-5" />
            走行記録を追加
          </Link>
        ) : undefined
      }
    />
  )
}
