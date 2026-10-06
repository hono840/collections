// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Text checks on supabase/migrations/00004_drives_road_info.sql (Sprint 3; architecture 3.1-3.3, 3.5, 4,
// ch.18 S-8 / ch.19 D-1 column-grant pattern; PRD US-06, US-10, US-14). Local Supabase is not available this
// sprint (CEO decision), so the DB behaviour is pinned here as text and in tests/rls (skipped without env).
//
// Data model decision (Sprint 3 Red): road_info stays 1:1 per drive (architecture 3.2) but uses the PRD US-10
// item set. Each item is a nullable status column (null = 記録しない) + a `<item>_memo` text column:
//   motorcycle_ban / night_closure / winter_closure / parking / toilet / michi_no_eki / observatory: yes|no|unknown
//   toll: paid|free|unknown
// drives keeps the architecture columns (traffic few|normal|many, rating_road_surface, rating_ease_of_driving).

const appRoot = fileURLToPath(new URL('../../', import.meta.url))
const migrationPath = `${appRoot}supabase/migrations/00004_drives_road_info.sql`
const source = existsSync(migrationPath) ? readFileSync(migrationPath, 'utf8') : ''

/** Comments removed, whitespace collapsed, lower-cased. */
const sql = source.replace(/--.*$/gm, '').replace(/\s+/g, ' ').toLowerCase()

/** SQL statements (dollar-quoted function bodies blanked so their ';' do not split), lower-cased. */
const statements = source
  .replace(/--.*$/gm, '')
  .replace(/\$\$[\s\S]*?\$\$/g, '$$$$body$$$$')
  .split(';')
  .map((statement) => statement.replace(/\s+/g, ' ').trim().toLowerCase())
  .filter(Boolean)

