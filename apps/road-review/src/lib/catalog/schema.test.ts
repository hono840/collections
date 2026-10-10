// @vitest-environment node
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  CATALOG_FORBIDDEN_WORDS,
  EXCLUDED_ROAD_KEYWORDS,
  catalogEntrySchema,
  catalogFileSchema,
  geometryFileSchema,
  validateApprovedCatalog,
  type CatalogIssueCode,
} from './schema'

// ARCH v3 3.3 (shape), 3.4 (C1-C9), CEO decisions 2026-10-10 in road-catalog-draft.md:
//   1. 乗鞍スカイライン / 乗鞍エコーライン are excluded.
//   2. Roads closed to two-wheelers stay, with a prominent "二輪通行不可" badge (flags.twoWheelBanned).
//   3. Regulations not confirmed on an official page are NOT shown -> unverified notes are rejected
//      from the APPROVED catalog (drafts may still carry them).

const FIXTURES = fileURLToPath(new URL('../../../tests/fixtures/catalog/', import.meta.url))
const TODAY = '2026-10-10'

function readJson(relativePath: string): unknown {
  return JSON.parse(fs.readFileSync(`${FIXTURES}${relativePath}`, 'utf8'))
}

type Json = Record<string, unknown>

function validFile(): Json & { roads: Json[] } {
  return readJson('valid-root/data/road-catalog.json') as Json & { roads: Json[] }
}

function validEntry(index = 0): Json {
  return validFile().roads[index]
}

function issueCodesOf(input: unknown, today = TODAY): CatalogIssueCode[] {
  const result = validateApprovedCatalog(input, { today })
  return result.ok ? [] : result.issues.map((issue) => issue.code)
}

function fileWith(...roads: Json[]): Json {
  return { ...validFile(), roads }
}

