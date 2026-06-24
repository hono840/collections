import { SectionHeading } from '@/components/atoms/SectionHeading'
import { CarCard } from '@/components/molecules/CarCard'
import type { CarModelSummary } from '@/types/car'

export interface RelatedCarsProps {
  models: CarModelSummary[]
}

/**
 * 関連車回遊（organism）。同クラス・同メーカーの車種へ誘導する。
 */
export function RelatedCars({ models }: RelatedCarsProps) {
  if (models.length === 0) return null

  return (
    <section>
      <SectionHeading label="Related">関連する車種</SectionHeading>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {models.map((m) => (
          <li key={m.id}>
            <CarCard model={m} />
          </li>
        ))}
      </ul>
    </section>
  )
}
