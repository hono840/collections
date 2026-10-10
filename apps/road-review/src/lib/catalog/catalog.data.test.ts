// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { geometryFileSchema, validateApprovedCatalog } from './schema'

// ARCH v3 3.4: checks that run in CI against the REAL data files.
//   C1-C3, C5, C6, C8, C9 + CEO decisions (乗鞍 excluded, unverified regulations rejected,
//   two-wheel badge backed by a verified note) -> validateApprovedCatalog
//   C4  catalog-ids.txt == ids in road-catalog.json (the "never remove a line" part is the
//       CI step scripts/ci/assert-catalog-ids-append-only.mjs)
//   C7  data/geometry/{id}.json for every approved/retired road
//   C11 ODbL bundle in public/data/catalog/ (required once at least one road is published)
//   C12 sizes: catalog-index.json <= 80KB, each road geometry file <= 30KB
// data/road-catalog-draft.json is an AI DRAFT and is deliberately NOT validated as approved here.

type CheckId = 'C1-C9' | 'C4' | 'C7' | 'C11' | 'C12'
type Problem = { check: CheckId; message: string }

const APP_ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const VALID_FIXTURE_ROOT = path.join(APP_ROOT, 'tests/fixtures/catalog/valid-root')
const ODBL_LICENSE_URL = 'https://opendatacommons.org/licenses/odbl/1-0/'
const ODBL_ATTRIBUTION = '© OpenStreetMap contributors'
const MAX_INDEX_BYTES = 80 * 1024
const MAX_ROAD_FILE_BYTES = 30 * 1024
const BBOX_MARGIN_KM = 2