describe('catalogEntrySchema（3.3 の形）', () => {
  it('正しい見本の道（承認・引退）を全部受け入れる', () => {
    for (const road of validFile().roads) {
      expect(catalogEntrySchema.safeParse(road).success).toBe(true)
    }
  })

  describe('id', () => {
    it.each([
      ['大文字', 'Yabitsu-toge'],
      ['アンダースコア', 'yabitsu_toge'],
      ['先頭のハイフン', '-yabitsu'],
      ['連続したハイフン', 'yabitsu--toge'],
      ['末尾のハイフン', 'yabitsu-'],
      ['2文字（短すぎる）', 'ab'],
      ['61文字（長すぎる）', 'a'.repeat(61)],
      ['日本語', 'やびつ'],
      ['own- で始まる（自分で追加した道の鍵と衝突）', 'own-yabitsu'],
    ])('%s の id を断る', (_label, id) => {
      expect(catalogEntrySchema.safeParse({ ...validEntry(), id }).success).toBe(false)
    })

    it('3文字と60文字の id は受け入れる', () => {
      expect(catalogEntrySchema.safeParse({ ...validEntry(), id: 'abc' }).success).toBe(true)
      expect(catalogEntrySchema.safeParse({ ...validEntry(), id: 'a'.repeat(60) }).success).toBe(true)
    })
  })

  describe('name（表示名）', () => {
    it.each([
      ['空', ''],
      ['41文字', 'あ'.repeat(41)],
      ['NFKC でない（半角カナ）', 'ﾔﾋﾞﾂ峠'],
      ['NFKC でない（全角英数）', 'ＡＢＣライン'],
      ['制御文字', 'ヤビツ\u0007峠'],
      ['bidi 制御文字', 'ヤビツ‮峠'],
    ])('%s の名前を断る', (_label, name) => {
      expect(catalogEntrySchema.safeParse({ ...validEntry(), name }).success).toBe(false)
    })
  })

  describe('reading（読み）', () => {
    it.each([
      ['カタカナ', 'ヤビツとうげ'],
      ['漢字', 'やびつ峠'],
      ['ローマ字', 'yabitsu'],
      ['空白', 'やびつ とうげ'],
      ['空', ''],
      ['61文字', 'あ'.repeat(61)],
    ])('%s を含む読みを断る', (_label, reading) => {
      expect(catalogEntrySchema.safeParse({ ...validEntry(), reading }).success).toBe(false)
    })

    it('ひらがなと「ー」だけの読みは受け入れる', () => {
      expect(catalogEntrySchema.safeParse({ ...validEntry(), reading: 'すかいらいんー' }).success).toBe(true)
    })
  })

  describe('aliases（別名）', () => {
    it('common・former の別名には読みが要る', () => {
      for (const kind of ['common', 'former']) {
        const aliases = [{ name: '芦ノ湖スカイ', kind }]
        expect(catalogEntrySchema.safeParse({ ...validEntry(), aliases }).success).toBe(false)
      }
    })

    it('official・route の別名は読みがなくてよい', () => {
      for (const kind of ['official', 'route']) {
        const aliases = [{ name: '神奈川県道70号', kind }]
        expect(catalogEntrySchema.safeParse({ ...validEntry(), aliases }).success).toBe(true)
      }
    })

    it('別名の読みにもカタカナを使えない', () => {
      const aliases = [{ name: '芦ノ湖スカイ', reading: 'アシノコ', kind: 'common' }]
      expect(catalogEntrySchema.safeParse({ ...validEntry(), aliases }).success).toBe(false)
    })

    it('別名は8つまで', () => {
      const alias = { name: '県道', kind: 'route' }
      expect(catalogEntrySchema.safeParse({ ...validEntry(), aliases: Array(8).fill(alias) }).success).toBe(true)
      expect(catalogEntrySchema.safeParse({ ...validEntry(), aliases: Array(9).fill(alias) }).success).toBe(false)
    })

    it('知らない kind を断る', () => {
      const aliases = [{ name: '県道', kind: 'nickname' }]
      expect(catalogEntrySchema.safeParse({ ...validEntry(), aliases }).success).toBe(false)
    })
  })

  describe('roadType・prefectureCodes・rank', () => {
    it('roadType は pass / skyline / coastal / forest / other だけ', () => {
      for (const roadType of ['pass', 'skyline', 'coastal', 'forest', 'other']) {
        const entry = { ...validEntry(), roadType }
        delete (entry as Json).elevationM
        expect(catalogEntrySchema.safeParse(entry).success).toBe(true)
      }
      expect(catalogEntrySchema.safeParse({ ...validEntry(), roadType: '峠' }).success).toBe(false)
    })

    it.each([
      ['0本', []],
      ['4本', [13, 14, 19, 22]],
      ['0 のコード', [0]],
      ['48 のコード', [48]],
      ['小数のコード', [14.5]],
      ['重なり', [14, 14]],
    ])('都道府県コードが %s なら断る', (_label, prefectureCodes) => {
      expect(catalogEntrySchema.safeParse({ ...validEntry(), prefectureCodes }).success).toBe(false)
    })

    it('都道府県コードは1〜3本・1〜47 を受け入れる', () => {
      expect(catalogEntrySchema.safeParse({ ...validEntry(), prefectureCodes: [1] }).success).toBe(true)
      expect(catalogEntrySchema.safeParse({ ...validEntry(), prefectureCodes: [47, 46, 45] }).success).toBe(true)
    })

    it.each([0, -1, 1.5])('rank %s を断る（1以上の整数）', (rank) => {
      expect(catalogEntrySchema.safeParse({ ...validEntry(), rank }).success).toBe(false)
    })
  })

  describe('section・elevationM・representativePoint', () => {
    it('区間の from / to は1〜30文字', () => {
      expect(catalogEntrySchema.safeParse({ ...validEntry(), section: { from: '', to: '箱根峠' } }).success).toBe(false)
      expect(
        catalogEntrySchema.safeParse({ ...validEntry(), section: { from: 'あ'.repeat(31), to: '箱根峠' } }).success,
      ).toBe(false)
    })

    it('標高は峠（pass）だけに付けられ、0〜3500', () => {
      const pass = validEntry(1)
      expect(catalogEntrySchema.safeParse({ ...pass, elevationM: 3501 }).success).toBe(false)
      expect(catalogEntrySchema.safeParse({ ...pass, elevationM: -1 }).success).toBe(false)
      expect(catalogEntrySchema.safeParse({ ...validEntry(0), elevationM: 800 }).success).toBe(false)
    })

    it.each([
      ['日本の外（北）', { lat: 46.5, lng: 139 }],
      ['日本の外（西）', { lat: 35, lng: 121.5 }],
      ['小数6桁', { lat: 35.123456, lng: 139.1 }],
    ])('代表点が %s なら断る', (_label, representativePoint) => {
      expect(catalogEntrySchema.safeParse({ ...validEntry(), representativePoint }).success).toBe(false)
    })
  })

  describe('notes（規制の注意）', () => {
    function withNote(patch: Json): Json {
      const entry = validEntry()
      const notes = entry.notes as Json[]
      return { ...entry, notes: [{ ...notes[0], ...patch }] }
    }

    it('http:// の出典を断る（https だけ）', () => {
      expect(catalogEntrySchema.safeParse(withNote({ sourceUrl: 'http://www.ashinoko-skyline.co.jp/' })).success).toBe(
        false,
      )
    })

    it.each(['2026/10/10', '2026-13-01', '2026-02-30', '10-10-2026'])('確認日 %s を断る（実在する YYYY-MM-DD だけ）', (checkedOn) => {
      expect(catalogEntrySchema.safeParse(withNote({ checkedOn })).success).toBe(false)
    })

    it('verified は boolean で必須', () => {
      const entry = withNote({})
      delete ((entry.notes as Json[])[0] as Json).verified
      expect(catalogEntrySchema.safeParse(entry).success).toBe(false)
      expect(catalogEntrySchema.safeParse(withNote({ verified: 'yes' })).success).toBe(false)
    })

    it('未確認（verified: false）の注意は形としては書ける（案のため）', () => {
      expect(catalogEntrySchema.safeParse(withNote({ verified: false })).success).toBe(true)
    })

    it('文は1〜80文字、注意は6つまで、kind は決まったものだけ', () => {
      expect(catalogEntrySchema.safeParse(withNote({ text: '' })).success).toBe(false)
      expect(catalogEntrySchema.safeParse(withNote({ text: 'あ'.repeat(81) })).success).toBe(false)
      expect(catalogEntrySchema.safeParse(withNote({ kind: 'speedLimit' })).success).toBe(false)
      const note = (validEntry().notes as Json[])[1]
      expect(catalogEntrySchema.safeParse({ ...validEntry(), notes: Array(7).fill(note) }).success).toBe(false)
    })
  })

  describe('flags（印）', () => {
    it('twoWheelBanned と safetyCaution は boolean で必須', () => {
      expect(catalogEntrySchema.safeParse({ ...validEntry(), flags: { twoWheelBanned: true } }).success).toBe(false)
      expect(catalogEntrySchema.safeParse({ ...validEntry(), flags: { safetyCaution: false } }).success).toBe(false)
      const entry = validEntry()
      delete entry.flags
      expect(catalogEntrySchema.safeParse(entry).success).toBe(false)
    })
  })

  describe('osm（取り出しの手順）', () => {
    it('relations・ways・nameQuery のどれもなければ断る', () => {
      const osm = { cutFrom: { lat: 35.23, lng: 138.97 }, cutTo: { lat: 35.18, lng: 139.02 } }
      expect(catalogEntrySchema.safeParse({ ...validEntry(), osm }).success).toBe(false)
    })

    it('cutFrom・cutTo は必須', () => {
      const osm = { relations: [12639382], cutTo: { lat: 35.18, lng: 139.02 } }
      expect(catalogEntrySchema.safeParse({ ...validEntry(), osm }).success).toBe(false)
    })
  })

  describe('sources（出典）', () => {
    it('出典は1つ以上・https', () => {
      expect(catalogEntrySchema.safeParse({ ...validEntry(), sources: [] }).success).toBe(false)
      const sources = [{ title: '公式', url: 'http://example.com/', checkedOn: '2026-10-10' }]
      expect(catalogEntrySchema.safeParse({ ...validEntry(), sources }).success).toBe(false)
    })
  })
})

