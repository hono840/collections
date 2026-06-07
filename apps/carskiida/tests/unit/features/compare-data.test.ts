import { describe, it, expect } from 'vitest'
import {
  parseCompareIds,
  buildCompareColumns,
  MAX_COMPARE,
} from '@/features/compare/data'

describe('parseCompareIds', () => {
  it('カンマ区切りを解釈する', () => {
    const refs = parseCompareIds('mazda:roadster,nissan:gt-r')
    expect(refs).toHaveLength(2)
    expect(refs[0]).toMatchObject({ manufacturer: 'mazda', model: 'roadster' })
  })

  it('gen/grade 付きを解釈する', () => {
    const refs = parseCompareIds('mazda:roadster:roadster-nd:roadster-nd-s')
    expect(refs[0]).toMatchObject({
      manufacturer: 'mazda',
      model: 'roadster',
      genId: 'roadster-nd',
      gradeId: 'roadster-nd-s',
    })
  })

  it('重複を除去し最大 MAX_COMPARE 件に丸める', () => {
    const refs = parseCompareIds('a:1,a:1,b:2,c:3,d:4,e:5')
    expect(refs.length).toBeLessThanOrEqual(MAX_COMPARE)
  })

  it('空入力は空配列', () => {
    expect(parseCompareIds(undefined)).toEqual([])
    expect(parseCompareIds('')).toEqual([])
  })
})

describe('buildCompareColumns', () => {
  it('depth 車種は既定世代・既定グレードの諸元を列にする', async () => {
    const cols = await buildCompareColumns([
      { manufacturer: 'mazda', model: 'roadster' },
    ])
    expect(cols).toHaveLength(1)
    expect(cols[0].title).toContain('ロードスター')
    expect(cols[0].specs.size).toBeGreaterThan(0)
  })

  it('解決できない ref はスキップする', async () => {
    const cols = await buildCompareColumns([
      { manufacturer: 'mazda', model: 'roadster' },
      { manufacturer: 'xxx', model: 'yyy' },
    ])
    expect(cols).toHaveLength(1)
  })

  it('breadth 車種は諸元が空の列になる（揃わない項目は比較表で欠損表示）', async () => {
    const cols = await buildCompareColumns([
      { manufacturer: 'nissan', model: 'gt-r' },
    ])
    expect(cols).toHaveLength(1)
    expect(cols[0].specs.size).toBe(0)
  })
})
