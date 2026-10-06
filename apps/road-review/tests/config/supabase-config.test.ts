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

  it('[auth.email] enable_signup = false', () => {
    expect(sections.get('auth.email')?.get('enable_signup')).toBe('false')
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
