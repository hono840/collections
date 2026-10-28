import { describe, expect, it } from 'vitest'
import {
  BACKUP_FILE_MAX_BYTES,
  BACKUP_REMINDER_DAYS,
  backupFileName,
  backupReminder,
  calendarDaysBetween,
  createBackupFileContent,
  formatBackupDate,
  parseBackupFile,
} from './backup'
import { createSeedData } from './seed'
import type { Spot, SpotsData } from './types'

// Backup file export / import helpers (spec AC32-AC38, docs/product/architecture.md 「古い版の守りとバックアップ」).
// Dates are built from LOCAL parts (new Date(year, monthIndex, day, ...)) so the expectations hold in
// any time zone; tests that need a specific zone set process.env.TZ, which Node applies at runtime.

const WANT_SPOT: Spot = {
  id: 22,
  name: '大観山',
  region: '神奈川',
  category: '絶景ロード',
  distanceKm: '60',
  exitInterchange: '小田原西IC',
  season: '紅葉の季節',
  memo: '一行目\n二行目',
  done: false,
}

const DONE_SPOT: Spot = {
  id: 3,
  name: '箱根スカイライン',
  region: '静岡・神奈川',
  category: '絶景ロード',
  distanceKm: '',
  exitInterchange: '',
  season: '',
  memo: '',
  done: true,
}

const BACKUP_DATA: SpotsData = { version: 2, nextId: 23, spots: [WANT_SPOT, DONE_SPOT] }

/** BACKUP_DATA as a file written by version 1 of the app holds it: no exitInterchange (AC46). */
const VERSION_1_BACKUP_DATA = {
  version: 1,
  nextId: 23,
  spots: [WANT_SPOT, DONE_SPOT].map((spot) => withoutKey({ ...spot }, 'exitInterchange')),
}
/** What reading VERSION_1_BACKUP_DATA must give: version 2 with every exitInterchange empty. */
const VERSION_1_BACKUP_DATA_READ: SpotsData = {
  version: 2,
  nextId: 23,
  spots: [WANT_SPOT, DONE_SPOT].map((spot) => ({ ...spot, exitInterchange: '' })),
}

/** Local 2026-10-20 21:30, i.e. 2026-10-20 in the device calendar whatever the zone. */
const EXPORTED_AT = new Date(2026, 9, 20, 21, 30, 15)

/** The parsed shape of a backup file as AC32 fixes it. */
function createBackupObject(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    app: 'drive-spots',
    backupVersion: 1,
    exportedAt: EXPORTED_AT.toISOString(),
    data: BACKUP_DATA,
    ...overrides,
  }
}

function withoutKey(source: Record<string, unknown>, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(source).filter(([entryKey]) => entryKey !== key))
}

/** Runs `run` with the process time zone set to `timeZone`, then restores it. */
function withTimeZone(timeZone: string, run: () => void) {
  const previousTimeZone = process.env.TZ
  process.env.TZ = timeZone
  try {
    run()
  } finally {
    if (previousTimeZone === undefined) {
      delete process.env.TZ
    } else {
      process.env.TZ = previousTimeZone
    }
  }
}

describe('constants', () => {
  it('AC34: a backup file may be at most 1,000,000 bytes', () => {
    expect(BACKUP_FILE_MAX_BYTES).toBe(1_000_000)
  })

  it('AC38: the reminder starts after 30 days', () => {
    expect(BACKUP_REMINDER_DAYS).toBe(30)
  })
})