/** Splits on commas that are not inside parentheses. */
function splitTopLevel(list: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const character of list) {
    if (character === '(') depth += 1
    if (character === ')') depth -= 1
    if (character === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
      continue
    }
    current += character
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

function tableBody(table: string): string {
  const match = sql.match(new RegExp(`create table (?:if not exists )?public\\.${table} \\((.*?)\\);`))
  if (!match) return ''
  // The body ends at the matching parenthesis of "create table ... (".
  const start = sql.indexOf(match[0]) + match[0].indexOf('(') + 1
  let depth = 1
  let index = start
  while (index < sql.length && depth > 0) {
    if (sql[index] === '(') depth += 1
    if (sql[index] === ')') depth -= 1
    index += 1
  }
  return sql.slice(start, index - 1)
}

function columnsOf(table: string): Map<string, string> {
  const columns = new Map<string, string>()
  for (const part of splitTopLevel(tableBody(table))) {
    if (/^(constraint|primary key|unique|check|foreign key)\b/.test(part)) continue
    const [name, ...rest] = part.split(' ')
    columns.set(name, rest.join(' '))
  }
  return columns
}

function grantedPrivileges(table: string, role = 'authenticated'): string[] {
  return statements
    .map((statement) => statement.match(new RegExp(`^grant (.+?) on (?:table )?public\\.${table} to (.+)$`)))
    .filter((match): match is RegExpMatchArray => match !== null)
    .filter((match) => match[2].split(',').map((value) => value.trim()).includes(role))
    .flatMap((match) => splitTopLevel(match[1]).map((privilege) => privilege.replace(/\s*\(\s*/, ' (').trim()))
}

function grantedColumns(table: string, privilege: 'insert' | 'update'): string[] {
  const granted = grantedPrivileges(table).filter((value) => value.startsWith(privilege))
  expect(granted, `${privilege} grant on ${table}`).toHaveLength(1)
  expect(granted[0], `${privilege} on ${table} must be column-level`).toMatch(new RegExp(`^${privilege} \\(`))
  return granted[0]
    .replace(new RegExp(`^${privilege} \\(`), '')
    .replace(/\)$/, '')
    .split(',')
    .map((column) => column.trim())
}

function policy(name: string): string | undefined {
  return statements.find((statement) => statement.startsWith(`create policy "${name}"`))
}

function functionBody(name: string): string {
  const match = sql.match(new RegExp(`create (?:or replace )?function public\\.${name}\\(\\).*?\\$\\$(.*?)\\$\\$`))
  return match?.[1] ?? ''
}

const ITEM_COLUMNS = [
  'motorcycle_ban',
  'night_closure',
  'winter_closure',
  'toll',
  'parking',
  'toilet',
  'michi_no_eki',
  'observatory',
]

describe('migration 00004_drives_road_info.sql', () => {
  it('exists', () => {
    expect(existsSync(migrationPath)).toBe(true)
  })

  it('creates public.drives and public.road_info', () => {
    expect(tableBody('drives')).not.toBe('')
    expect(tableBody('road_info')).not.toBe('')
  })
})

describe('drives table (PRD US-06, US-14)', () => {
  const columns = columnsOf('drives')

  it('has exactly the architecture columns (no speed / time / lap / ranking columns)', () => {
    expect([...columns.keys()].sort()).toEqual(
      [
        'id',
        'user_id',
        'road_id',
        'driven_on',
        'vehicle_type',
        'weather',
        'rating_overall',
        'rating_scenery',
        'rating_road_surface',
        'rating_ease_of_driving',
        'traffic',
        'memo',
        'visibility',
        'created_at',
        'updated_at',
      ].sort(),
    )
  })

  it('no column name hints at speed, time-of-day, duration, lap, ranking or lean angle', () => {
    expect(columnsOf('drives').size).toBeGreaterThan(0)
    expect(columnsOf('road_info').size).toBeGreaterThan(0)
    for (const name of [...columnsOf('drives').keys(), ...columnsOf('road_info').keys()]) {
      expect(name).not.toMatch(/speed|velocity|time|duration|lap|rank|lean|angle|elapsed/)
    }
  })

  it('driven_on is a date (no time part) and not null', () => {
    expect(columns.get('driven_on')).toMatch(/^date not null/)
  })

  it('user_id defaults to auth.uid() and cascades from auth.users; road_id cascades from roads', () => {
    expect(columns.get('user_id')).toMatch(/default auth\.uid\(\)/)
    expect(columns.get('user_id')).toMatch(/references auth\.users \(id\) on delete cascade/)
    expect(columns.get('road_id')).toMatch(/not null references public\.roads \(id\) on delete cascade/)
  })

  it('rating_overall is required 1..5; the other ratings are nullable 1..5', () => {
    expect(columns.get('rating_overall')).toMatch(/not null/)
    expect(sql).toMatch(/check \(rating_overall between 1 and 5\)/)
    for (const column of ['rating_scenery', 'rating_road_surface', 'rating_ease_of_driving']) {
      expect(columns.get(column)).not.toMatch(/not null/)
      expect(sql).toMatch(new RegExp(`check \\(${column} is null or ${column} between 1 and 5\\)`))
    }
  })

  it("traffic is a nullable enum ('few', 'normal', 'many') - a situation, not a score", () => {
    expect(sql).toMatch(/check \(traffic is null or traffic in \('few', 'normal', 'many'\)\)/)
  })

  it('vehicle_type and weather enums', () => {
    expect(sql).toMatch(/vehicle_type in \('car', 'motorcycle'\)/)
    expect(sql).toMatch(/weather in \('sunny', 'cloudy', 'rain', 'snow', 'other'\)/)
  })

  it('memo is at most 2000 characters and visibility is private only', () => {
    expect(sql).toMatch(/check \(char_length\(memo\) <= 2000\)/)
    expect(sql).toMatch(/check \(visibility in \('private'\)\)/)
  })

  it("driven_on >= '2000-01-01' (PRD US-06) as an immutable CHECK", () => {
    expect(sql).toMatch(/check \(driven_on >= '2000-01-01'(::date)?\)/)
  })

  it('does NOT use current_date / now() inside CHECK constraints (not immutable, architecture 3.1)', () => {
    const checks = sql.match(/check \((?:[^()]|\([^()]*\))*\)/g) ?? []
    expect(checks.length).toBeGreaterThan(0)
    for (const check of checks) expect(check).not.toMatch(/current_date|now\(\)|today_in_tokyo/)
  })

  it('has the (road_id, driven_on desc, created_at desc) index for the newest-first list', () => {
    expect(sql).toMatch(/on public\.drives \(road_id, driven_on desc, created_at desc\)/)
  })
})

describe('drives guard trigger', () => {
  const body = functionBody('drives_guard')

  it('rejects driven_on later than today_in_tokyo() with driven_on_in_future (23514)', () => {
    expect(body).toMatch(/new\.driven_on > public\.today_in_tokyo\(\)/)
    expect(body).toContain("'driven_on_in_future'")
    expect(body).toMatch(/errcode = '23514'/)
  })

  it('makes road_id immutable on UPDATE (road_id_is_immutable)', () => {
    expect(body).toMatch(/new\.road_id is distinct from old\.road_id/)
    expect(body).toContain("'road_id_is_immutable'")
  })

  it('runs BEFORE INSERT OR UPDATE for each row', () => {
    expect(sql).toMatch(
      /create (?:or replace )?trigger \S+ before insert or update on public\.drives for each row execute (?:function|procedure) public\.drives_guard\(\)/,
    )
  })

  it('keeps updated_at fresh', () => {
    expect(sql).toMatch(/before update on public\.drives for each row execute (?:function|procedure) public\.set_updated_at\(\)/)
  })

  it('trigger functions are not callable by clients', () => {
    expect(sql).toMatch(/revoke execute on function public\.drives_guard\(\) from public, anon, authenticated/)
  })
})

describe('road_info table (PRD US-10 items, 1:1 per drive)', () => {
  const columns = columnsOf('road_info')

  it('is keyed by drive_id (cascade from drives) and owned by user_id', () => {
    expect(columns.get('drive_id')).toMatch(/primary key references public\.drives \(id\) on delete cascade/)
    expect(columns.get('user_id')).toMatch(/default auth\.uid\(\)/)
    expect(columns.get('confirmed_on')).toMatch(/^date not null/)
  })

  it('has a nullable status column and a memo column per item (null = 記録しない)', () => {
    for (const item of ITEM_COLUMNS) {
      expect(columns.has(item), item).toBe(true)
      expect(columns.get(item), item).not.toMatch(/not null/)
      expect(columns.get(`${item}_memo`), `${item}_memo`).toMatch(/text not null default ''/)
      expect(sql).toMatch(new RegExp(`check \\(char_length\\(${item}_memo\\) <= 200\\)`))
    }
  })

  it("presence items allow ('yes', 'no', 'unknown'); toll allows ('paid', 'free', 'unknown')", () => {
    for (const item of ITEM_COLUMNS.filter((name) => name !== 'toll')) {
      expect(sql).toMatch(new RegExp(`check \\(${item} is null or ${item} in \\('yes', 'no', 'unknown'\\)\\)`))
    }
    expect(sql).toMatch(/check \(toll is null or toll in \('paid', 'free', 'unknown'\)\)/)
  })

  it('a row records at least one item (M-27 mirrored in the DB)', () => {
    expect(sql).toMatch(
      /check \(num_nonnulls\(motorcycle_ban, night_closure, winter_closure, toll, parking, toilet, michi_no_eki, observatory\) >= 1\)/,
    )
  })

  it('road_info_guard: confirmed_on defaults to the drive date, must not be in the future (JST), drive_id immutable', () => {
    const body = functionBody('road_info_guard')
    expect(body).toMatch(/new\.confirmed_on is null/)
    expect(body).toMatch(/driven_on/)
    expect(body).toMatch(/new\.confirmed_on > public\.today_in_tokyo\(\)/)
    expect(body).toContain("'confirmed_on_in_future'")
    expect(body).toMatch(/new\.drive_id is distinct from old\.drive_id/)
    expect(sql).toMatch(
      /before insert or update on public\.road_info for each row execute (?:function|procedure) public\.road_info_guard\(\)/,
    )
  })
})

describe('RLS and privileges (architecture 4, ch.18 S-8 / ch.19 D-1 column grants)', () => {
  it('enables RLS on both tables', () => {
    expect(sql).toMatch(/alter table public\.drives enable row level security/)
    expect(sql).toMatch(/alter table public\.road_info enable row level security/)
  })

  it.each(['drives', 'road_info'])('revokes all on %s from anon and authenticated first', (table) => {
    expect(sql).toMatch(new RegExp(`revoke all on table public\\.${table} from anon, authenticated`))
  })

  it.each(['drives', 'road_info'])('grants select and delete on %s, and never ALL', (table) => {
    const privileges = grantedPrivileges(table)
    expect(privileges).toEqual(expect.arrayContaining(['select', 'delete']))
    expect(privileges).not.toContain('all')
    expect(privileges).not.toContain('insert')
    expect(privileges).not.toContain('update')
    expect(grantedPrivileges(table, 'anon')).toEqual([])
  })

  it('drives INSERT is column-level: form columns + road_id, never user_id / visibility / id', () => {
    const columns = grantedColumns('drives', 'insert')
    expect(columns.sort()).toEqual(
      [
        'road_id',
        'driven_on',
        'vehicle_type',
        'weather',
        'rating_overall',
        'rating_scenery',
        'rating_road_surface',
        'rating_ease_of_driving',
        'traffic',
        'memo',
      ].sort(),
    )
  })

  it('drives UPDATE is column-level and excludes road_id (immutable), user_id and visibility', () => {
    const columns = grantedColumns('drives', 'update')
    expect(columns.sort()).toEqual(
      [
        'driven_on',
        'vehicle_type',
        'weather',
        'rating_overall',
        'rating_scenery',
        'rating_road_surface',
        'rating_ease_of_driving',
        'traffic',
        'memo',
      ].sort(),
    )
  })

  it('road_info INSERT includes drive_id + confirmed_on + items; UPDATE excludes drive_id / user_id', () => {
    const itemAndMemo = ITEM_COLUMNS.flatMap((item) => [item, `${item}_memo`])
    expect(grantedColumns('road_info', 'insert').sort()).toEqual(['drive_id', 'confirmed_on', ...itemAndMemo].sort())
    expect(grantedColumns('road_info', 'update').sort()).toEqual(['confirmed_on', ...itemAndMemo].sort())
  })

  it('drives insert/update policies check that the parent road belongs to the caller', () => {
    for (const name of ['drives_insert_own', 'drives_update_own']) {
      const statement = policy(name)
      expect(statement, name).toBeDefined()
      expect(statement).toMatch(/to authenticated/)
      expect(statement).toMatch(/with check \( ?\(select auth\.uid\(\)\) = user_id and exists \(/)
      expect(statement).toMatch(/from public\.roads r where r\.id = drives\.road_id and r\.user_id = \(select auth\.uid\(\)\)/)
    }
    expect(policy('drives_update_own')).toMatch(/using \(\(select auth\.uid\(\)\) = user_id\)/)
  })

  it('road_info insert/update policies check that the parent drive belongs to the caller', () => {
    for (const name of ['road_info_insert_own', 'road_info_update_own']) {
      const statement = policy(name)
      expect(statement, name).toBeDefined()
      expect(statement).toMatch(/from public\.drives d where d\.id = road_info\.drive_id and d\.user_id = \(select auth\.uid\(\)\)/)
    }
  })

  it.each(['drives_select_own', 'drives_delete_own', 'road_info_select_own', 'road_info_delete_own'])(
    '%s is limited to the owner',
    (name) => {
      expect(policy(name)).toMatch(/to authenticated using \(\(select auth\.uid\(\)\) = user_id\)/)
    },
  )
})

describe('road_summaries view (architecture 3.3)', () => {
  const view = statements.find((statement) => /^create (?:or replace )?view public\.road_summaries\b/.test(statement)) ?? ''

  it('is created with security_invoker = true (caller RLS applies)', () => {
    expect(view).toMatch(/with \(security_invoker = true\)/)
  })

  it('exposes the list aggregates', () => {
    for (const column of ['last_driven_on', 'last_rating_overall', 'drive_count', 'rating_overall_sum']) {
      expect(view).toContain(column)
    }
  })

  it('picks the latest drive by driven_on desc, created_at desc', () => {
    expect(view).toMatch(/order by d\.driven_on desc, d\.created_at desc/)
  })

  it('does not expose visibility', () => {
    expect(view).not.toBe('')
    expect(view).not.toMatch(/\bvisibility\b/)
  })

  it('anon has no access; authenticated may select only', () => {
    expect(sql).toMatch(/revoke all on (?:table )?public\.road_summaries from anon/)
    expect(sql).toMatch(/grant select on (?:table )?public\.road_summaries to authenticated/)
    expect(sql).not.toMatch(/grant (?:insert|update|delete|all)[^;]* on (?:table )?public\.road_summaries/)
  })
})
