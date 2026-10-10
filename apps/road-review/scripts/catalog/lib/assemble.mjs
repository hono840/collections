// Way assembly (ARCH v3 4.3): OSM ways -> one (at most three) line(s) from cutFrom to cutTo.
//
// Goal: a single path from cutFrom to cutTo.
// -> build a node graph from the ways (edges between consecutive node ids, length in meters, oneway ignored)
// -> run Dijkstra (plain arrays; a few thousand nodes) from the node nearest cutFrom to the node nearest cutTo.
// Dual carriageways resolve to the shorter side and dead-end branches fall away on their own.

/** Footways and similar are never part of a road line. `track` (forest roads) is kept on purpose. */
export const EXCLUDED_HIGHWAY_TYPES = Object.freeze(['footway', 'path', 'steps', 'cycleway', 'bridleway', 'pedestrian', 'corridor'])

const EARTH_RADIUS_M = 6371008.8
const MAX_PIECES = 3
const LENGTH_MISMATCH_RATIO = 0.15

/**
 * @typedef {{ lat: number, lon: number }} OsmCoordinate
 * @typedef {{ type: string, id: number, nodes?: number[], geometry?: OsmCoordinate[], tags?: Record<string, string | undefined> }} OsmElement
 * @typedef {{ lat: number, lng: number }} LatLng
 * @typedef {[number, number]} Point
 * @typedef {{ code: string, message: string }} Warning
 * @typedef {{
 *   ok: true,
 *   kind: 'LineString' | 'MultiLineString',
 *   lines: Point[][],
 *   nodeIds: number[][],
 *   wayIds: number[],
 *   lengthM: number,
 *   warnings: Warning[],
 * }} AssembleSuccess
 * @typedef {{
 *   ok: false,
 *   code: 'no_ways' | 'start_too_far' | 'end_too_far' | 'disconnected' | 'too_many_segments',
 *   message: string,
 *   warnings: Warning[],
 * }} AssembleFailure
 */

/**
 * Haversine distance in meters.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 */
function metersBetween(lat1, lng1, lat2, lng2) {
  const radians = Math.PI / 180
  const dLat = (lat2 - lat1) * radians
  const dLng = (lng2 - lng1) * radians
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)))
}

/**
 * Ways usable as road: has `highway`, not a footway-like type, not in excludeWays, has node ids and geometry.
 * @param {OsmElement[]} elements
 * @param {{ excludeWays?: number[] }} [options]
 * @returns {OsmElement[]}
 */
export function filterRoadWays(elements, { excludeWays = [] } = {}) {
  const excluded = new Set(excludeWays)
  return elements.filter((element) => {
    if (element.type !== 'way' || excluded.has(element.id)) return false
    const highway = element.tags?.highway
    if (typeof highway !== 'string' || EXCLUDED_HIGHWAY_TYPES.includes(highway)) return false
    if (!Array.isArray(element.geometry) || element.geometry.length < 2) return false
    // `out geom tags` may omit the node id list; then node identity falls back to coordinates (see buildGraph).
    return element.nodes === undefined || (Array.isArray(element.nodes) && element.nodes.length === element.geometry.length)
  })
}

/**
 * @param {OsmElement[]} ways
 */
function buildGraph(ways) {
  /** @type {Map<number, Point>} */
  const coordinates = new Map()
  /** @type {Map<number, Map<number, { lengthM: number, wayId: number }>>} */
  const edges = new Map()

  /**
   * @param {number} from
   * @param {number} to
   * @param {number} lengthM
   * @param {number} wayId
   */
  function addDirected(from, to, lengthM, wayId) {
    let neighbours = edges.get(from)
    if (!neighbours) {
      neighbours = new Map()
      edges.set(from, neighbours)
    }
    const existing = neighbours.get(to)
    // Same pair of nodes in two ways: keep the shorter edge, ties go to the smaller way id (deterministic).
    if (!existing || lengthM < existing.lengthM || (lengthM === existing.lengthM && wayId < existing.wayId)) {
      neighbours.set(to, { lengthM, wayId })
    }
  }

  // When a way comes without node ids, a node is identified by its exact coordinates: OSM prints a shared node
  // with identical lat/lon in every way, so joints still connect. Synthetic ids are negative and deterministic.
  /** @type {Map<string, number>} */
  const syntheticIds = new Map()
  /** @param {OsmCoordinate} coordinate */
  const syntheticId = ({ lat, lon }) => {
    const key = `${lat},${lon}`
    let id = syntheticIds.get(key)
    if (id === undefined) {
      id = -(syntheticIds.size + 1)
      syntheticIds.set(key, id)
    }
    return id
  }

  const sortedWays = [...ways].sort((left, right) => left.id - right.id)
  for (const way of sortedWays) {
    const geometry = /** @type {OsmCoordinate[]} */ (way.geometry)
    const nodes = Array.isArray(way.nodes) ? way.nodes : geometry.map(syntheticId)
    nodes.forEach((nodeId, index) => {
      if (!coordinates.has(nodeId)) coordinates.set(nodeId, [geometry[index].lat, geometry[index].lon])
      if (!edges.has(nodeId)) edges.set(nodeId, new Map())
      if (index === 0) return
      const previousId = nodes[index - 1]
      if (previousId === nodeId) return
      const lengthM = metersBetween(geometry[index - 1].lat, geometry[index - 1].lon, geometry[index].lat, geometry[index].lon)
      addDirected(previousId, nodeId, lengthM, way.id)
      addDirected(nodeId, previousId, lengthM, way.id)
    })
  }
  return { coordinates, edges }
}

