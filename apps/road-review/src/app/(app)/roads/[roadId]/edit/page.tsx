import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RoadForm } from '@/components/organisms/RoadForm'
import { FormPageTemplate } from '@/components/templates/FormPageTemplate'
import { getRoad } from '@/features/roads/queries'

export const metadata: Metadata = {
  title: '道を編集',
}

type EditRoadPageProps = {
  params: Promise<{ roadId: string }>
}

/** S-07 edit (US-09). Same 404 as the detail page for missing / other users' roads. */
export default async function EditRoadPage({ params }: EditRoadPageProps) {
  const { roadId } = await params
  const road = await getRoad(roadId)
  if (!road) notFound()

  return (
    <FormPageTemplate
      title="道を編集"
      form={
        <RoadForm
          mode="edit"
          roadId={road.id}
          defaultValues={{
            name: road.name,
            prefectureCode: road.prefectureCode,
            roadType: road.roadType,
            start: road.start,
            end: road.end,
          }}
        />
      }
    />
  )
}
