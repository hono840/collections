// @vitest-environment node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// S-1 / S-4 / S-8 (architecture ch.18.1): text-based checks on Supabase config and SQL.

const appRoot = fileURLToPath(new URL('../../', import.meta.url))
const readAppFile = (relativePath: string) => readFileSync(`${appRoot}${relativePath}`, 'utf8')

/** Minimal TOML reader: `key = value` lines per `[section]`, comments ignored. */
function tomlSections(source: string): Map<string, Map<string, string>> {
  const sections = new Map<string, Map<string, string>>([['', new Map()]])
  let current = ''
  for (const rawLine of source.split('\n')) {
    const line = rawLine.replace(/\s+#.*$/, '').trim()
    if (line === '' || line.startsWith('#')) continue
    const header = line.match(/^\[([^\]]+)\]$/)
    if (header) {
      current = header[1].trim()
      if (!sections.has(current)) sections.set(current, new Map())
      continue
    }
    const entry = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.+)$/)
    if (entry) sections.get(current)!.set(entry[1], entry[2].trim())
  }
  return sections
}

/** SQL statements, lower-cased, comments removed, whitespace collapsed. */
function sqlStatements(source: string): string[] {
  return source
    .replace(/--.*$/gm, '')
    .split(';')
    .map((statement) => statement.replace(/\s+/g, ' ').trim().toLowerCase())
    .filter(Boolean)
}

/** Splits "select, insert, update (a, b)" on commas that are not inside parentheses. */
function splitPrivileges(list: string): string[] {
  return list.split(/,(?![^(]*\))/).map((privilege) => privilege.replace(/\s*\(\s*/, ' (').replace(/\s*\)/, ')').trim())
}

function splitRoles(list: string): string[] {
  return list.split(',').map((role) => role.trim())
}

describe('supabase/config.toml', () => {
  const sections = tomlSections(readAppFile('supabase/config.toml'))

  it('[auth] enable_signup = false (S-1: no sign-up through any provider)', () => {
    expect(sections.get('auth')?.get('enable_signup')).toBe('false')
  })

  // Regression guard (architecture ch.21): on the hosted project `[auth.email] enable_signup` maps to
  // "Email provider enabled". Setting it to false disables email login entirely (error
  // `email_provider_disabled`). It must never be false; sign-ups are blocked by the top-level
  // `[auth] enable_signup = false` above.
  it('[auth.email] enable_signup = true (must never be false: it disables email login)', () => {
    expect(sections.get('auth.email')?.get('enable_signup')).toBe('true')
  })

  it('[auth.email] otp_expiry = 900 (S-4: 15 minutes)', () => {
    expect(sections.get('auth.email')?.get('otp_expiry')).toBe('900')
  })
})

describe('supabase/templates (S-4)', () => {
  it.each(['magic_link.html', 'confirmation.html'])('%s says the link and code expire in 15 minutes', (file) => {
    const html = readAppFile(`supabase/templates/${file}`)
    expect(html).toContain('15分')
    expect(html).not.toContain('1時間')
  })
})