describe('catalogFileSchema（ファイル全体の形）', () => {
  it('正しい見本と、0本のリストを受け入れる', () => {
    expect(catalogFileSchema.safeParse(validFile()).success).toBe(true)
    expect(catalogFileSchema.safeParse({ ...validFile(), roads: [] }).success).toBe(true)
  })

  it('catalogSchemaVersion は 1 だけ', () => {
    expect(catalogFileSchema.safeParse({ ...validFile(), catalogSchemaVersion: 2 }).success).toBe(false)
  })

  it.each(['2026-10-10', '20261010.1', 'v1'])('catalogVersion %s を断る（日付.連番）', (catalogVersion) => {
    expect(catalogFileSchema.safeParse({ ...validFile(), catalogVersion }).success).toBe(false)
  })

  it('license は ODbL-1.0、attribution は © OpenStreetMap contributors（ODbL の表示）', () => {
    expect(catalogFileSchema.safeParse({ ...validFile(), license: 'CC-BY-4.0' }).success).toBe(false)
    expect(catalogFileSchema.safeParse({ ...validFile(), attribution: '' }).success).toBe(false)
    const withoutLicense = validFile() as Json
    delete withoutLicense.license
    expect(catalogFileSchema.safeParse(withoutLicense).success).toBe(false)
  })
})