/**
 * Node nearest to the point (ties: smaller id).
 * @param {Map<number, Point>} coordinates
 * @param {LatLng} target
 * @param {Iterable<number>} [candidates]
 */
function nearestNode(coordinates, target, candidates = coordinates.keys()) {
  let bestId = -1
  let bestDistance = Infinity
  for (const nodeId of candidates) {
    const [lat, lng] = /** @type {Point} */ (coordinates.get(nodeId))
    const distance = metersBetween(target.lat, target.lng, lat, lng)
    if (distance < bestDistance || (distance === bestDistance && nodeId < bestId)) {
      bestDistance = distance
      bestId = nodeId
    }
  }
  return { nodeId: bestId, distanceM: bestDistance }
}

/**
 * Dijkstra over the whole component of `start` (plain arrays, deterministic tie-breaks by node id).
 * @param {Map<number, Map<number, { lengthM: number, wayId: number }>>} edges
 * @param {number} start
 */
function shortestPaths(edges, start) {
  /** @type {Map<number, number>} */
  const distance = new Map([[start, 0]])
  /** @type {Map<number, number>} */
  const previous = new Map()
  const done = new Set()
  /** @type {number[]} each node enters the frontier once */
  const frontier = [start]
  while (frontier.length > 0) {
    let bestIndex = 0
    for (let index = 1; index < frontier.length; index += 1) {
      const candidate = frontier[index]
      const best = frontier[bestIndex]
      const candidateDistance = /** @type {number} */ (distance.get(candidate))
      const bestDistance = /** @type {number} */ (distance.get(best))
      if (candidateDistance < bestDistance || (candidateDistance === bestDistance && candidate < best)) bestIndex = index
    }
    const current = frontier[bestIndex]
    frontier[bestIndex] = /** @type {number} */ (frontier.at(-1))
    frontier.pop()
    if (done.has(current)) continue
    done.add(current)
    const currentDistance = /** @type {number} */ (distance.get(current))
    const neighbours = [...(edges.get(current) ?? new Map()).entries()].sort(([left], [right]) => left - right)
    for (const [neighbour, edge] of neighbours) {
      if (done.has(neighbour)) continue
      const candidateDistance = currentDistance + edge.lengthM
      const known = distance.get(neighbour)
      if (known === undefined || candidateDistance < known) {
        if (known === undefined) frontier.push(neighbour)
        distance.set(neighbour, candidateDistance)
        previous.set(neighbour, current)
      }
    }
  }
  return { distance, previous, reached: done }
}

/**
 * @param {Map<number, number>} previous
 * @param {number} start
 * @param {number} end
 */
function pathTo(previous, start, end) {
  const path = [end]
  let current = end
  while (current !== start) {
    current = /** @type {number} */ (previous.get(current))
    path.push(current)
  }
  return path.reverse()
}

/**
 * @param {OsmElement[]} elements
 * @param {{
 *   cutFrom: LatLng,
 *   cutTo: LatLng,
 *   allowGaps?: boolean,
 *   excludeWays?: number[],
 *   expectedLengthKm?: number,
 *   maxSnapM?: number,
 * }} options
 * @returns {AssembleSuccess | AssembleFailure}
 */