describe('createBackupFileContent', () => {
  it('AC32: is the JSON of { app: "drive-spots", backupVersion: 1, exportedAt, data }', () => {
    const content = createBackupFileContent(BACKUP_DATA, EXPORTED_AT)

    expect(JSON.parse(content)).toEqual({
      app: 'drive-spots',
      backupVersion: 1,
      exportedAt: EXPORTED_AT.toISOString(),
      data: BACKUP_DATA,
    })
  })

  it('AC32: exportedAt is the ISO 8601 string of the time (Date#toISOString)', () => {
    const exportedAt = new Date('2026-10-25T00:12:34.567Z')

    const content = createBackupFileContent(BACKUP_DATA, exportedAt)

    expect(JSON.parse(content).exportedAt).toBe('2026-10-25T00:12:34.567Z')
  })

  it('AC32: is indented with 2 spaces, keys in the order app, backupVersion, exportedAt, data', () => {
    const content = createBackupFileContent(BACKUP_DATA, EXPORTED_AT)

    expect(content.trimEnd()).toBe(
      JSON.stringify(
        { app: 'drive-spots', backupVersion: 1, exportedAt: EXPORTED_AT.toISOString(), data: BACKUP_DATA },
        null,
        2,
      ),
    )
    expect(content.startsWith('{\n  "app": "drive-spots",\n  "backupVersion": 1,\n')).toBe(true)
  })

  it('AC46: writes backupVersion 1 (unchanged) around data of version 2', () => {
    const parsedContent = JSON.parse(createBackupFileContent(createSeedData(), EXPORTED_AT))

    expect(parsedContent.backupVersion).toBe(1)
    expect(parsedContent.data.version).toBe(2)
  })

  it('AC46/AC47: writes the exitInterchange of every spot', () => {
    const parsedContent = JSON.parse(createBackupFileContent(BACKUP_DATA, EXPORTED_AT))

    expect(parsedContent.data.spots.map((spot: Spot) => spot.exitInterchange)).toEqual(['小田原西IC', ''])
  })

  it('AC32: keeps the data as it is (nextId, ids, order, line breaks)', () => {
    const seedData = createSeedData()

    const content = createBackupFileContent(seedData, EXPORTED_AT)

    expect(JSON.parse(content).data).toEqual(seedData)
  })

  it('does not mutate the data', () => {
    const data = structuredClone(BACKUP_DATA)

    createBackupFileContent(data, EXPORTED_AT)

    expect(data).toEqual(BACKUP_DATA)
  })
})

describe('backupFileName', () => {
  it('AC32: is drive-spots-YYYY-MM-DD.json', () => {
    expect(backupFileName(new Date(2026, 9, 25, 10, 0))).toBe('drive-spots-2026-10-25.json')
  })

  it('AC32: pads the month and the day to 2 digits', () => {
    expect(backupFileName(new Date(2026, 0, 5, 12, 0))).toBe('drive-spots-2026-01-05.json')
  })

  it('AC32: uses the device calendar date early in the morning and late at night', () => {
    expect(backupFileName(new Date(2026, 9, 25, 0, 5))).toBe('drive-spots-2026-10-25.json')
    expect(backupFileName(new Date(2026, 9, 25, 23, 55))).toBe('drive-spots-2026-10-25.json')
  })

  it('AC32: in Japan, 00:30 on Oct 25 is named 2026-10-25 although it is still Oct 24 in UTC', () => {
    withTimeZone('Asia/Tokyo', () => {
      const exportedAt = new Date('2026-10-24T15:30:00.000Z') // 2026-10-25 00:30 in Tokyo

      expect(backupFileName(exportedAt)).toBe('drive-spots-2026-10-25.json')
    })
  })
})

