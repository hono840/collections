import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { AppHeader } from './AppHeader'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('AppHeader (app bar, no account)', () => {
  it('renders a banner landmark with the app name linking to /', () => {
    render(<AppHeader />)
    const banner = screen.getByRole('banner')
    const homeLink = within(banner).getByRole('link', { name: '公道レビュー' })
    expect(homeLink).toHaveAttribute('href', '/')
  })

  // href note (static export, trailingSlash: true): the component writes href="/data/" and `next build`
  // keeps it, so out/index.html links to /data/ (= out/data/index.html) without a redirect.
  // next/link only keeps the trailing slash when process.env.__NEXT_TRAILING_SLASH is set, which next build
  // inlines from next.config. Vitest does not load next.config, so it is stubbed here to match the build;
  // without it, jsdom would render "/data" and the test would not reflect the shipped HTML.
  it('links to the data screen with the trailing-slash href used by the static build', () => {
    vi.stubEnv('__NEXT_TRAILING_SLASH', 'true')
    render(<AppHeader />)
    const banner = screen.getByRole('banner')
    expect(within(banner).getByRole('link', { name: 'データ' })).toHaveAttribute('href', '/data/')
  })

  it('has no logout control (there is no account)', () => {
    render(<AppHeader />)
    expect(screen.queryByRole('button', { name: 'ログアウト' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'ログアウト' })).not.toBeInTheDocument()
  })

  it('hides the data icon from screen readers', () => {
    render(<AppHeader />)
    const icon = screen.getByRole('link', { name: 'データ' }).querySelector('svg')
    expect(icon).not.toBeNull()
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })
})