describe('validateApprovedCatalog（承認済みリストとしての決まり）', () => {
  it('正しい見本は ok で、中身を返す', () => {
    const result = validateApprovedCatalog(validFile(), { today: TODAY })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.roads.map((road) => road.id)).toEqual([
      'ashinoko-skyline',
      'yabitsu-toge',
      'mihon-kaigan-road',
    ])
  })

  it('0本のリストは ok（最初は空でよい）', () => {
    expect(validateApprovedCatalog({ ...validFile(), roads: [] }, { today: TODAY }).ok).toBe(true)
  })

  it('形が合わなければ schema の問題として返す（path つき）', () => {
    const result = validateApprovedCatalog(fileWith({ ...validEntry(), reading: 'ヤビツ' }), { today: TODAY })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues[0]?.code).toBe('schema')
      expect(result.issues[0]?.path).toEqual(['roads', 0, 'reading'])
    }
  })

  it.each<[string, CatalogIssueCode]>([
    ['draft-entry', 'draft_in_approved'],
    ['unverified-note', 'unverified_note'],
    ['norikura', 'excluded_road'],
    ['forbidden-word', 'forbidden_word'],
    ['duplicate-id', 'duplicate_id'],
    ['two-wheel-unbacked', 'two_wheel_flag_unbacked'],
  ])('壊れた見本 broken/%s.json は %s で断る', (fixture, code) => {
    expect(issueCodesOf(readJson(`broken/${fixture}.json`))).toContain(code)
  })

  describe('C2: 下書き・承認・引退', () => {
    it('承認済みに review がなければ断る', () => {
      const entry = validEntry()
      delete entry.review
      expect(issueCodesOf(fileWith(entry))).toContain('review_missing')
    })

    it('引退に retired がなければ断る', () => {
      const entry = validEntry(2)
      delete entry.retired
      expect(issueCodesOf(fileWith(entry))).toContain('retired_missing')
    })
  })

  describe('C3・C6: 重なり', () => {
    it('そろえた名前が同じで都道府県が重なる道を断る', () => {
      const twin = { ...validEntry(1), id: 'yabitsu-toge-2', name: 'ヤビツ 峠' }
      expect(issueCodesOf(fileWith(validEntry(1), twin))).toContain('duplicate_name')
    })

    it('同じ名前でも都道府県が違えば別の道として受け入れる', () => {
      const other = { ...validEntry(1), id: 'yabitsu-toge-hokkaido', prefectureCodes: [1] }
      expect(issueCodesOf(fileWith(validEntry(1), other))).toEqual([])
    })
  })

  describe('C8: 日付', () => {
    it('注意の確認日が今日より後なら断る', () => {
      const entry = validEntry()
      ;(entry.notes as Json[])[0].checkedOn = '2026-10-11'
      expect(issueCodesOf(fileWith(entry))).toContain('future_date')
    })

    it('出典の確認日・承認日が今日より後なら断る', () => {
      const withFutureSource = validEntry()
      ;(withFutureSource.sources as Json[])[0].checkedOn = '2027-01-01'
      expect(issueCodesOf(fileWith(withFutureSource))).toContain('future_date')
      const withFutureReview = { ...validEntry(), review: { approvedOn: '2026-12-31', approvedBy: 'ceo' } }
      expect(issueCodesOf(fileWith(withFutureReview))).toContain('future_date')
    })

    it('今日の日付は受け入れる', () => {
      expect(issueCodesOf(validFile(), '2026-10-10')).toEqual([])
    })
  })

  describe('C9: 禁止語（PRD v2 US-13 ＋ PRD v3 US-14）', () => {
    it('決められた言葉が全部、禁止語の一覧にある', () => {
      const expected = [
        '攻め', '攻めがい', 'ワインディング度', 'タイム', '最速', 'ランキング', '傾き',
        '走り屋', '攻める', '攻略', 'ドリフト', '全開', 'ぶっ飛ばす', '飛ばす', 'ゼロヨン',
        'ローリング', '峠を責め', 'タイムアタック', 'ベストライン',
      ]
      expect([...CATALOG_FORBIDDEN_WORDS]).toEqual(expect.arrayContaining(expected))
    })

    it.each(['最速', 'タイム', 'ランキング', '攻め'])('区間に「%s」があれば断る', (word) => {
      const entry = { ...validEntry(), section: { from: '湖尻峠', to: `${word}の区間` } }
      expect(issueCodesOf(fileWith(entry))).toContain('forbidden_word')
    })

    it('注意の文・別名・引退の理由も検査する', () => {
      const withNote = validEntry()
      ;(withNote.notes as Json[])[0].text = '走り屋が集まる'
      expect(issueCodesOf(fileWith(withNote))).toContain('forbidden_word')

      const withAlias = { ...validEntry(), aliases: [{ name: 'ゼロヨン通り', reading: 'ぜろよんどおり', kind: 'common' }] }
      expect(issueCodesOf(fileWith(withAlias))).toContain('forbidden_word')

      const retired = { ...validEntry(2), retired: { on: '2026-10-10', reason: 'タイムアタックが多いため' } }
      expect(issueCodesOf(fileWith(retired))).toContain('forbidden_word')
    })
  })

  describe('CEO決定 1: 乗鞍は外す', () => {
    it('除外の言葉に 乗鞍・のりくら・norikura がある', () => {
      expect([...EXCLUDED_ROAD_KEYWORDS]).toEqual(expect.arrayContaining(['乗鞍', 'のりくら', 'norikura']))
    })

    it.each<[string, Json]>([
      ['名前', { name: '乗鞍エコーライン' }],
      ['読み', { reading: 'のりくらえこーらいん' }],
      ['id', { id: 'norikura-echo-line' }],
      ['別名', { aliases: [{ name: '乗鞍の道', reading: 'のりくらのみち', kind: 'common' }] }],
    ])('%s に乗鞍があれば断る', (_label, patch) => {
      expect(issueCodesOf(fileWith({ ...validEntry(1), ...patch }))).toContain('excluded_road')
    })
  })

  describe('CEO決定 2・3: 二輪通行不可の印と、未確認の規制', () => {
    it('承認済みに未確認の注意が1つでもあれば断る', () => {
      const entry = validEntry()
      ;(entry.notes as Json[])[0].verified = false
      expect(issueCodesOf(fileWith(entry))).toContain('unverified_note')
    })

    it('引退した道でも未確認の注意は断る（詳細は開けるため）', () => {
      const note = { kind: 'toll', text: '有料', sourceUrl: 'https://example.com/', checkedOn: '2026-10-01', verified: false }
      expect(issueCodesOf(fileWith({ ...validEntry(2), notes: [note] }))).toContain('unverified_note')
    })

    it('twoWheelBanned には、確かめた motorcycleBan の注意が要る', () => {
      const entry = validEntry()
      const notes = entry.notes as Json[]
      notes[0].verified = false
      const codes = issueCodesOf(fileWith(entry))
      expect(codes).toContain('two_wheel_flag_unbacked')
    })

    it('二輪禁止の注意があり印もある道は受け入れる', () => {
      expect(issueCodesOf(fileWith(validEntry(0)))).toEqual([])
    })
  })
})