describe('parseBackupFile', () => {
  describe('ok (AC35)', () => {
    it('AC35: reads a file written by createBackupFileContent (round trip)', () => {
      const content = createBackupFileContent(BACKUP_DATA, EXPORTED_AT)

      const parsed = parseBackupFile(content)

      expect(parsed).toEqual({ kind: 'ok', data: BACKUP_DATA, exportedAt: EXPORTED_AT })
    })

    it('AC35: round-trips the seed data, nextId included', () => {
      const seedData = createSeedData()

      const parsed = parseBackupFile(createBackupFileContent(seedData, EXPORTED_AT))

      expect(parsed).toEqual({ kind: 'ok', data: seedData, exportedAt: EXPORTED_AT })
    })

    it('AC35/AC37: round-trips names that look like HTML as plain strings', () => {
      const htmlLikeData: SpotsData = {
        version: 2,
        nextId: 8,
        spots: [{ ...WANT_SPOT, id: 7, name: '<img src=x onerror=alert(1)>', memo: '<script>alert(1)</script>' }],
      }

      const parsed = parseBackupFile(createBackupFileContent(htmlLikeData, EXPORTED_AT))

      expect(parsed).toEqual({ kind: 'ok', data: htmlLikeData, exportedAt: EXPORTED_AT })
    })

    it('AC16/AC35: reads a file whose nextId is exactly 1,000,000,000 (the largest allowed)', () => {
      const largestData: SpotsData = { version: 2, nextId: 1_000_000_000, spots: [{ ...WANT_SPOT, id: 999_999_999 }] }

      const parsed = parseBackupFile(createBackupFileContent(largestData, EXPORTED_AT))

      expect(parsed).toEqual({ kind: 'ok', data: largestData, exportedAt: EXPORTED_AT })
    })

    it('AC35: reads a file without indentation', () => {
      const parsed = parseBackupFile(JSON.stringify(createBackupObject()))

      expect(parsed).toEqual({ kind: 'ok', data: BACKUP_DATA, exportedAt: EXPORTED_AT })
    })

    it('AC35: reads a backup of an empty list', () => {
      const emptyData: SpotsData = { version: 2, nextId: 20, spots: [] }

      const parsed = parseBackupFile(JSON.stringify(createBackupObject({ data: emptyData })))

      expect(parsed).toEqual({ kind: 'ok', data: emptyData, exportedAt: EXPORTED_AT })
    })

    it('AC46: reads a file whose data is version 1 (made before the version 2 release) as version 2 with exitInterchange empty', () => {
      const parsed = parseBackupFile(JSON.stringify(createBackupObject({ data: VERSION_1_BACKUP_DATA })))

      expect(parsed).toEqual({ kind: 'ok', data: VERSION_1_BACKUP_DATA_READ, exportedAt: EXPORTED_AT })
    })

    it('AC46: reads a version 1 empty list as a version 2 empty list', () => {
      const parsed = parseBackupFile(JSON.stringify(createBackupObject({ data: { version: 1, nextId: 20, spots: [] } })))

      expect(parsed).toEqual({ kind: 'ok', data: { version: 2, nextId: 20, spots: [] }, exportedAt: EXPORTED_AT })
    })

    it('AC46: an exitInterchange key inside version 1 data is ignored', () => {
      const dataWithKey = {
        ...VERSION_1_BACKUP_DATA,
        spots: VERSION_1_BACKUP_DATA.spots.map((spot) => ({ ...spot, exitInterchange: '小田原西IC' })),
      }

      const parsed = parseBackupFile(JSON.stringify(createBackupObject({ data: dataWithKey })))

      expect(parsed).toEqual({ kind: 'ok', data: VERSION_1_BACKUP_DATA_READ, exportedAt: EXPORTED_AT })
    })

    it('AC46/AC1: the seed in a version 1 file reads as the version 2 seed', () => {
      const seedData = createSeedData()
      const version1Seed = {
        version: 1,
        nextId: seedData.nextId,
        spots: seedData.spots.map((spot) => withoutKey({ ...spot }, 'exitInterchange')),
      }

      const parsed = parseBackupFile(JSON.stringify(createBackupObject({ data: version1Seed })))

      expect(parsed).toEqual({ kind: 'ok', data: seedData, exportedAt: EXPORTED_AT })
    })

    it('AC34/AC46: data.version 2 is this version now, so a valid version 2 file is ok (not newer)', () => {
      const parsed = parseBackupFile(JSON.stringify(createBackupObject({ data: BACKUP_DATA })))

      expect(parsed).toEqual({ kind: 'ok', data: BACKUP_DATA, exportedAt: EXPORTED_AT })
    })

    it('AC35: exportedAt comes back as a Date', () => {
      const parsed = parseBackupFile(JSON.stringify(createBackupObject()))

      expect(parsed.kind).toBe('ok')
      if (parsed.kind !== 'ok') return
      expect(parsed.exportedAt).toBeInstanceOf(Date)
      expect(parsed.exportedAt.toISOString()).toBe(EXPORTED_AT.toISOString())
    })
  })

  describe('invalid (AC34)', () => {
    it.each<[string, string]>([
      ['an empty file', ''],
      ['text that is not JSON', 'ドライブスポット'],
      ['broken JSON', '{"app":"drive-spots","backupVersion":1,'],
      ['JSON null', 'null'],
      ['a JSON array', '[]'],
      ['a JSON string', '"drive-spots"'],
      ['a JSON number', '1'],
      ['the saved data alone (not a backup file)', JSON.stringify(BACKUP_DATA)],
    ])('AC34: is invalid for %s', (_description, text) => {
      expect(parseBackupFile(text)).toEqual({ kind: 'invalid' })
    })

    const SPOT_WITH_BAD_CATEGORY = { ...WANT_SPOT, category: '林道' }

    it.each<[string, Record<string, unknown>]>([
      ['a missing app', withoutKey(createBackupObject(), 'app')],
      ['another app', createBackupObject({ app: 'road-review' })],
      ['app in another case', createBackupObject({ app: 'Drive-Spots' })],
      ['another app with backupVersion 2 (app is checked first)', createBackupObject({ app: 'road-review', backupVersion: 2 })],
      ['a missing backupVersion', withoutKey(createBackupObject(), 'backupVersion')],
      ['backupVersion 0', createBackupObject({ backupVersion: 0 })],
      ['backupVersion -1', createBackupObject({ backupVersion: -1 })],
      ['backupVersion 1.5', createBackupObject({ backupVersion: 1.5 })],
      ["backupVersion as the string '1'", createBackupObject({ backupVersion: '1' })],
      ["backupVersion as the string '2' (a string is not a newer version)", createBackupObject({ backupVersion: '2' })],
      ['backupVersion null', createBackupObject({ backupVersion: null })],
      ['backupVersion 2^53 (not a safe integer)', createBackupObject({ backupVersion: 2 ** 53 })],
      ['a missing exportedAt', withoutKey(createBackupObject(), 'exportedAt')],
      ['exportedAt as a number', createBackupObject({ exportedAt: EXPORTED_AT.getTime() })],
      ['exportedAt null', createBackupObject({ exportedAt: null })],
      ['an empty exportedAt', createBackupObject({ exportedAt: '' })],
      ['exportedAt that is not a time', createBackupObject({ exportedAt: 'yesterday' })],
      ['exportedAt with an impossible day', createBackupObject({ exportedAt: '2026-10-32T00:00:00.000Z' })],
      ['a missing data', withoutKey(createBackupObject(), 'data')],
      ['data null', createBackupObject({ data: null })],
      ['data as an array', createBackupObject({ data: [WANT_SPOT] })],
      ['data as the JSON text of valid data', createBackupObject({ data: JSON.stringify(BACKUP_DATA) })],
      ["data.version as the string '1'", createBackupObject({ data: { ...BACKUP_DATA, version: '1' } })],
      ["data.version as the string '2' (corrupt, not newer)", createBackupObject({ data: { ...BACKUP_DATA, version: '2' } })],
      ['data.version 0', createBackupObject({ data: { ...BACKUP_DATA, version: 0 } })],
      ['data.version 1.5', createBackupObject({ data: { ...BACKUP_DATA, version: 1.5 } })],
      ['data without version', createBackupObject({ data: withoutKey({ ...BACKUP_DATA }, 'version') })],
      ['data without nextId', createBackupObject({ data: withoutKey({ ...BACKUP_DATA }, 'nextId') })],
      ['data with nextId as a string', createBackupObject({ data: { ...BACKUP_DATA, nextId: '23' } })],
      ['data with spots as a string', createBackupObject({ data: { ...BACKUP_DATA, spots: '[]' } })],
      ['a spot with an unknown category', createBackupObject({ data: { ...BACKUP_DATA, spots: [SPOT_WITH_BAD_CATEGORY] } })],
      [
        "a spot with done as the string 'true'",
        createBackupObject({ data: { ...BACKUP_DATA, spots: [{ ...DONE_SPOT, done: 'true' }] } }),
      ],
      [
        'a spot without memo',
        createBackupObject({ data: { ...BACKUP_DATA, spots: [withoutKey({ ...WANT_SPOT }, 'memo')] } }),
      ],
      [
        'duplicate spot ids',
        createBackupObject({ data: { ...BACKUP_DATA, spots: [WANT_SPOT, { ...DONE_SPOT, id: WANT_SPOT.id }] } }),
      ],
      ['data with nextId 1,000,000,001 (above MAX_NEXT_ID, AC16)', createBackupObject({ data: { ...BACKUP_DATA, nextId: 1_000_000_001 } })],
      ['data with nextId Number.MAX_SAFE_INTEGER (AC16)', createBackupObject({ data: { ...BACKUP_DATA, nextId: Number.MAX_SAFE_INTEGER } })],
      [
        'a spot id equal to nextId (the id would be reused, AC16)',
        createBackupObject({ data: { ...BACKUP_DATA, spots: [{ ...WANT_SPOT, id: BACKUP_DATA.nextId }] } }),
      ],
      // AC34/AC46: version 2 is this version's own format, so a broken one is invalid, not newer.
      ['data that is only { version: 2 }', createBackupObject({ data: { version: 2 } })],
      ['data.version 2 in an unknown shape', createBackupObject({ data: { version: 2, places: [{ title: '大観山' }] } })],
      [
        'data.version 2 with a spot without exitInterchange',
        createBackupObject({ data: { ...BACKUP_DATA, spots: [withoutKey({ ...WANT_SPOT }, 'exitInterchange')] } }),
      ],
      [
        'data.version 2 with exitInterchange as a number',
        createBackupObject({ data: { ...BACKUP_DATA, spots: [{ ...WANT_SPOT, exitInterchange: 0 }] } }),
      ],
      ['data.version 2 with the version 1 shape', createBackupObject({ data: { ...VERSION_1_BACKUP_DATA, version: 2 } })],
      ["data.version as the string '3' (corrupt, not newer)", createBackupObject({ data: { ...BACKUP_DATA, version: '3' } })],
      ['data.version 2.5', createBackupObject({ data: { ...BACKUP_DATA, version: 2.5 } })],
      // AC46: version 1 data is checked as strictly as before (AC14, AC16).
      [
        'data.version 1 with a spot without memo',
        createBackupObject({
          data: { ...VERSION_1_BACKUP_DATA, spots: [withoutKey({ ...VERSION_1_BACKUP_DATA.spots[0] }, 'memo')] },
        }),
      ],
      [
        'data.version 1 with duplicate spot ids',
        createBackupObject({
          data: { ...VERSION_1_BACKUP_DATA, spots: [VERSION_1_BACKUP_DATA.spots[0], VERSION_1_BACKUP_DATA.spots[0]] },
        }),
      ],
      [
        'data.version 1 with nextId 1,000,000,001 (AC16)',
        createBackupObject({ data: { ...VERSION_1_BACKUP_DATA, nextId: 1_000_000_001 } }),
      ],
    ])('AC34: is invalid for a file with %s', (_description, fileObject) => {
      expect(parseBackupFile(JSON.stringify(fileObject))).toEqual({ kind: 'invalid' })
    })
  })

  describe('newer (AC34)', () => {
    it.each<[string, Record<string, unknown>]>([
      ['backupVersion 2 and valid data', createBackupObject({ backupVersion: 2 })],
      ['backupVersion 3 and data in an unknown shape', createBackupObject({ backupVersion: 3, data: { places: 'x' } })],
      ['backupVersion 2 and no data', withoutKey(createBackupObject({ backupVersion: 2 }), 'data')],
      ['backupVersion 2 and no exportedAt', withoutKey(createBackupObject({ backupVersion: 2 }), 'exportedAt')],
      ['the largest safe integer as backupVersion', createBackupObject({ backupVersion: Number.MAX_SAFE_INTEGER })],
      ['backupVersion 2 and version 1 data', createBackupObject({ backupVersion: 2, data: VERSION_1_BACKUP_DATA })],
      ['backupVersion 1 and data.version 3', createBackupObject({ data: { ...BACKUP_DATA, version: 3 } })],
      [
        'backupVersion 1 and data.version 3 in an unknown shape',
        createBackupObject({ data: { version: 3, places: [{ title: '大観山' }] } }),
      ],
      ['backupVersion 1 and data that is only { version: 3 }', createBackupObject({ data: { version: 3 } })],
      ['backupVersion 1 and the largest safe integer as data.version', createBackupObject({ data: { version: Number.MAX_SAFE_INTEGER } })],
    ])('AC34: is newer for a file with %s', (_description, fileObject) => {
      expect(parseBackupFile(JSON.stringify(fileObject))).toEqual({ kind: 'newer' })
    })
  })

  // JSON.parse makes "__proto__" an ordinary own key, so a crafted file can carry one. It must never
  // stand in for a missing field, and nothing extra in the file may reach the result or
  // Object.prototype (security; AC34, AC35, AC46).
  describe('crafted "__proto__" keys and extra keys (security; AC34, AC35, AC46)', () => {
    /** The 9 fields every spot that comes back has, no more and no fewer (AC46). */
    const SPOT_KEYS = ['id', 'name', 'region', 'category', 'distanceKm', 'exitInterchange', 'season', 'memo', 'done']
    /** What a crafted "__proto__" or constructor.prototype key tries to slip into every object. */
    const POLLUTING_PROTO_JSON = '{"isAdmin":true,"exitInterchange":"汚染"}'

    type DataLike = { version: number; nextId: number; spots: Record<string, unknown>[] }

    /** The JSON text of `ownFields` with `"__proto__": <protoJson>` as its first key. */
    function jsonWithOwnProtoKey(ownFields: Record<string, unknown>, protoJson: string): string {
      const ownFieldsJson = JSON.stringify(ownFields).slice(1, -1)
      return ownFieldsJson === '' ? `{"__proto__":${protoJson}}` : `{"__proto__":${protoJson},${ownFieldsJson}}`
    }

    /** A backup file as JSON text whose data is the given JSON text; app, backupVersion and exportedAt are valid. */
    function backupFileTextWithDataJson(dataJson: string): string {
      const fileFieldsJson = JSON.stringify(withoutKey(createBackupObject(), 'data')).slice(1, -1)
      return `{${fileFieldsJson},"data":${dataJson}}`
    }

    /** Data with one spot as JSON text, where `key` is not an own field of the spot but sits under its own "__proto__" key. */
    function dataJsonWithSpotFieldOnlyUnderProto(validData: DataLike, key: string): string {
      const validSpot = validData.spots[0]
      const spotJson = jsonWithOwnProtoKey(withoutKey(validSpot, key), JSON.stringify({ [key]: validSpot[key] }))
      return `{"version":${validData.version},"nextId":${validData.nextId},"spots":[${spotJson}]}`
    }

    /**
     * A valid file as JSON text with hostile extras: every spot carries isAdmin: true and its own
     * "__proto__" key; data and the file itself carry extra keys and their own "__proto__" key.
     */
    function backupFileTextWithHostileExtras(validData: DataLike): string {
      const spotJsonTexts = validData.spots.map((spot) => jsonWithOwnProtoKey({ ...spot, isAdmin: true }, POLLUTING_PROTO_JSON))
      const dataFields = [
        `"__proto__":${POLLUTING_PROTO_JSON}`,
        `"version":${validData.version}`,
        `"nextId":${validData.nextId}`,
        `"spots":[${spotJsonTexts.join(',')}]`,
        '"extra":"data level"',
        `"constructor":{"prototype":${POLLUTING_PROTO_JSON}}`,
      ]
      const fileFields = [
        `"__proto__":${POLLUTING_PROTO_JSON}`,
        JSON.stringify(withoutKey(createBackupObject(), 'data')).slice(1, -1),
        `"data":{${dataFields.join(',')}}`,
        '"isAdmin":true',
      ]
      return `{${fileFields.join(',')}}`
    }

    it.each<[string, string]>([
      [
        'a version 2 spot whose exitInterchange is only under its own "__proto__" key',
        backupFileTextWithDataJson(dataJsonWithSpotFieldOnlyUnderProto(BACKUP_DATA, 'exitInterchange')),
      ],
      [
        'a version 2 spot whose memo is only under its own "__proto__" key',
        backupFileTextWithDataJson(dataJsonWithSpotFieldOnlyUnderProto(BACKUP_DATA, 'memo')),
      ],
      [
        'a version 1 spot whose done is only under its own "__proto__" key',
        backupFileTextWithDataJson(dataJsonWithSpotFieldOnlyUnderProto(VERSION_1_BACKUP_DATA, 'done')),
      ],
      [
        'data.version 2 only under the data\'s own "__proto__" key',
        backupFileTextWithDataJson(jsonWithOwnProtoKey(withoutKey({ ...BACKUP_DATA }, 'version'), '{"version":2}')),
      ],
      [
        'data.version 1 only under the data\'s own "__proto__" key',
        backupFileTextWithDataJson(jsonWithOwnProtoKey(withoutKey(VERSION_1_BACKUP_DATA, 'version'), '{"version":1}')),
      ],
      [
        'data.version 3 only under the data\'s own "__proto__" key (not newer either)',
        backupFileTextWithDataJson(jsonWithOwnProtoKey(withoutKey({ ...BACKUP_DATA }, 'version'), '{"version":3}')),
      ],
      [
        'the whole data only under the data\'s own "__proto__" key',
        backupFileTextWithDataJson(jsonWithOwnProtoKey({}, JSON.stringify(BACKUP_DATA))),
      ],
      [
        'data only under the file\'s own "__proto__" key',
        jsonWithOwnProtoKey(withoutKey(createBackupObject(), 'data'), JSON.stringify({ data: BACKUP_DATA })),
      ],
      [
        'app only under the file\'s own "__proto__" key',
        jsonWithOwnProtoKey(withoutKey(createBackupObject(), 'app'), '{"app":"drive-spots"}'),
      ],
      [
        'backupVersion only under the file\'s own "__proto__" key',
        jsonWithOwnProtoKey(withoutKey(createBackupObject(), 'backupVersion'), '{"backupVersion":1}'),
      ],
    ])('AC34: is invalid for a file with %s', (_description, text) => {
      expect(parseBackupFile(text)).toEqual({ kind: 'invalid' })
    })

    it.each<[string, DataLike, SpotsData]>([
      ['version 2', BACKUP_DATA, BACKUP_DATA],
      ['version 1', VERSION_1_BACKUP_DATA, VERSION_1_BACKUP_DATA_READ],
    ])(
      'AC35/AC46: reads a valid file with %s data and isAdmin, extra, constructor and "__proto__" keys as fresh objects with only the known fields',
      (_description, validData, expectedData) => {
        const parsed = parseBackupFile(backupFileTextWithHostileExtras(validData))

        expect(parsed).toEqual({ kind: 'ok', data: expectedData, exportedAt: EXPORTED_AT })
        if (parsed.kind !== 'ok') return
        expect(Object.keys(parsed.data).sort()).toEqual(['nextId', 'spots', 'version'])
        expect(Object.getPrototypeOf(parsed.data)).toBe(Object.prototype)
        for (const spot of parsed.data.spots) {
          expect(Object.keys(spot).sort()).toEqual([...SPOT_KEYS].sort())
          expect(Object.getPrototypeOf(spot)).toBe(Object.prototype)
        }
      },
    )

    it('AC34: reading crafted files leaves Object.prototype untouched (no prototype pollution)', () => {
      parseBackupFile(backupFileTextWithHostileExtras(BACKUP_DATA))
      parseBackupFile(backupFileTextWithHostileExtras(VERSION_1_BACKUP_DATA))
      parseBackupFile(backupFileTextWithDataJson(dataJsonWithSpotFieldOnlyUnderProto(BACKUP_DATA, 'exitInterchange')))

      const freshObject: Record<string, unknown> = {}
      expect(freshObject.exitInterchange).toBeUndefined()
      expect(freshObject.isAdmin).toBeUndefined()
      expect(Object.hasOwn(Object.prototype, 'exitInterchange')).toBe(false)
      expect(Object.hasOwn(Object.prototype, 'isAdmin')).toBe(false)
    })
  })
})