describe('migration 00001 user_settings privileges (S-8)', () => {
  const statements = sqlStatements(readAppFile('supabase/migrations/00001_base_and_user_settings.sql'))

  const grantsToAuthenticated = statements
    .map((statement) => statement.match(/^grant (.+?) on (?:table )?public\.user_settings to (.+)$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .filter((match) => splitRoles(match[2]).includes('authenticated'))
    .flatMap((match) => splitPrivileges(match[1]))

  it('revokes all table privileges from anon and authenticated first (Supabase default privileges grant ALL)', () => {
    const revokedRoles = statements
      .map((statement) => statement.match(/^revoke all(?: privileges)? on (?:table )?public\.user_settings from (.+)$/))
      .filter((match): match is RegExpMatchArray => match !== null)
      .flatMap((match) => splitRoles(match[1]))

    expect(revokedRoles).toEqual(expect.arrayContaining(['anon', 'authenticated']))
  })

  it('grants select and insert to authenticated', () => {
    expect(grantsToAuthenticated).toEqual(expect.arrayContaining(['select', 'insert']))
  })

  it('grants update only on the safety_notice_acknowledged_at column', () => {
    expect(grantsToAuthenticated).toContain('update (safety_notice_acknowledged_at)')
    expect(grantsToAuthenticated).not.toContain('update')
  })

  it('does not grant delete (or all) on user_settings', () => {
    expect(grantsToAuthenticated).not.toContain('delete')
    expect(grantsToAuthenticated).not.toContain('all')
    expect(grantsToAuthenticated).not.toContain('all privileges')
  })
})

describe('migration 00002 keep_alive privileges (S-8)', () => {
  const statements = sqlStatements(readAppFile('supabase/migrations/00002_keep_alive.sql'))

  it('revokes execute on keep_alive() from public', () => {
    const revokedRoles = statements
      .map((statement) => statement.match(/^revoke execute on function public\.keep_alive\(\) from (.+)$/))
      .filter((match): match is RegExpMatchArray => match !== null)
      .flatMap((match) => splitRoles(match[1]))

    expect(revokedRoles).toContain('public')
  })

  it('grants execute on keep_alive() to anon and authenticated', () => {
    const grantedRoles = statements
      .map((statement) => statement.match(/^grant execute on function public\.keep_alive\(\) to (.+)$/))
      .filter((match): match is RegExpMatchArray => match !== null)
      .flatMap((match) => splitRoles(match[1]))

    expect(grantedRoles).toEqual(expect.arrayContaining(['anon', 'authenticated']))
  })
})

describe('migration 00003 roads hardening (architecture ch.19.1 D-1 / D-2 / D-3)', () => {
  const source = readAppFile('supabase/migrations/00003_roads.sql')
  const statements = sqlStatements(source)
  /** Comments removed and whitespace collapsed, case kept (regex classes like \S are case-sensitive). */
  const caseKeptSql = source.replace(/--.*$/gm, '').replace(/\s+/g, ' ')

  it('D-1: the INSERT grant to authenticated lists the form columns but not visibility (or user_id)', () => {
    const insertPrivileges = statements
      .map((statement) => statement.match(/^grant (.+?) on (?:table )?public\.roads to (.+)$/))
      .filter((match): match is RegExpMatchArray => match !== null)
      .filter((match) => splitRoles(match[2]).includes('authenticated'))
      .flatMap((match) => splitPrivileges(match[1]))
      .filter((privilege) => privilege.startsWith('insert'))

    expect(insertPrivileges).toHaveLength(1)
    const columns = insertPrivileges[0]
      .replace(/^insert \(/, '')
      .replace(/\)$/, '')
      .split(',')
      .map((column) => column.trim())
    expect(columns).toEqual(
      expect.arrayContaining(['name', 'prefecture_code', 'road_type', 'start_lat', 'start_lng', 'end_lat', 'end_lng']),
    )
    expect(columns).not.toContain('visibility')
    expect(columns).not.toContain('user_id')
  })

  it("D-2: the name check requires a non-space first/last character: name ~ '^\\S(.*\\S)?$'", () => {
    expect(caseKeptSql).toContain("name ~ '^\\S(.*\\S)?$'")
  })

  it("D-2: the name check rejects control characters: name !~ '[[:cntrl:]]'", () => {
    expect(caseKeptSql).toContain("name !~ '[[:cntrl:]]'")
  })

  it('D-2: the name length check (1..50) is kept', () => {
    expect(statements.join(' ')).toMatch(/char_length\(name\) between 1 and 50/)
  })

  it("D-3: a BEFORE INSERT row trigger on public.roads enforces 500 roads per user with 'road_limit_exceeded'", () => {
    const trigger = statements.find((statement) =>
      /^create (?:or replace )?trigger \S+ before insert on public\.roads for each row execute (?:function|procedure) /.test(
        statement,
      ),
    )
    expect(trigger).toBeDefined()

    const functionName = trigger!.match(/execute (?:function|procedure) ([\w.]+)\(/)![1]
    const bareName = functionName.replace(/^public\./, '')
    const functionSource = caseKeptSql
      .toLowerCase()
      .match(new RegExp(`create (?:or replace )?function (?:public\\.)?${bareName}\\(\\).*?\\$\\$(.*?)\\$\\$`))
    expect(functionSource, `function ${functionName} not found`).not.toBeNull()
    expect(functionSource![1]).toMatch(/\b500\b/)
    expect(functionSource![1]).toContain('road_limit_exceeded')
    expect(functionSource![1]).toMatch(/raise exception/)
  })
})
