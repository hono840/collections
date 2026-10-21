import { describe, it, expect } from 'vitest'
import { DEFAULT_STATE } from '@/lib/storage/canonical-store'
import { createSampleState } from '@/lib/sample/sample-data'
import type { CanonicalState, Menu } from '@/lib/domain/schema'
import { toCsv, buildMenusCsv, buildIngredientsCsv, buildBreakdownCsv, BOM } from './csv'

function sampleFullState(): CanonicalState {
  const { ingredients, menus } = createSampleState()
  return { ...DEFAULT_STATE, ingredients, menus }
}

describe('toCsv (RFC4180)', () => {
  it('prepends the UTF-8 BOM', () => {
    const csv = toCsv([['a', 'b']])
    expect(csv.startsWith(BOM)).toBe(true)
    expect(csv.charCodeAt(0)).toBe(0xfeff)
  })

  it('separates rows with CRLF', () => {
    const csv = toCsv([['a'], ['b'], ['c']])
    expect(csv).toBe(`${BOM}a\r\nb\r\nc`)
  })

  it('quotes fields containing a comma', () => {
    expect(toCsv([['定食, 特盛']])).toBe(`${BOM}"定食, 特盛"`)
  })

  it('quotes and doubles embedded double-quotes', () => {
    expect(toCsv([['name "A"']])).toBe(`${BOM}"name ""A"""`)
  })

  it('quotes fields containing a newline', () => {
    expect(toCsv([['line1\nline2']])).toBe(`${BOM}"line1\nline2"`)
  })
})

describe('escapeField CSV formula-injection guard (security)', () => {
  // A neutralized field is prefixed with a single quote so a spreadsheet treats it as text.
  it.each([
    ['=cmd', "'=cmd"],
    ['=HYPERLINK("http://evil","x")', `"'=HYPERLINK(""http://evil"",""x"")"`],
    ['+abc', "'+abc"],
    ['@x', "'@x"],
    ['-abc', "'-abc"],
    ['\tSUM(A1)', "'\tSUM(A1)"],
  ])('neutralizes a formula-leading field %j', (input, expected) => {
    expect(toCsv([[input]])).toBe(`${BOM}${expected}`)
  })

  it.each([['-123'], ['+5.5'], ['-0.25'], ['1200'], ['0']])(
    'does NOT prefix the pure/signed number %j (negative amounts stay intact)',
    (input) => {
      expect(toCsv([[input]])).toBe(`${BOM}${input}`)
    },
  )

  it('still applies RFC4180 quoting on a neutralized field that also contains a comma', () => {
    // Leading '=' → prefix "'", and the comma → wrap in quotes.
    expect(toCsv([['=a,b']])).toBe(`${BOM}"'=a,b"`)
  })

  it('quotes a formula-leading field whose only special char is a leading CR', () => {
    // '\r' is both a formula-lead char and an RFC4180 quote trigger → prefixed then quoted.
    expect(toCsv([['\r=x']])).toBe(`${BOM}"'\r=x"`)
  })
})

describe('buildMenusCsv', () => {
  it('emits a BOM, CRLF rows and the PRD header', () => {
    const csv = buildMenusCsv(sampleFullState())
    expect(csv.startsWith(BOM)).toBe(true)
    expect(csv).toContain('\r\n')
    expect(csv).toContain('メニュー名,売価(税込),売価(税抜),原価(税抜),原価率(%),粗利(税抜),材料数,状態')
  })

  it('renders the cost rate with one decimal (唐揚げ定食 ≈ 24.8)', () => {
    const csv = buildMenusCsv(sampleFullState())
    const row = csv.split('\r\n').find((line) => line.startsWith('唐揚げ定食'))
    expect(row).toBeDefined()
    expect(row).toContain('24.8')
    expect(row).toContain('正常')
  })

  it('marks a sell-price-unset menu as 要確認 with empty sell/rate/margin cells', () => {
    // Empty recipe -> cost is a genuine ¥0; sell/rate/margin are blank because sell is unset.
    const menu: Menu = {
      id: 'm1',
      name: '要確認メニュー',
      sellPriceExTax: 0,
      sellInputPrice: 0,
      sellPriceIncludesTax: true,
      sellTaxRate: 10,
      items: [],
      isSample: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const state: CanonicalState = { ...DEFAULT_STATE, menus: [menu] }
    const row = buildMenusCsv(state).split('\r\n')[1]
    // メニュー名, 売価(税込), 売価(税抜), 原価(税抜)=0, 原価率, 粗利, 材料数=0, 状態
    expect(row).toBe('要確認メニュー,,,0,,,0,要確認')
  })

  it('quotes a menu name containing a comma', () => {
    const menu: Menu = {
      id: 'm2',
      name: '唐揚げ, 大盛',
      sellPriceExTax: 800,
      sellInputPrice: 800,
      sellPriceIncludesTax: false,
      sellTaxRate: 10,
      items: [],
      isSample: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const state: CanonicalState = { ...DEFAULT_STATE, menus: [menu] }
    expect(buildMenusCsv(state)).toContain('"唐揚げ, 大盛"')
  })
})

describe('buildIngredientsCsv', () => {
  it('emits the ingredient master header and a 2-decimal effective unit price', () => {
    const csv = buildIngredientsCsv(sampleFullState())
    expect(csv).toContain('食材名,購入価格(税抜),購入量,単位,歩留まり率(%),有効単価(税抜),税率(%),入力税区分')
    // キャベツ: 200 / (1000 * 0.8) = 0.25/g
    const row = csv.split('\r\n').find((line) => line.startsWith('キャベツ'))
    expect(row).toContain('0.25')
    expect(row).toContain('税抜')
  })
})

describe('buildBreakdownCsv', () => {
  it('emits one row per recipe line with the line cost', () => {
    const csv = buildBreakdownCsv(sampleFullState())
    expect(csv).toContain('メニュー名,食材名,使用量,単位,有効単価(税抜),金額(税抜)')
    // 鶏もも肉 150g @ 1.00/g = 150
    const row = csv.split('\r\n').find((line) => line.includes('鶏もも肉'))
    expect(row).toContain('150')
  })
})
