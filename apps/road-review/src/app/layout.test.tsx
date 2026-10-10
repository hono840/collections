import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// Static export: the root layout must not read request data (no headers(), no nonce).
// The inline theme script stays; stage 3 allows it through its sha256 hash in the meta CSP.

vi.mock('next/font/google', () => {
  const font = () => ({ className: 'font', variable: 'font-variable', style: { fontFamily: 'font' } })
  return { BIZ_UDGothic: font, BIZ_UDPGothic: font, Shippori_Mincho_B1: font }
})

import RootLayout from './layout'

function renderLayout(): string {
  return renderToStaticMarkup(RootLayout({ children: <main>content</main> }))
}

describe('RootLayout (static export)', () => {
  it('renders synchronously (no request-time APIs)', () => {
    const element = RootLayout({ children: <main>content</main> })
    expect(element).not.toBeInstanceOf(Promise)
  })

  it('keeps the inline theme script without a nonce', () => {
    const markup = renderLayout()
    const themeScript = markup.match(/<script\b[^>]*>[^<]*rr-theme[^<]*<\/script>/)?.[0]
    expect(themeScript).toBeDefined()
    expect(themeScript).not.toMatch(/\snonce=/)
  })

  it('renders <html lang="ja"> and the children', () => {
    const markup = renderLayout()
    expect(markup).toMatch(/^<html[^>]*\slang="ja"/)
    expect(markup).toContain('<main>content</main>')
  })
})
