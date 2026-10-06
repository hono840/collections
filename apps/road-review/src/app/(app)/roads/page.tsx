import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { RoadList } from '@/components/organisms/RoadList'
import { RoadsMap } from '@/components/organisms/RoadsMap'
import { RoadsIndexTemplate } from '@/components/templates/RoadsIndexTemplate'
import { listRoadSummaries } from '@/features/roads/queries'

export const metadata: Metadata = {
  title: '道の一覧',
}

/** S-05 (US-06): the list and the map get the same roads. */
export default async function RoadsPage() {
  const roads = await listRoadSummaries()

  return (
    <RoadsIndexTemplate
      actions={
        <Link
          href="/roads/new"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-transparent bg-primary px-5 text-base font-bold text-on-primary transition-colors duration-140 ease-standard hover:bg-primary-hover active:bg-primary-active"
        >
          <Plus aria-hidden="true" className="size-5" />
          道を登録
        </Link>
      }
      list={<RoadList roads={roads} />}
      map={roads.length > 0 ? <RoadsMap roads={roads} /> : undefined}
    />
  )
}
