// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BASE_PATH } from './site-config.mjs'

// next.config.ts is the source Next reads; the scripts cannot import it, so pin the two together.
describe('BASE_PATH', () => {
  it('equals basePath in next.config.ts', () => {
    const nextConfig = readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8')
    expect(nextConfig).toContain(`basePath: '${BASE_PATH}'`)
  })

  it('matches the GitHub Pages URL https://hono840.github.io/collections/drive-spots/', () => {
    expect(BASE_PATH).toBe('/collections/drive-spots')
  })
})