export function assembleRoute(elements, { cutFrom, cutTo, allowGaps = false, excludeWays = [], expectedLengthKm, maxSnapM = 300 }) {
  /** @type {Warning[]} */
  const warnings = []
  const ways = filterRoadWays(elements, { excludeWays })
  if (ways.length === 0) return { ok: false, code: 'no_ways', message: 'no usable road ways in the response', warnings }

  const { coordinates, edges } = buildGraph(ways)
  const start = nearestNode(coordinates, cutFrom)
  if (start.distanceM > maxSnapM) {
    return {
      ok: false,
      code: 'start_too_far',
      message: `nearest node to cutFrom is ${Math.round(start.distanceM)} m away (limit ${maxSnapM} m)`,
      warnings,
    }
  }
  const end = nearestNode(coordinates, cutTo)
  if (end.distanceM > maxSnapM) {
    return {
      ok: false,
      code: 'end_too_far',
      message: `nearest node to cutTo is ${Math.round(end.distanceM)} m away (limit ${maxSnapM} m)`,
      warnings,
    }
  }
  if (start.nodeId === end.nodeId) {
    return { ok: false, code: 'disconnected', message: 'cutFrom and cutTo snap to the same node', warnings }
  }

  /** @type {number[][]} */
  const pieces = []
  /** @type {Set<number>} nodes of components already used */
  const usedComponents = new Set()
  let pieceStart = start.nodeId
  for (;;) {
    const { previous, reached } = shortestPaths(edges, pieceStart)
    if (reached.has(end.nodeId)) {
      pieces.push(pathTo(previous, pieceStart, end.nodeId))
      break
    }
    if (!allowGaps) {
      return { ok: false, code: 'disconnected', message: 'cutFrom and cutTo are not connected in OSM (allowGaps is off)', warnings }
    }
    // Leave this component at its node nearest to the end, then jump to the nearest node of another component.
    for (const nodeId of reached) usedComponents.add(nodeId)
    const [endLat, endLng] = /** @type {Point} */ (coordinates.get(end.nodeId))
    const exit = nearestNode(coordinates, { lat: endLat, lng: endLng }, reached)
    const piece = pathTo(previous, pieceStart, exit.nodeId)
    if (piece.length >= 2) pieces.push(piece)
    if (pieces.length >= MAX_PIECES) {
      return { ok: false, code: 'too_many_segments', message: `more than ${MAX_PIECES} disconnected pieces`, warnings }
    }
    const [exitLat, exitLng] = /** @type {Point} */ (coordinates.get(exit.nodeId))
    const others = [...coordinates.keys()].filter((nodeId) => !usedComponents.has(nodeId))
    if (others.length === 0) {
      return { ok: false, code: 'disconnected', message: 'no other piece of road to continue with', warnings }
    }
    const next = nearestNode(coordinates, { lat: exitLat, lng: exitLng }, others)
    warnings.push({
      code: 'gap',
      message: `gap of ${Math.round(next.distanceM)} m in OSM between node ${exit.nodeId} and node ${next.nodeId} (not bridged)`,
    })
    pieceStart = next.nodeId
  }
  if (pieces.length > MAX_PIECES) {
    return { ok: false, code: 'too_many_segments', message: `more than ${MAX_PIECES} disconnected pieces`, warnings }
  }

  const usedWays = new Set()
  let lengthM = 0
  const lines = pieces.map((piece) =>
    piece.map((nodeId, index) => {
      if (index > 0) {
        const edge = /** @type {{ lengthM: number, wayId: number }} */ (edges.get(piece[index - 1])?.get(nodeId))
        usedWays.add(edge.wayId)
        lengthM += edge.lengthM
      }
      const [lat, lng] = /** @type {Point} */ (coordinates.get(nodeId))
      return /** @type {Point} */ ([lat, lng])
    }),
  )

  if (expectedLengthKm !== undefined && expectedLengthKm > 0) {
    const lengthKm = lengthM / 1000
    if (Math.abs(lengthKm - expectedLengthKm) / expectedLengthKm >= LENGTH_MISMATCH_RATIO) {
      warnings.push({
        code: 'length_mismatch',
        message: `assembled ${lengthKm.toFixed(2)} km vs expected ${expectedLengthKm} km (>= 15% off)`,
      })
    }
  }

  return {
    ok: true,
    kind: lines.length === 1 ? 'LineString' : 'MultiLineString',
    lines,
    nodeIds: pieces,
    wayIds: [...usedWays].sort((left, right) => left - right),
    lengthM,
    warnings,
  }
}