describe('geometryFileSchema（4.5 の道の形・C7）', () => {
  function validGeometry(): Json {
    return readJson('valid-root/data/geometry/ashinoko-skyline.json') as Json
  }

  it('正しい見本を受け入れる', () => {
    expect(geometryFileSchema.safeParse(validGeometry()).success).toBe(true)
  })

  it('license は ODbL-1.0、attribution は © OpenStreetMap contributors', () => {
    expect(geometryFileSchema.safeParse({ ...validGeometry(), license: 'MIT' }).success).toBe(false)
    expect(geometryFileSchema.safeParse({ ...validGeometry(), attribution: 'OSM' }).success).toBe(false)
  })

  it('線は1〜3本・各2点以上', () => {
    const line = (validGeometry().lines as unknown[])[0]
    expect(geometryFileSchema.safeParse({ ...validGeometry(), lines: [] }).success).toBe(false)
    expect(geometryFileSchema.safeParse({ ...validGeometry(), lines: [line, line, line, line] }).success).toBe(false)
    expect(geometryFileSchema.safeParse({ ...validGeometry(), lines: [[[35.2, 139]]] }).success).toBe(false)
  })

  it('点は合計2,000点まで', () => {
    const bbox = [35.0, 138.0, 36.0, 139.0]
    const points = (count: number) =>
      Array.from({ length: count }, (_unused, index) => [35.5, Number((138.0 + index * 0.0004).toFixed(5))])
    expect(geometryFileSchema.safeParse({ ...validGeometry(), bbox, lines: [points(2000)] }).success).toBe(true)
    expect(geometryFileSchema.safeParse({ ...validGeometry(), bbox, lines: [points(2001)] }).success).toBe(false)
  })

  it('日本の外の点を断る', () => {
    const lines = [[[35.2, 139], [10, 139]]]
    expect(geometryFileSchema.safeParse({ ...validGeometry(), lines }).success).toBe(false)
  })
})
