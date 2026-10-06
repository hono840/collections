import { describe, expect, it } from 'vitest'
import { ROAD_TYPES } from '@/lib/validation/road'
import { ROAD_TYPE_LABELS, ROAD_TYPE_OPTIONS } from './labels'

describe('road type labels', () => {
  it('maps every storage value to its Japanese label', () => {
    expect(ROAD_TYPE_LABELS).toEqual({
      pass: '峠',
      skyline: 'スカイライン',
      coastal: '海岸線',
      forest: '林道',
      other: 'その他',
    })
  })

  it('ROAD_TYPE_OPTIONS lists the 5 choices in the PRD order', () => {
    expect(ROAD_TYPE_OPTIONS).toEqual([
      { value: 'pass', label: '峠' },
      { value: 'skyline', label: 'スカイライン' },
      { value: 'coastal', label: '海岸線' },
      { value: 'forest', label: '林道' },
      { value: 'other', label: 'その他' },
    ])
  })

  it('stays in sync with the zod enum', () => {
    expect(ROAD_TYPE_OPTIONS.map((option) => option.value)).toEqual([...ROAD_TYPES])
  })

  it('contains no speed / racing words (PRD US-14)', () => {
    const banned = ['攻め', 'ワインディング', 'タイム', '最速', 'ランキング', '傾き']
    const allLabels = Object.values(ROAD_TYPE_LABELS).join(' ')
    for (const word of banned) expect(allLabels).not.toContain(word)
  })
})
