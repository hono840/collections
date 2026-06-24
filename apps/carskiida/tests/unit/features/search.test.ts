import { describe, it, expect } from 'vitest'
import { searchCars, getFacets } from '@/features/search/data'
import { parseSearchParams } from '@/lib/validations/search'

describe('parseSearchParams', () => {
  it('CSV と繰り返しクエリの両方を配列にする', () => {
    expect(parseSearchParams({ maker: 'toyota,mazda' }).maker).toEqual([
      'toyota',
      'mazda',
    ])
    expect(parseSearchParams({ maker: ['toyota', 'mazda'] as never }).maker).toEqual([
      'toyota',
      'mazda',
    ])
  })

  it('不正な body は除去する', () => {
    expect(parseSearchParams({ body: 'suv,banana' }).body).toEqual(['suv'])
  })

  it('showcaseOnly は "1"/"true" で真', () => {
    expect(parseSearchParams({ showcaseOnly: '1' }).showcaseOnly).toBe(true)
    expect(parseSearchParams({ showcaseOnly: '0' }).showcaseOnly).toBe(false)
  })

  it('不正な sort は relevance にフォールバック', () => {
    expect(parseSearchParams({ sort: 'xxx' }).sort).toBe('relevance')
    expect(parseSearchParams({ sort: 'name' }).sort).toBe('name')
  })
})

describe('searchCars', () => {
  it('キーワードで車名/別名にヒットする', async () => {
    const { models } = await searchCars(parseSearchParams({ q: 'ロードスター' }))
    expect(models.some((m) => m.slug === 'roadster')).toBe(true)
  })

  it('別名（MX-5）でもヒットする', async () => {
    const { models } = await searchCars(parseSearchParams({ q: 'MX-5' }))
    expect(models.some((m) => m.slug === 'roadster')).toBe(true)
  })

  it('メーカーで絞り込める', async () => {
    const { models } = await searchCars(parseSearchParams({ maker: 'toyota' }))
    expect(models.length).toBeGreaterThan(0)
    expect(models.every((m) => m.manufacturerSlug === 'toyota')).toBe(true)
  })

  it('ショーケースのみで depth に絞れる', async () => {
    const { models } = await searchCars(
      parseSearchParams({ showcaseOnly: '1' })
    )
    expect(models.every((m) => m.depthLevel === 'showcase')).toBe(true)
  })

  it('一致なしは0件（エラーにしない）', async () => {
    const { total } = await searchCars(parseSearchParams({ q: ' zzzznomatch ' }))
    expect(total).toBe(0)
  })

  it('生産国で絞り込める', async () => {
    const { models } = await searchCars(parseSearchParams({ country: '日本' }))
    expect(models.length).toBeGreaterThan(0)
    expect(models.every((m) => m.originCountry === '日本')).toBe(true)
  })
})

describe('getFacets', () => {
  it('メーカー・ボディタイプ・生産国のファセットを返す', async () => {
    const facets = await getFacets()
    expect(facets.makers.length).toBeGreaterThan(0)
    expect(facets.bodyTypes.length).toBeGreaterThan(0)
    expect(facets.countries.length).toBeGreaterThan(0)
  })
})