describe('calendarDaysBetween', () => {
  it('AC33: is 0 within the same calendar day', () => {
    expect(calendarDaysBetween(new Date(2026, 9, 25, 0, 0), new Date(2026, 9, 25, 23, 59))).toBe(0)
  })

  it('AC33: is 1 across midnight, even 2 minutes apart', () => {
    expect(calendarDaysBetween(new Date(2026, 9, 24, 23, 59), new Date(2026, 9, 25, 0, 1))).toBe(1)
  })

  it('AC33: is 1 from 00:01 to 23:59 on the next day (almost 2 days of time)', () => {
    expect(calendarDaysBetween(new Date(2026, 9, 24, 0, 1), new Date(2026, 9, 25, 23, 59))).toBe(1)
  })

  it('AC33: counts calendar dates, not 24-hour periods (Oct 20 23:00 -> Oct 25 01:00 is 5)', () => {
    expect(calendarDaysBetween(new Date(2026, 9, 20, 23, 0), new Date(2026, 9, 25, 1, 0))).toBe(5)
  })

  it('AC33: counts across months and years', () => {
    expect(calendarDaysBetween(new Date(2026, 8, 25, 12, 0), new Date(2026, 9, 25, 12, 0))).toBe(30)
    expect(calendarDaysBetween(new Date(2025, 11, 31, 23, 0), new Date(2026, 0, 1, 1, 0))).toBe(1)
  })

  it('AC33: is 0 when the time is in the future (a later day or later on the same day)', () => {
    expect(calendarDaysBetween(new Date(2026, 9, 26, 9, 0), new Date(2026, 9, 25, 9, 0))).toBe(0)
    expect(calendarDaysBetween(new Date(2026, 9, 25, 18, 0), new Date(2026, 9, 25, 9, 0))).toBe(0)
    expect(calendarDaysBetween(new Date(2027, 0, 1), new Date(2026, 9, 25))).toBe(0)
  })

  it('AC33: counts the local calendar in Japan (UTC dates differ before 09:00)', () => {
    withTimeZone('Asia/Tokyo', () => {
      const from = new Date('2026-10-23T15:30:00.000Z') // 2026-10-24 00:30 in Tokyo
      const to = new Date('2026-10-24T14:30:00.000Z') // 2026-10-24 23:30 in Tokyo

      expect(calendarDaysBetween(from, to)).toBe(0)
    })
  })

  it('AC33: a day that is 23 hours long (daylight saving starts) still counts as 1', (context) => {
    withTimeZone('America/New_York', () => {
      const from = new Date(2026, 2, 8, 0, 0) // 2026-03-08 is the day the clocks go forward in New York
      const to = new Date(2026, 2, 9, 0, 0)
      if (from.getTimezoneOffset() === to.getTimezoneOffset()) {
        context.skip()
      }

      expect(calendarDaysBetween(from, to)).toBe(1)
    })
  })
})

