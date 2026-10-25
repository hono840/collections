import { describe, expect, it } from 'vitest'
import { ALL_CATEGORIES, CATEGORIES, CATEGORY_MARKS } from './types'

describe('spot constants', () => {
  it('AC3: lists the five categories in design chip order', () => {
    expect(CATEGORIES).toEqual(['峠', '絶景ロード', '海沿い', 'サーキット', '都市高速'])
  })

  it("AC3: uses 'すべて' as the no-filter value", () => {
    expect(ALL_CATEGORIES).toBe('すべて')
  })

  it('AC4: maps each category to its one-character card mark', () => {
    expect(CATEGORY_MARKS).toEqual({
      峠: '峠',
      絶景ロード: '景',
      海沿い: '海',
      サーキット: '走',
      都市高速: '高',
    })
  })
})
