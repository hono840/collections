import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DriveForm } from '@/components/organisms/DriveForm'
import { FormPageTemplate } from '@/components/templates/FormPageTemplate'
import { getRoad } from '@/features/roads/queries'
import { todayInTokyo } from '@/lib/utils/date'

export const metadata: Metadata = {
  title: '走行記録を追加',
}

type NewDrivePageProps = {
  params: Promise<{ roadId: string }>
}

/**
 * S-08 create (US-03 / US-04). Missing / other users' / malformed road ids give the same 404.
 * The default drive date is today in JST, computed on the server.
 * The safety banner is part of DriveForm (its first child), so the template's notice slot stays empty.
 */
export default async function NewDrivePage({ params }: NewDrivePageProps) {
  const { roadId } = await params
  const road = await getRoad(roadId)
  if (!road) notFound()

  return (
    <FormPageTemplate
      title="走行記録を追加"
      form={
        <DriveForm
          mode="create"
          roadId={road.id}
          roadName={road.name}
          roadType={road.roadType}
          defaultDrivenOn={todayInTokyo()}
        />
      }
    />
  )
}