describe('formatBackupDate', () => {
  it("AC33: shows today as '2026年10月25日（今日）'", () => {
    expect(formatBackupDate(new Date(2026, 9, 25, 8, 0), new Date(2026, 9, 25, 21, 0))).toBe('2026年10月25日（今日）')
  })

  it("AC33: shows 5 calendar days ago as '2026年10月20日（5日前）'", () => {
    expect(formatBackupDate(new Date(2026, 9, 20, 23, 0), new Date(2026, 9, 25, 1, 0))).toBe('2026年10月20日（5日前）')
  })

  it("AC33: shows the day before as '（1日前）', even 2 minutes after midnight", () => {
    expect(formatBackupDate(new Date(2026, 9, 24, 23, 59), new Date(2026, 9, 25, 0, 1))).toBe('2026年10月24日（1日前）')
  })

  it('AC33: writes the month and day without leading zeros', () => {
    expect(formatBackupDate(new Date(2026, 0, 5, 9, 0), new Date(2026, 0, 5, 10, 0))).toBe('2026年1月5日（今日）')
  })

  it('AC33: counts across the year', () => {
    expect(formatBackupDate(new Date(2025, 11, 31, 22, 0), new Date(2026, 0, 1, 7, 0))).toBe('2025年12月31日（1日前）')
  })

  it('AC33: shows the device calendar date (Japan, 00:30 local)', () => {
    withTimeZone('Asia/Tokyo', () => {
      const at = new Date('2026-10-19T15:30:00.000Z') // 2026-10-20 00:30 in Tokyo
      const now = new Date('2026-10-25T03:00:00.000Z') // 2026-10-25 12:00 in Tokyo

      expect(formatBackupDate(at, now)).toBe('2026年10月20日（5日前）')
    })
  })
})

