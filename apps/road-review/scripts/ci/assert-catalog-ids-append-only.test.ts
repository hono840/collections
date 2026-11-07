// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { findRemovedCatalogIds, parseCatalogIds } from './assert-catalog-ids-append-only.mjs'

// ARCH v3 3.4 C4 (CI step) / 3.5: an id that was ever published in data/catalog-ids.txt must never
// disappear. CI compares `git show origin/main:apps/road-review/data/catalog-ids.txt` (base) with the
// working tree file (head). Usage: node scripts/ci/assert-catalog-ids-append-only.mjs <base-file> <head-file>

describe('parseCatalogIds', () => {
  it('1行1つの ID を読み、前後の空白と空の行を無視する', () => {
    expect(parseCatalogIds('ashinoko-skyline\n  yabitsu-toge \n\n')).toEqual(['ashinoko-skyline', 'yabitsu-toge'])
  })

  it('CRLF の改行でも読める', () => {
    expect(parseCatalogIds('ashinoko-skyline\r\nyabitsu-toge\r\n')).toEqual(['ashinoko-skyline', 'yabitsu-toge'])
  })

  it('空のファイルは0件', () => {
    expect(parseCatalogIds('')).toEqual([])
  })
})

describe('findRemovedCatalogIds', () => {
  it('足しただけなら問題なし', () => {
    expect(findRemovedCatalogIds('ashinoko-skyline\n', 'ashinoko-skyline\nyabitsu-toge\n')).toEqual([])
  })

  it('main にまだファイルが無い（空）なら問題なし', () => {
    expect(findRemovedCatalogIds('', 'ashinoko-skyline\n')).toEqual([])
  })

  it('消えた ID を全部返す', () => {
    const base = 'ashinoko-skyline\nyabitsu-toge\nmihon-kaigan-road\n'
    const head = 'yabitsu-toge\n'
    expect(findRemovedCatalogIds(base, head)).toEqual(['ashinoko-skyline', 'mihon-kaigan-road'])
  })

  it('ID の書きかえ（名前を変えたので ID も変えた）は「消えた」として扱う', () => {
    expect(findRemovedCatalogIds('yabitsu-toge\n', 'yabitsu-pass\n')).toEqual(['yabitsu-toge'])
  })

  it('並べ替えは問題なし', () => {
    expect(findRemovedCatalogIds('a-road\nb-road\n', 'b-road\na-road\n')).toEqual([])
  })
})
