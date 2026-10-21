/**
 * Unit dimension + conversion (PRD 0.4 / architecture §5.1).
 * weight (g base, 1kg=1000g) and volume (ml base, 1L=1000ml) convert by coefficient;
 * count units never cross-convert (個≠枚≠束…, same unit only).
 */
import { WEIGHT_UNITS, VOLUME_UNITS, type Dimension, type Unit } from './schema'

/** Factor to the internal base unit (grams / millilitres). */
const WEIGHT_TO_BASE: Record<string, number> = { g: 1, kg: 1000 }
const VOLUME_TO_BASE: Record<string, number> = { ml: 1, L: 1000 }

/** g|kg -> weight, ml|L -> volume, anything else -> count. */
export function dimensionOf(unit: Unit): Dimension {
  if ((WEIGHT_UNITS as readonly string[]).includes(unit)) return 'weight'
  if ((VOLUME_UNITS as readonly string[]).includes(unit)) return 'volume'
  return 'count'
}

/** Whether a recipe-line unit may be used against an ingredient of the given dimension. */
export function unitsCompatible(ingredientUnit: Unit, ingredientDim: Dimension, lineUnit: Unit): boolean {
  if (ingredientDim === 'weight') return (WEIGHT_UNITS as readonly string[]).includes(lineUnit)
  if (ingredientDim === 'volume') return (VOLUME_UNITS as readonly string[]).includes(lineUnit)
  return lineUnit === ingredientUnit // count: identical unit only
}

/**
 * Convert `value` from `from` to `to` within a dimension.
 * weight/volume convert by coefficient; count converts only when from === to.
 * Cross-dimension units and mismatched count units return null (guard).
 */
export function convertQuantity(value: number, from: Unit, to: Unit, dimension: Dimension): number | null {
  if (dimension === 'weight') {
    const f = WEIGHT_TO_BASE[from]
    const t = WEIGHT_TO_BASE[to]
    if (f === undefined || t === undefined) return null
    return (value * f) / t
  }
  if (dimension === 'volume') {
    const f = VOLUME_TO_BASE[from]
    const t = VOLUME_TO_BASE[to]
    if (f === undefined || t === undefined) return null
    return (value * f) / t
  }
  // count: no conversion, identical unit only
  return from === to ? value : null
}
