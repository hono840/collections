import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DriveForm } from '@/components/organisms/DriveForm'
import { FormPageTemplate } from '@/components/templates/FormPageTemplate'
import { getDrive } from '@/features/drives/queries'
import { getRoad } from '@/features/roads/queries'

export const metadata: Metadata = {
  title: '走行記録を編集',
}

type EditDrivePageProps = {
  params: Promise<{ roadId: string; driveId: string }>
}

/**
 * S-08 edit (US-09 record edit). The road and the drive of that road are both required:
 * a missing / other user's / other road's / malformed id gives the same 404 (PRD 6).
 */
export default async function EditDrivePage({ params }: EditDrivePageProps) {
  const { roadId, driveId } = await params
  const [road, drive] = await Promise.all([getRoad(roadId), getDrive(roadId, driveId)])
  if (!road || !drive) notFound()

  return (
    <FormPageTemplate
      title="走行記録を編集"
      form={
        <DriveForm
          mode="edit"
          roadId={road.id}
          driveId={drive.id}
          roadName={road.name}
          roadType={road.roadType}
          defaultValues={{
            drivenOn: drive.drivenOn,
            vehicleType: drive.vehicleType,
            weather: drive.weather,
            ratingOverall: drive.ratingOverall,
            ratingScenery: drive.ratingScenery,
            ratingRoadSurface: drive.ratingRoadSurface,
            ratingEaseOfDriving: drive.ratingEaseOfDriving,
            traffic: drive.traffic,
            memo: drive.memo,
            roadInfo: drive.roadInfo
              ? { confirmedOn: drive.roadInfo.confirmedOn, items: drive.roadInfo.items }
              : null,
          }}
        />
      }
    />
  )
}
