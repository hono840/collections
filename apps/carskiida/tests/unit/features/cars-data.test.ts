import { describe, it, expect } from 'vitest'
import {
  getCarDetail,
  getShowcaseParams,
  listCarSummaries,
  getRelatedCars,
  getAllCarParams,
} from '@/features/cars/data'

describe('cars data layer', () => {
  it('getCarDetail はメーカー slug + モデル slug で車種を返す', async () => {
    const car = await getCarDetail('mazda', 'roadster')
    expect(car).not.toBeNull()
    expect(car?.nameJa).toBe('ロードスター')
    expect(car?.depthLevel).toBe('showcase')
    expect(car!.generations.length).toBeGreaterThanOrEqual(2)
  })

  it('存在しない車種は null を返す', async () => {
    const car = await getCarDetail('mazda', 'nonexistent')
    expect(car).toBeNull()
  })

  it('getShowcaseParams は showcase 車種のみ返す', async () => {
    const params = await getShowcaseParams()
    expect(params.length).toBeGreaterThanOrEqual(1)
    expect(params).toContainEqual({ manufacturer: 'mazda', model: 'roadster' })
  })

  it('listCarSummaries は breadth と depth を両方含む', async () => {
    const list = await listCarSummaries()
    expect(list.some((c) => c.depthLevel === 'showcase')).toBe(true)
    expect(list.some((c) => c.depthLevel === 'breadth')).toBe(true)
  })

  it('showcase 車種の諸元には必ず出典が付与されている（出典必須ポリシー）', async () => {
    const car = await getCarDetail('mazda', 'roadster')
    const allSpecs = car!.generations.flatMap((g) =>
      g.grades.flatMap((gr) => gr.specs)
    )
    expect(allSpecs.length).toBeGreaterThan(0)
    expect(allSpecs.every((s) => s.source && s.source.label.length > 0)).toBe(
      true
    )
  })

  it('getRelatedCars は自身を除外して関連車を返す', async () => {
    const car = await getCarDetail('mazda', 'roadster')
    const related = await getRelatedCars(car!)
    expect(related.length).toBeGreaterThan(0)
    expect(related.every((r) => !(r.manufacturerSlug === 'mazda' && r.slug === 'roadster'))).toBe(true)
  })

  it('getAllCarParams は全車種のパラメータを返す', async () => {
    const params = await getAllCarParams()
    expect(params.length).toBeGreaterThanOrEqual(6)
    expect(params).toContainEqual({ manufacturer: 'mazda', model: 'roadster' })
  })
})
