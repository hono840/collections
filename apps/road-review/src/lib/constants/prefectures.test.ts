import { describe, expect, it } from 'vitest'
import { getPrefectureName, PREFECTURES } from './prefectures'

describe('PREFECTURES (JIS X 0401)', () => {
  it('has 47 entries with codes 1..47 in order (north to south)', () => {
    expect(PREFECTURES).toHaveLength(47)
    expect(PREFECTURES.map((prefecture) => prefecture.code)).toEqual(
      Array.from({ length: 47 }, (_unused, index) => index + 1),
    )
  })

  it.each([
    [1, '北海道'],
    [2, '青森県'],
    [10, '群馬県'],
    [13, '東京都'],
    [14, '神奈川県'],
    [22, '静岡県'],
    [26, '京都府'],
    [27, '大阪府'],
    [47, '沖縄県'],
  ])('code %i is %s', (code, name) => {
    expect(PREFECTURES[code - 1]).toEqual({ code, name })
  })

  it('has unique names', () => {
    expect(new Set(PREFECTURES.map((prefecture) => prefecture.name)).size).toBe(47)
  })
})

describe('getPrefectureName()', () => {
  it('returns the name for a valid code', () => {
    expect(getPrefectureName(13)).toBe('東京都')
  })

  it.each([0, 48, -1, 1.5])('returns undefined for invalid code %s', (code) => {
    expect(getPrefectureName(code)).toBeUndefined()
  })
})
