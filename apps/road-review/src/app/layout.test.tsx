import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// S-5: the root layout reads the per-request nonce that proxy.ts forwards as
// the `x-nonce` request header and puts it on the inline theme <script>.

const mocks = vi.hoisted(() => ({ requestHeaders: new Headers() }))

vi.mock('next/headers', () => ({ headers: vi.fn(async () => mocks.requestHeaders) }))
vi.mock('next/font/google', () => {
  const font = () => ({ className: 'font', variable: 'font-variable', style: { fontFamily: 'font' } })
  return { BIZ_UDGothic: font, BIZ_UDPGothic: font, Shippori_Mincho_B1: font }
})

import RootLayout from './layout'

async function renderLayout(): Promise<string> {
  const element = await RootLayout({ children: <main>content</main> })
  return renderToStaticMarkup(element)
}

afterEach(() => {
  mocks.requestHeaders = new Headers()
})

describe('RootLayout (S-5)', () => {
  it('puts the x-nonce request header on the inline theme script', async () => {
    mocks.requestHeaders = new Headers({ 'x-nonce': 'bm9uY2UtMQ==' })

    const markup = await renderLayout()

    const themeScript = markup.match(/<script\b[^>]*>[^<]*rr-theme[^<]*<\/script>/)?.[0]
    expect(themeScript).toBeDefined()
    expect(themeScript).toMatch(/\snonce="bm9uY2UtMQ=="/)
  })

  it('uses the nonce of the current request', async () => {
    mocks.requestHeaders = new Headers({ 'x-nonce': 'c2Vjb25k' })
    expect(await renderLayout()).toContain('nonce="c2Vjb25k"')
  })

  it('still renders <html lang="ja"> and the children', async () => {
    mocks.requestHeaders = new Headers({ 'x-nonce': 'bm9uY2UtMQ==' })
    const markup = await renderLayout()
    expect(markup).toMatch(/^<html[^>]*\slang="ja"/)
    expect(markup).toContain('<main>content</main>')
  })
})