function todayIso(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function readJsonFile(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function jsonFilesIn(directory: string): string[] {
  if (!fs.existsSync(directory)) return []
  return fs
    .readdirSync(directory)
    .filter((fileName) => fileName.endsWith('.json'))
    .map((fileName) => path.join(directory, fileName))
}

function isInsideBboxWithMargin(point: { lat: number; lng: number }, bbox: readonly number[]): boolean {
  const [south, west, north, east] = bbox
  const latMargin = BBOX_MARGIN_KM / 111
  const lngMargin = BBOX_MARGIN_KM / (111 * Math.cos((point.lat * Math.PI) / 180))
  return (
    point.lat >= south - latMargin &&
    point.lat <= north + latMargin &&
    point.lng >= west - lngMargin &&
    point.lng <= east + lngMargin
  )
}

/** Runs every catalog data check against an app-shaped directory and lists what is wrong. */
function collectCatalogDataProblems(rootDir: string, today: string): Problem[] {
  const problems: Problem[] = []
  const catalogPath = path.join(rootDir, 'data/road-catalog.json')
  if (!fs.existsSync(catalogPath)) {
    return [{ check: 'C1-C9', message: 'data/road-catalog.json is missing' }]
  }

  const result = validateApprovedCatalog(readJsonFile(catalogPath), { today })
  if (!result.ok) {
    for (const issue of result.issues) {
      problems.push({ check: 'C1-C9', message: `${issue.code} at ${issue.path.join('.')}: ${issue.message}` })
    }
    return problems
  }
  const roads = result.data.roads

  // C4: catalog-ids.txt lists exactly the ids in the approved catalog.
  const idsPath = path.join(rootDir, 'data/catalog-ids.txt')
  if (!fs.existsSync(idsPath)) {
    problems.push({ check: 'C4', message: 'data/catalog-ids.txt is missing' })
  } else {
    const listedIds = fs
      .readFileSync(idsPath, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
    const duplicates = listedIds.filter((id, index) => listedIds.indexOf(id) !== index)
    if (duplicates.length > 0) problems.push({ check: 'C4', message: `duplicate ids in catalog-ids.txt: ${duplicates.join(', ')}` })
    const catalogIds = new Set(roads.map((road) => road.id))
    const listedIdSet = new Set(listedIds)
    for (const id of catalogIds) {
      if (!listedIdSet.has(id)) problems.push({ check: 'C4', message: `${id} is in road-catalog.json but not in catalog-ids.txt` })
    }
    for (const id of listedIdSet) {
      if (!catalogIds.has(id)) problems.push({ check: 'C4', message: `${id} is in catalog-ids.txt but not in road-catalog.json` })
    }
  }

  // C7: every approved/retired road has a valid geometry file that matches it.
  for (const road of roads) {
    const geometryPath = path.join(rootDir, 'data/geometry', `${road.id}.json`)
    if (!fs.existsSync(geometryPath)) {
      problems.push({ check: 'C7', message: `data/geometry/${road.id}.json is missing` })
      continue
    }
    const geometry = geometryFileSchema.safeParse(readJsonFile(geometryPath))
    if (!geometry.success) {
      problems.push({ check: 'C7', message: `data/geometry/${road.id}.json: ${geometry.error.message}` })
      continue
    }
    if (geometry.data.id !== road.id) {
      problems.push({ check: 'C7', message: `data/geometry/${road.id}.json has id ${geometry.data.id}` })
    }
    if (!isInsideBboxWithMargin(road.representativePoint, geometry.data.bbox)) {
      problems.push({ check: 'C7', message: `${road.id}: representativePoint is outside the geometry bbox (+${BBOX_MARGIN_KM}km)` })
    }
  }

  // C11: once anything is published, the ODbL bundle must ship with it.
  if (roads.length > 0) {
    const bundleDir = path.join(rootDir, 'public/data/catalog')
    const licensePath = path.join(bundleDir, 'LICENSE-ODbL.txt')
    const readmePath = path.join(bundleDir, 'README.txt')
    const odblJsonPath = path.join(bundleDir, 'road-catalog-odbl.json')
    if (!fs.existsSync(licensePath) || !fs.readFileSync(licensePath, 'utf8').includes(ODBL_LICENSE_URL)) {
      problems.push({ check: 'C11', message: `LICENSE-ODbL.txt is missing or does not link ${ODBL_LICENSE_URL}` })
    }
    if (!fs.existsSync(readmePath) || !fs.readFileSync(readmePath, 'utf8').includes('OpenStreetMap')) {
      problems.push({ check: 'C11', message: 'README.txt is missing or does not mention OpenStreetMap' })
    }
    if (!fs.existsSync(odblJsonPath)) {
      problems.push({ check: 'C11', message: 'road-catalog-odbl.json is missing' })
    } else {
      const odbl = readJsonFile(odblJsonPath) as { license?: unknown; attribution?: unknown }
      if (odbl.license !== 'ODbL-1.0') problems.push({ check: 'C11', message: 'road-catalog-odbl.json license is not ODbL-1.0' })
      if (odbl.attribution !== ODBL_ATTRIBUTION) {
        problems.push({ check: 'C11', message: `road-catalog-odbl.json attribution is not "${ODBL_ATTRIBUTION}"` })
      }
    }
  }

  // C12: size budgets.
  const indexPath = path.join(rootDir, 'src/generated/catalog-index.json')
  if (fs.existsSync(indexPath) && fs.statSync(indexPath).size > MAX_INDEX_BYTES) {
    problems.push({ check: 'C12', message: `catalog-index.json is larger than ${MAX_INDEX_BYTES} bytes` })
  }
  const roadFiles = [
    ...jsonFilesIn(path.join(rootDir, 'data/geometry')),
    ...jsonFilesIn(path.join(rootDir, 'public/data/catalog/roads')),
  ]
  for (const filePath of roadFiles) {
    if (fs.statSync(filePath).size > MAX_ROAD_FILE_BYTES) {
      problems.push({ check: 'C12', message: `${path.relative(rootDir, filePath)} is larger than ${MAX_ROAD_FILE_BYTES} bytes` })
    }
  }

  return problems
}

const CHECKS: CheckId[] = ['C1-C9', 'C4', 'C7', 'C11', 'C12']

describe('本物の道のリスト（data/road-catalog.json）', () => {
  const problems = collectCatalogDataProblems(APP_ROOT, todayIso())

  it.each(CHECKS)('%s の検査に問題がない', (check) => {
    expect(problems.filter((problem) => problem.check === check)).toEqual([])
  })

  it('承認済みのリストは AI の案（road-catalog-draft.json の形）ではなく 3.3 の形で書かれている', () => {
    const approved = readJsonFile(path.join(APP_ROOT, 'data/road-catalog.json')) as Record<string, unknown>
    expect(approved.catalogSchemaVersion).toBe(1)
    // The draft carries a free-text top-level "status" ("draft — CEO 未承認"); the approved file must not.
    expect(approved).not.toHaveProperty('status')
  })
})

describe('検査そのものが働く（見本で緑・壊した見本で赤）', () => {
  const temporaryRoots: string[] = []

  function copyOfValidFixture(): string {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'road-catalog-'))
    fs.cpSync(VALID_FIXTURE_ROOT, temporaryRoot, { recursive: true })
    temporaryRoots.push(temporaryRoot)
    return temporaryRoot
  }

  function editJson(filePath: string, edit: (value: Record<string, unknown>) => void) {
    const value = readJsonFile(filePath) as Record<string, unknown>
    edit(value)
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
  }

  function checksFailing(rootDir: string): CheckId[] {
    return [...new Set(collectCatalogDataProblems(rootDir, '2026-10-10').map((problem) => problem.check))]
  }

  afterEach(() => {
    for (const temporaryRoot of temporaryRoots.splice(0)) fs.rmSync(temporaryRoot, { recursive: true, force: true })
  })

  it('正しい見本は全部の検査を通る', () => {
    expect(collectCatalogDataProblems(VALID_FIXTURE_ROOT, '2026-10-10')).toEqual([])
  })

  it('0本のリスト（ids も空・ODbL 一式なし）は通る', () => {
    const root = copyOfValidFixture()
    editJson(path.join(root, 'data/road-catalog.json'), (catalog) => {
      catalog.roads = []
    })
    fs.writeFileSync(path.join(root, 'data/catalog-ids.txt'), '')
    fs.rmSync(path.join(root, 'public'), { recursive: true, force: true })
    fs.rmSync(path.join(root, 'data/geometry'), { recursive: true, force: true })
    expect(collectCatalogDataProblems(root, '2026-10-10')).toEqual([])
  })

  it.each(['draft-entry', 'unverified-note', 'norikura', 'forbidden-word', 'duplicate-id', 'two-wheel-unbacked'])(
    '壊れた見本 broken/%s.json を承認済みに置くと C1-C9 が赤',
    (fixture) => {
      const root = copyOfValidFixture()
      fs.copyFileSync(path.join(APP_ROOT, 'tests/fixtures/catalog/broken', `${fixture}.json`), path.join(root, 'data/road-catalog.json'))
      expect(checksFailing(root)).toContain('C1-C9')
    },
  )

  it('C4: catalog-ids.txt に足りない ID・余分な ID・重複があれば赤', () => {
    const missing = copyOfValidFixture()
    fs.writeFileSync(path.join(missing, 'data/catalog-ids.txt'), 'ashinoko-skyline\nyabitsu-toge\n')
    expect(checksFailing(missing)).toContain('C4')

    const extra = copyOfValidFixture()
    fs.appendFileSync(path.join(extra, 'data/catalog-ids.txt'), 'unknown-road\n')
    expect(checksFailing(extra)).toContain('C4')

    const duplicated = copyOfValidFixture()
    fs.appendFileSync(path.join(duplicated, 'data/catalog-ids.txt'), 'yabitsu-toge\n')
    expect(checksFailing(duplicated)).toContain('C4')
  })

  it('C4: catalog-ids.txt が無ければ赤', () => {
    const root = copyOfValidFixture()
    fs.rmSync(path.join(root, 'data/catalog-ids.txt'))
    expect(checksFailing(root)).toContain('C4')
  })

  it('C7: 道の形のファイルが無い・形が違う・代表点が外なら赤', () => {
    const missing = copyOfValidFixture()
    fs.rmSync(path.join(missing, 'data/geometry/yabitsu-toge.json'))
    expect(checksFailing(missing)).toContain('C7')

    const malformed = copyOfValidFixture()
    editJson(path.join(malformed, 'data/geometry/yabitsu-toge.json'), (geometry) => {
      geometry.lines = []
    })
    expect(checksFailing(malformed)).toContain('C7')

    const farPoint = copyOfValidFixture()
    editJson(path.join(farPoint, 'data/road-catalog.json'), (catalog) => {
      const roads = catalog.roads as Array<Record<string, unknown>>
      roads[1].representativePoint = { lat: 35.6, lng: 139.21 }
    })
    expect(checksFailing(farPoint)).toContain('C7')
  })

  it('C11: 道があるのに ODbL の一式が無い・表示が違うなら赤', () => {
    const noLicense = copyOfValidFixture()
    fs.rmSync(path.join(noLicense, 'public/data/catalog/LICENSE-ODbL.txt'))
    expect(checksFailing(noLicense)).toContain('C11')

    const wrongAttribution = copyOfValidFixture()
    editJson(path.join(wrongAttribution, 'public/data/catalog/road-catalog-odbl.json'), (odbl) => {
      odbl.attribution = 'OSM'
    })
    expect(checksFailing(wrongAttribution)).toContain('C11')
  })

  it('C12: 索引が 80KB・道の形のファイルが 30KB を超えたら赤', () => {
    const bigIndex = copyOfValidFixture()
    fs.writeFileSync(path.join(bigIndex, 'src/generated/catalog-index.json'), JSON.stringify({ padding: 'x'.repeat(MAX_INDEX_BYTES) }))
    expect(checksFailing(bigIndex)).toContain('C12')

    const bigRoad = copyOfValidFixture()
    fs.writeFileSync(path.join(bigRoad, 'public/data/catalog/roads/yabitsu-toge.json'), JSON.stringify({ padding: 'x'.repeat(MAX_ROAD_FILE_BYTES) }))
    expect(checksFailing(bigRoad)).toContain('C12')
  })
})
