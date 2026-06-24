import { describe, it, expect } from 'vitest'
import { collectModelSources } from '@/features/cars/sources'
import { getCarDetail } from '@/features/cars/data'

describe('collectModelSources', () => {
  it('showcase 車種の全フィールドの出典を集約し重複を除く', async () => {
    const car = await getCarDetail('mazda', 'roadster')
    const sources = collectModelSources(car!)
    expect(sources.length).toBeGreaterThan(0)
    // 重複排除（type|label|url が一意）
    const keys = sources.map((s) => `${s.type}|${s.label}|${s.url ?? ''}`)
    expect(new Set(keys).size).toBe(keys.length)
    // 諸元・生産地で使った OEM / Wikipedia の出典が含まれる
    expect(sources.some((s) => s.type === 'manufacturer')).toBe(true)
    expect(sources.some((s) => s.type === 'wikipedia')).toBe(true)
  })

  it('breadth 車種でも fieldSources の出典を拾う', async () => {
    const car = await getCarDetail('nissan', 'gt-r')
    const sources = collectModelSources(car!)
    expect(sources.length).toBeGreaterThan(0)
  })
})
