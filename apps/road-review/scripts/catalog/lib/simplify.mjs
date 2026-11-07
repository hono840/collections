// Douglas–Peucker line simplification (ARCH v3 4.4).
// Distances are measured on a local flat projection around the middle latitude of the line:
//   x = dLng * cos(midLat) * 111320 m, y = dLat * 110540 m
// Iterative (explicit stack) so 50,000-point lines do not overflow the call stack.

const METERS_PER_DEGREE_LAT = 110540
const METERS_PER_DEGREE_LNG_AT_EQUATOR = 111320

/**
 * Distance in meters from point P to segment AB (all in projected meters).
 * @param {number} pointX
 * @param {number} pointY
 * @param {number} startX
 * @param {number} startY
 * @param {number} endX
 * @param {number} endY
 */
function distanceToSegment(pointX, pointY, startX, startY, endX, endY) {
  const segmentX = endX - startX
  const segmentY = endY - startY
  const lengthSquared = segmentX * segmentX + segmentY * segmentY
  let ratio = 0
  if (lengthSquared > 0) {
    ratio = ((pointX - startX) * segmentX + (pointY - startY) * segmentY) / lengthSquared
    ratio = Math.max(0, Math.min(1, ratio))
  }
  return Math.hypot(pointX - (startX + ratio * segmentX), pointY - (startY + ratio * segmentY))
}

/**
 * @param {number} value
 */
function roundTo5(value) {
  return Number(value.toFixed(5))
}

/**
 * @param {Array<[number, number]>} points [lat, lng] pairs
 * @param {{ toleranceM: number }} options
 * @returns {Array<[number, number]>}
 */
export function simplifyLine(points, { toleranceM }) {
  if (typeof toleranceM !== 'number' || !Number.isFinite(toleranceM) || toleranceM <= 0) {
    throw new Error('toleranceM must be a positive number')
  }
  if (!Array.isArray(points) || points.length < 2) throw new Error('a line needs at least 2 points')

  let minLat = Infinity
  let maxLat = -Infinity
  for (const [lat] of points) {
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
  }
  const midLat = (minLat + maxLat) / 2
  const metersPerDegreeLng = Math.cos((midLat * Math.PI) / 180) * METERS_PER_DEGREE_LNG_AT_EQUATOR
  const [originLat, originLng] = points[0]
  const projectedX = points.map(([, lng]) => (lng - originLng) * metersPerDegreeLng)
  const projectedY = points.map(([lat]) => (lat - originLat) * METERS_PER_DEGREE_LAT)

  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  /** @type {Array<[number, number]>} */
  const stack = [[0, points.length - 1]]
  while (stack.length > 0) {
    const [first, last] = /** @type {[number, number]} */ (stack.pop())
    let farthestIndex = -1
    let farthestDistance = -1
    for (let index = first + 1; index < last; index += 1) {
      const distance = distanceToSegment(
        projectedX[index],
        projectedY[index],
        projectedX[first],
        projectedY[first],
        projectedX[last],
        projectedY[last],
      )
      if (distance > farthestDistance) {
        farthestDistance = distance
        farthestIndex = index
      }
    }
    if (farthestIndex !== -1 && farthestDistance > toleranceM) {
      keep[farthestIndex] = 1
      stack.push([first, farthestIndex], [farthestIndex, last])
    }
  }

  /** @type {Array<[number, number]>} */
  const result = []
  points.forEach(([lat, lng], index) => {
    if (!keep[index]) return
    /** @type {[number, number]} */
    const rounded = [roundTo5(lat), roundTo5(lng)]
    const previous = result.at(-1)
    if (previous && previous[0] === rounded[0] && previous[1] === rounded[1]) return
    result.push(rounded)
  })
  if (result.length < 2) throw new Error('the simplified line has fewer than 2 points')
  return result
}
