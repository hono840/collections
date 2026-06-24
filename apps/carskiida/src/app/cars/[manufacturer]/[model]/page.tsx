import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CarDetailTemplate } from '@/components/templates/CarDetailTemplate'
import {
  getCarDetail,
  getShowcaseParams,
  getRelatedCars,
} from '@/features/cars/data'
import { BODY_TYPE_LABELS } from '@/lib/constants/specs'

interface PageProps {
  params: Promise<{ manufacturer: string; model: string }>
}

// depth(showcase) のみビルド時生成。breadth は初回アクセス時に生成しキャッシュ常駐。
export async function generateStaticParams() {
  return getShowcaseParams()
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { manufacturer, model } = await params
  const car = await getCarDetail(manufacturer, model)
  if (!car) {
    return { title: '車種が見つかりません' }
  }
  const years = `${car.yearFrom}–${car.yearTo ?? '現在'}`
  const title = `${car.manufacturer.nameJa} ${car.nameJa}`
  const description =
    car.summaryJa ??
    `${title}（${BODY_TYPE_LABELS[car.bodyType]} / ${years}）の諸元・パーツ構造・生産地・世代史。`
  return {
    title,
    description,
    openGraph: { title: `${title} | carskiida`, description },
  }
}

export default async function CarDetailPage({ params }: PageProps) {
  const { manufacturer, model } = await params
  const car = await getCarDetail(manufacturer, model)
  if (!car) {
    notFound()
  }
  const related = await getRelatedCars(car)
  return <CarDetailTemplate model={car} related={related} />
}
