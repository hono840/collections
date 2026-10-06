import { describe, expect, it } from 'vitest'
import { safeNextPath } from './safe-next-path'

describe('safeNextPath', () => {
  it('returns the fallback when the value is missing', () => {
    expect(safeNextPath(null)).toBe('/roads')
    expect(safeNextPath(undefined)).toBe('/roads')
    expect(safeNextPath('')).toBe('/roads')
  })

  it('uses a custom fallback when given', () => {
    expect(safeNextPath(null, '/login')).toBe('/login')
  })

  it('keeps a same-origin path with its query string', () => {
    expect(safeNextPath('/roads/abc')).toBe('/roads/abc')
    expect(safeNextPath('/roads?prefecture=13')).toBe('/roads?prefecture=13')
  })

  it('drops the hash fragment', () => {
    expect(safeNextPath('/roads/abc#drives')).toBe('/roads/abc')
  })

  it('normalizes dot segments but stays on the same origin', () => {
    expect(safeNextPath('/roads/../login')).toBe('/login')
  })

  it.each([
    'https://evil.example.com',
    'http://evil.example.com/roads',
    '//evil.example.com',
    '//evil.example.com/roads',
    '/\\evil.example.com',
    '\\\\evil.example.com',
    'javascript:alert(1)',
    'roads',
    ' /roads',
  ])('rejects an unsafe value %j', (raw) => {
    expect(safeNextPath(raw)).toBe('/roads')
  })

  it.each([
    '/.//evil.example.com',
    '/roads/..//evil.example.com',
    '/./\\evil.example.com',
    '/roads/../\\evil.example.com',
  ])('rejects %j whose NORMALIZED pathname becomes protocol-relative', (raw) => {
    expect(safeNextPath(raw)).toBe('/roads')
  })

  it('keeps percent-encoded slashes as a harmless same-origin path', () => {
    const result = safeNextPath('/%2F%2Fevil.example.com')
    expect(result.startsWith('//')).toBe(false)
    expect(result).toBe('/%2F%2Fevil.example.com')
  })

  it('never returns a value starting with "//" or "/\\" for tricky inputs', () => {
    const prefixes = ['/', '/.', '/..', '/roads/..', '/./.', '/%2e', '/%2e%2e', '/\t', '/\n']
    const separators = ['/', '\\', '//', '\\\\', '/\\', '\\/', '%2F', '%5C', '\t/', '/\t']
    const hosts = ['evil.example.com', 'evil.example.com/roads', '@evil.example.com', '']
    for (const prefix of prefixes) {
      for (const separator of separators) {
        for (const host of hosts) {
          const raw = `${prefix}${separator}${host}`
          const result = safeNextPath(raw)
          expect(result.startsWith('/'), raw).toBe(true)
          expect(result.startsWith('//'), raw).toBe(false)
          expect(result.startsWith('/\\'), raw).toBe(false)
        }
      }
    }
  })

  it('rejects a backslash that the URL parser would turn into a protocol-relative URL', () => {
    // "/\t/evil.example.com" -> tab is stripped by the URL parser -> "//evil.example.com"
    expect(safeNextPath('/\t/evil.example.com')).toBe('/roads')
  })
})