describe('backupReminder', () => {
  const NOW = new Date(2026, 9, 25, 0, 1)

  it('AC38: is none when nothing is saved on this device, backed up or not', () => {
    expect(backupReminder(false, null, NOW)).toBe('none')
    expect(backupReminder(false, new Date(2025, 0, 1), NOW)).toBe('none')
  })

  it('AC38: is never when data is saved and it was never exported', () => {
    expect(backupReminder(true, null, NOW)).toBe('never')
  })

  it('AC38: is none right after an export today', () => {
    expect(backupReminder(true, new Date(2026, 9, 25, 0, 0), NOW)).toBe('none')
  })

  it('AC38: is none at 29 calendar days (although almost 30 days of time have passed)', () => {
    const lastBackupAt = new Date(2026, 8, 26, 0, 0)
    const now = new Date(2026, 9, 25, 23, 59)

    expect(backupReminder(true, lastBackupAt, now)).toBe('none')
  })

  it('AC38: is stale at exactly 30 calendar days (although only 29 days and 2 minutes of time have passed)', () => {
    const lastBackupAt = new Date(2026, 8, 25, 23, 59)

    expect(backupReminder(true, lastBackupAt, NOW)).toBe('stale')
  })

  it('AC38: is stale after more than 30 days', () => {
    expect(backupReminder(true, new Date(2026, 8, 24, 12, 0), NOW)).toBe('stale')
    expect(backupReminder(true, new Date(2025, 0, 1), NOW)).toBe('stale')
  })

  it('AC38: is none when the last export is in the future (device clock moved back)', () => {
    expect(backupReminder(true, new Date(2026, 10, 30), NOW)).toBe('none')
  })
})
