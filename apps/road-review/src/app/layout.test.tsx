import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// Static export: the root layout must not read request data (no headers(), no nonce).
// MVP is light-only (C-09), so there is no inline theme script: the only inline scripts left are
// Next's RSC payload, which scripts/csp/inject-meta-csp.mjs hashes after the build.

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

  it('renders no inline script and no nonce of its own', () => {
    const markup = renderLayout()
    expect(markup).not.toMatch(/<script\b/)
    expect(markup).not.toMatch(/\snonce=/)
    expect(markup).not.toContain('rr-theme')
  })

  it('does not switch to a dark theme (light-only, C-09)', () => {
    expect(renderLayout()).not.toMatch(/^<html[^>]*\sclass="[^"]*\bdark\b/)
  })

  it('renders <html lang="ja"> and the children', () => {
    const markup = renderLayout()
    expect(markup).toMatch(/^<html[^>]*\slang="ja"/)
    expect(markup).toContain('<main>content</main>')
  })
})
