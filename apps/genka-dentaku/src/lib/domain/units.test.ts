import { describe, it, expect } from 'vitest'
import { dimensionOf, unitsCompatible, convertQuantity } from './units'

describe('dimensionOf', () => {
  it('maps weight/volume units, everything else is count', () => {
    expect(dimensionOf('g')).toBe('weight')
    expect(dimensionOf('kg')).toBe('weight')
    expect(dimensionOf('ml')).toBe('volume')
    expect(dimensionOf('L')).toBe('volume')
    expect(dimensionOf('個')).toBe('count')
    expect(dimensionOf('枚')).toBe('count')
    expect(dimensionOf('房')).toBe('count')
  })
})

describe('unitsCompatible', () => {
  it('weight ingredient accepts any weight unit', () => {
    expect(unitsCompatible('g', 'weight', 'g')).toBe(true)
    expect(unitsCompatible('g', 'weight', 'kg')).toBe(true)
    expect(unitsCompatible('g', 'weight', '個')).toBe(false)
    expect(unitsCompatible('g', 'weight', 'ml')).toBe(false)
  })
  it('volume ingredient accepts any volume unit', () => {
    expect(unitsCompatible('ml', 'volume', 'ml')).toBe(true)
    expect(unitsCompatible('ml', 'volume', 'L')).toBe(true)
    expect(unitsCompatible('ml', 'volume', 'g')).toBe(false)
  })
  it('count ingredient only accepts its own exact unit', () => {
    expect(unitsCompatible('個', 'count', '個')).toBe(true)
    expect(unitsCompatible('個', 'count', '枚')).toBe(false)
    expect(unitsCompatible('個', 'count', 'g')).toBe(false)
  })
})

describe('convertQuantity', () => {
  it('converts within weight (g base, 1kg=1000g)', () => {
    expect(convertQuantity(2, 'kg', 'g', 'weight')).toBe(2000)
    expect(convertQuantity(500, 'g', 'kg', 'weight')).toBe(0.5)
    expect(convertQuantity(150, 'g', 'g', 'weight')).toBe(150)
  })
  it('converts within volume (ml base, 1L=1000ml)', () => {
    expect(convertQuantity(1, 'L', 'ml', 'volume')).toBe(1000)
    expect(convertQuantity(250, 'ml', 'L', 'volume')).toBe(0.25)
  })
  it('count converts only for identical units, otherwise null', () => {
    expect(convertQuantity(3, '個', '個', 'count')).toBe(3)
    expect(convertQuantity(3, '個', '枚', 'count')).toBeNull()
  })
  it('returns null across dimensions (guard)', () => {
    expect(convertQuantity(100, 'g', 'ml', 'weight')).toBeNull()
    expect(convertQuantity(100, 'g', '個', 'weight')).toBeNull()
    expect(convertQuantity(100, 'ml', 'g', 'volume')).toBeNull()
    expect(convertQuantity(3, '個', 'g', 'count')).toBeNull()
  })
})
