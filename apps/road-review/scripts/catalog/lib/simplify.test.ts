// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { simplifyLine } from './simplify.mjs'

// ARCH v3 4.4 / 9.1 simplify.
// Contract: simplifyLine(points: [lat, lng][], { toleranceM }) -> [lat, lng][]
//   Douglas–Peucker on a local flat projection (x = dLng * cos(midLat) * 111320, y = dLat * 110540),
//   iterative (explicit stack), always keeps both endpoints, rounds to 5 decimals, drops consecutive duplicates,
//   never mutates the input, deterministic. Throws when the input or the result has fewer than 2 points,
//   or toleranceM is not a positive number.

type Point = [number, number]

const METERS_PER_DEGREE_LAT = 110540
const metersPerDegreeLng = (lat: number) => Math.cos((lat * Math.PI) / 180) * 111320

/** Straight north-going line from 35.000 with `count` points, east-west wobble of `wobbleM` meters. */
function wobblyStraightLine(count: number, wobbleM: number): Point[] {
  return Array.from({ length: count }, (_unused, index): Point => {
    const lat = 35 + (index / (count - 1)) * 0.01
    const offset = index === 0 || index === count - 1 ? 0 : (index % 2 === 0 ? 1 : -1) * wobbleM
    return [lat, 139 + offset / metersPerDegreeLng(35)]
  })
}

function decimals(value: number) {
  const text = String(value)
  return text.includes('.') ? text.split('.')[1]!.length : 0
}

describe('simplifyLine', () => {
  it('まっすぐな線のゆれ（15m 未満）は両端の2点になる', () => {
    const line = wobblyStraightLine(101, 5)
    const simplified = simplifyLine(line, { toleranceM: 15 })
    expect(simplified).toEqual([
      [35, 139],
      [35.01, 139],
    ])
  })

  it('L字の角は残る', () => {
    const line: Point[] = [
      [35.0, 139.0],
      [35.001, 139.0],
      [35.002, 139.0],
      [35.003, 139.0],
      [35.003, 139.001],
      [35.003, 139.002],
      [35.003, 139.003],
    ]
    expect(simplifyLine(line, { toleranceM: 15 })).toEqual([
      [35.0, 139.0],
      [35.003, 139.0],
      [35.003, 139.003],
    ])
  })

  it('許す誤差はメートルで効く（20m のこぶは 15m なら残り、25m なら消える）', () => {
    const bump = 20 / metersPerDegreeLng(35.005)
    const line: Point[] = [
      [35.0, 139.0],
      [35.005, 139.0 + bump],
      [35.01, 139.0],
    ]
    expect(simplifyLine(line, { toleranceM: 15 })).toHaveLength(3)
    expect(simplifyLine(line, { toleranceM: 25 })).toHaveLength(2)
  })

  it('緯度方向の誤差もメートルで測る（南北に 20m ずれた点）', () => {
    const bump = 20 / METERS_PER_DEGREE_LAT
    const line: Point[] = [
      [35.0, 139.0],
      [35.0 + bump, 139.005],
      [35.0, 139.01],
    ]
    expect(simplifyLine(line, { toleranceM: 15 })).toHaveLength(3)
    expect(simplifyLine(line, { toleranceM: 25 })).toHaveLength(2)
  })

  it('両端の点は必ず残る（丸めた値で）', () => {
    const line = wobblyStraightLine(51, 40).map(([lat, lng]): Point => [lat + 0.0000012, lng + 0.0000034])
    const simplified = simplifyLine(line, { toleranceM: 15 })
    expect(simplified[0]).toEqual([Number(line[0]![0].toFixed(5)), Number(line[0]![1].toFixed(5))])
    expect(simplified.at(-1)).toEqual([Number(line.at(-1)![0].toFixed(5)), Number(line.at(-1)![1].toFixed(5))])
  })

  it('点が減る（ジグザグでも元より多くはならない）', () => {
    const line = wobblyStraightLine(301, 30)
    const simplified = simplifyLine(line, { toleranceM: 15 })
    expect(simplified.length).toBeLessThanOrEqual(line.length)
    expect(simplifyLine(wobblyStraightLine(301, 10), { toleranceM: 15 }).length).toBeLessThan(line.length)
  })

  it('座標は小数5桁までに丸める', () => {
    const line: Point[] = [
      [35.0000012345, 139.0000098765],
      [35.0049876543, 139.0123456789],
      [35.0101234567, 139.0000043219],
    ]
    for (const [lat, lng] of simplifyLine(line, { toleranceM: 1 })) {
      expect(decimals(lat)).toBeLessThanOrEqual(5)
      expect(decimals(lng)).toBeLessThanOrEqual(5)
    }
  })

  it('同じ点が続かない（入力に重なりがあっても・丸めで重なっても）', () => {
    const line: Point[] = [
      [35.0, 139.0],
      [35.0, 139.0],
      [35.0000001, 139.0000001],
      [35.002, 139.002],
      [35.002, 139.002],
      [35.004, 139.0],
    ]
    const simplified = simplifyLine(line, { toleranceM: 1 })
    simplified.slice(1).forEach((point: Point, index: number) => expect(point).not.toEqual(simplified[index]))
    expect(simplified[0]).toEqual([35, 139])
    expect(simplified.at(-1)).toEqual([35.004, 139])
  })

  it('同じ入力なら同じ結果で、入力を書きかえない', () => {
    const line = wobblyStraightLine(201, 25)
    const copy = structuredClone(line)
    const first = simplifyLine(line, { toleranceM: 15 })
    const second = simplifyLine(line, { toleranceM: 15 })
    expect(first).toEqual(second)
    expect(line).toEqual(copy)
  })

  it('長い線（5万点）でも呼び出しが深くなりすぎない', () => {
    const line: Point[] = Array.from({ length: 50_000 }, (_unused, index): Point => [
      35 + index * 0.00001,
      139 + Math.sin(index / 50) * 0.002,
    ])
    const simplified = simplifyLine(line, { toleranceM: 15 })
    expect(simplified.length).toBeGreaterThan(2)
    expect(simplified.length).toBeLessThan(line.length)
  })

  it('点が2つ未満の入力は失敗', () => {
    expect(() => simplifyLine([[35, 139]], { toleranceM: 15 })).toThrow()
    expect(() => simplifyLine([], { toleranceM: 15 })).toThrow()
  })

  it('丸めた結果が1点になる（とても短い線）なら失敗', () => {
    expect(() =>
      simplifyLine(
        [
          [35.0, 139.0],
          [35.000001, 139.000001],
        ],
        { toleranceM: 15 },
      ),
    ).toThrow()
  })

  it.each([0, -1, Number.NaN])('許す誤差 %s は断る', (toleranceM) => {
    expect(() => simplifyLine(wobblyStraightLine(5, 1), { toleranceM })).toThrow()
  })
})
