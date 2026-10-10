// @vitest-environment node
import { describe, expect, it } from 'vitest'
import dualBranchPath from '../../../tests/fixtures/osm/dual-branch-path.json'
import gap from '../../../tests/fixtures/osm/gap.json'
import linearReversed from '../../../tests/fixtures/osm/linear-reversed.json'
import { EXCLUDED_HIGHWAY_TYPES, assembleRoute, filterRoadWays } from './assemble.mjs'

// ARCH v3 4.3 / 9.1 assemble. Fixtures are synthetic (tests/fixtures/osm/README.txt).
// Contract:
//   filterRoadWays(elements, { excludeWays = [] }) -> OSM ways that have `highway`, minus EXCLUDED_HIGHWAY_TYPES
//     (footway, path, steps, cycleway, bridleway, pedestrian, corridor; `track` is KEPT) and minus excludeWays.
//   assembleRoute(elements, { cutFrom, cutTo, allowGaps = false, excludeWays = [], expectedLengthKm?, maxSnapM = 300 })
//     -> { ok: true, kind: 'LineString' | 'MultiLineString', lines: [lat, lng][][], nodeIds: number[][],
//          wayIds: number[] (ascending, ways actually used), lengthM: number, warnings: { code, message }[] }
//      | { ok: false, code: 'no_ways' | 'start_too_far' | 'end_too_far' | 'disconnected' | 'too_many_segments',
//          message: string, warnings: { code, message }[] }
//   Shortest path (by meters) on the node graph from the node nearest cutFrom to the node nearest cutTo,
//   so the line runs cutFrom -> cutTo regardless of way order / way direction; `oneway` is ignored.
//   allowGaps: true -> up to 3 disconnected pieces ordered from cutFrom, warning 'gap'; pieces are never bridged.
//   expectedLengthKm differing by >= 15% -> warning 'length_mismatch' (still ok).

type Point = [number, number]

const LINEAR_START = { lat: 35.0001, lng: 139.0001 }
const LINEAR_END = { lat: 35.0119, lng: 139.0001 }

function metersBetween([lat1, lng1]: Point, [lat2, lng2]: Point) {
  const radians = Math.PI / 180
  const dLat = (lat2 - lat1) * radians
  const dLng = (lng2 - lng1) * radians
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin(dLng / 2) ** 2
  return 2 * 6371008.8 * Math.asin(Math.sqrt(a))
}

function polylineLength(points: Point[]) {
  return points.slice(1).reduce((total, point, index) => total + metersBetween(points[index]!, point), 0)
}

function expectOk(result: ReturnType<typeof assembleRoute>) {
  if (!result.ok) throw new Error(`expected ok, got ${result.code}: ${result.message}`)
  return result
}

describe('filterRoadWays', () => {
  it('highway の無い線・人の道（path など）・excludeWays を外し、林道（track）は残す', () => {
    const ids = filterRoadWays(dualBranchPath.elements, { excludeWays: [206] }).map((way: { id: number }) => way.id)
    expect(ids.sort((a: number, b: number) => a - b)).toEqual([200, 201, 202, 203, 207])
  })

  it('外す種類の一覧', () => {
    expect([...EXCLUDED_HIGHWAY_TYPES].sort()).toEqual(
      ['bridleway', 'corridor', 'cycleway', 'footway', 'path', 'pedestrian', 'steps'].sort(),
    )
    expect(EXCLUDED_HIGHWAY_TYPES).not.toContain('track')
  })
})

describe('assembleRoute: つなぐ', () => {
  it('並びがばらばらで、向きが逆の way を含んでも、1本の線に cutFrom → cutTo の順でつなぐ', () => {
    const result = expectOk(assembleRoute(linearReversed.elements, { cutFrom: LINEAR_START, cutTo: LINEAR_END }))
    expect(result.kind).toBe('LineString')
    expect(result.lines).toHaveLength(1)
    expect(result.nodeIds).toEqual([[1, 2, 3, 4, 5, 6, 7]])
    expect(result.lines[0]![0]).toEqual([35.0, 139.0])
    expect(result.lines[0]!.at(-1)).toEqual([35.012, 139.0])
    expect(result.wayIds).toEqual([101, 102, 103])
    expect(result.warnings).toEqual([])
  })

  it('つなぎ目の点を二重に入れない', () => {
    const result = expectOk(assembleRoute(linearReversed.elements, { cutFrom: LINEAR_START, cutTo: LINEAR_END }))
    const line = result.lines[0]!
    line.slice(1).forEach((point: Point, index: number) => expect(point).not.toEqual(line[index]))
  })

  it('cutFrom と cutTo を入れかえると、逆向きの線になる（なぞる向きは cutFrom から）', () => {
    const result = expectOk(assembleRoute(linearReversed.elements, { cutFrom: LINEAR_END, cutTo: LINEAR_START }))
    expect(result.nodeIds).toEqual([[7, 6, 5, 4, 3, 2, 1]])
  })

  it('長さ（lengthM）は道すじの点の間の距離の合計', () => {
    const result = expectOk(assembleRoute(linearReversed.elements, { cutFrom: LINEAR_START, cutTo: LINEAR_END }))
    const expected = polylineLength(result.lines[0]!)
    expect(result.lengthM).toBeGreaterThan(1300)
    expect(result.lengthM).toBeLessThan(1400)
    expect(Math.abs(result.lengthM - expected)).toBeLessThan(expected * 0.005)
  })

  it('入力を書きかえない', () => {
    const before = JSON.stringify(linearReversed.elements)
    assembleRoute(linearReversed.elements, { cutFrom: LINEAR_START, cutTo: LINEAR_END })
    expect(JSON.stringify(linearReversed.elements)).toBe(before)
  })

  it('同じ入力なら同じ結果（決まった答え）', () => {
    const options = { cutFrom: LINEAR_START, cutTo: LINEAR_END }
    expect(assembleRoute(linearReversed.elements, options)).toEqual(assembleRoute(linearReversed.elements, options))
  })
})

describe('assembleRoute: 切り出す', () => {
  it('cutFrom / cutTo に一番近い点で切り出す（外側の点は入れない）', () => {
    const result = expectOk(
      assembleRoute(linearReversed.elements, {
        cutFrom: { lat: 35.0021, lng: 139.0005 }, // near node 2
        cutTo: { lat: 35.0099, lng: 139.0005 }, // near node 6
      }),
    )
    expect(result.nodeIds).toEqual([[2, 3, 4, 5, 6]])
    expect(result.wayIds).toEqual([101, 102, 103])
  })

  it('cutFrom が一番近い点から 300m 以上離れていたら失敗（start_too_far）', () => {
    const result = assembleRoute(linearReversed.elements, { cutFrom: { lat: 34.996, lng: 139.0 }, cutTo: LINEAR_END })
    expect(result).toMatchObject({ ok: false, code: 'start_too_far' })
  })

  it('cutTo が離れていたら失敗（end_too_far）', () => {
    const result = assembleRoute(linearReversed.elements, { cutFrom: LINEAR_START, cutTo: { lat: 35.016, lng: 139.0 } })
    expect(result).toMatchObject({ ok: false, code: 'end_too_far' })
  })

  it('maxSnapM で距離の上限を変えられる', () => {
    const options = { cutFrom: { lat: 34.9985, lng: 139.0 }, cutTo: LINEAR_END } // about 166 m from node 1
    expect(assembleRoute(linearReversed.elements, options).ok).toBe(true)
    expect(assembleRoute(linearReversed.elements, { ...options, maxSnapM: 100 })).toMatchObject({ ok: false, code: 'start_too_far' })
  })

  it('使える way が1本も無ければ失敗（no_ways）', () => {
    const onlyPaths = dualBranchPath.elements.filter((element) => element.tags.highway === 'path')
    expect(assembleRoute(onlyPaths, { cutFrom: LINEAR_START, cutTo: LINEAR_END })).toMatchObject({ ok: false, code: 'no_ways' })
  })
})

describe('assembleRoute: 上り下り・枝・山道', () => {
  const options = { cutFrom: { lat: 35.0001, lng: 139.0001 }, cutTo: { lat: 35.0079, lng: 139.0001 }, excludeWays: [206] }

  it('上り下りが別の線は短い片方だけ、駐車場への枝は外れ、林道（track）は使う', () => {
    const result = expectOk(assembleRoute(dualBranchPath.elements, options))
    expect(result.nodeIds).toEqual([[10, 11, 12, 13, 14]])
    expect(result.wayIds).toEqual([200, 201, 207])
  })

  it('近道でも highway=path は使わない', () => {
    const result = expectOk(assembleRoute(dualBranchPath.elements, options))
    expect(result.wayIds).not.toContain(204)
    expect(result.nodeIds[0]).not.toContain(41)
  })

  it('excludeWays の way は近道でも使わない（指定しなければ使われる）', () => {
    const excluded = expectOk(assembleRoute(dualBranchPath.elements, options))
    expect(excluded.wayIds).not.toContain(206)
    const included = expectOk(assembleRoute(dualBranchPath.elements, { ...options, excludeWays: [] }))
    expect(included.wayIds).toEqual([206])
  })
})

describe('assembleRoute: 切れ目', () => {
  const options = { cutFrom: { lat: 35.0201, lng: 139.0001 }, cutTo: { lat: 35.0299, lng: 139.0001 } }

  it('allowGaps: false（既定）なら失敗（disconnected）', () => {
    expect(assembleRoute(gap.elements, options)).toMatchObject({ ok: false, code: 'disconnected' })
  })

  it('allowGaps: true なら、始まりに近い順に2本（MultiLineString）・切れ目の注意つき・直線でつながない', () => {
    const result = expectOk(assembleRoute(gap.elements, { ...options, allowGaps: true }))
    expect(result.kind).toBe('MultiLineString')
    expect(result.nodeIds).toEqual([
      [61, 62, 63],
      [64, 65, 66],
    ])
    expect(result.lines).toHaveLength(2)
    expect(result.warnings.map((warning: { code: string }) => warning.code)).toContain('gap')
    // length counts only the drawn pieces, not the missing 221 m
    expect(result.lengthM).toBeLessThan(polylineLength(result.lines[0]!) + polylineLength(result.lines[1]!) + 1)
  })
})

describe('assembleRoute: 長さの確かめ', () => {
  it('expectedLengthKm と 15% 以上違えば length_mismatch の注意（失敗にはしない）', () => {
    const result = expectOk(
      assembleRoute(linearReversed.elements, { cutFrom: LINEAR_START, cutTo: LINEAR_END, expectedLengthKm: 5 }),
    )
    expect(result.warnings.map((warning: { code: string }) => warning.code)).toEqual(['length_mismatch'])
  })

  it('15% 未満の差なら注意なし', () => {
    const result = expectOk(
      assembleRoute(linearReversed.elements, { cutFrom: LINEAR_START, cutTo: LINEAR_END, expectedLengthKm: 1.4 }),
    )
    expect(result.warnings).toEqual([])
  })
})
