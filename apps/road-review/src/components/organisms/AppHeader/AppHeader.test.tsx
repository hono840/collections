import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

vi.mock('@/features/auth/actions', () => ({
  signOut: vi.fn(),
}))

import { AppHeader } from './AppHeader'

describe('AppHeader (signed-in app bar)', () => {
  it('renders a banner landmark with the app name linking to /roads', () => {
    render(<AppHeader />)
    const banner = screen.getByRole('banner')
    const homeLink = within(banner).getByRole('link', { name: '公道レビュー' })
    expect(homeLink).toHaveAttribute('href', '/roads')
  })

  it('renders a submit button "ログアウト" inside a form', () => {
    render(<AppHeader />)
    const logoutButton = screen.getByRole('button', { name: 'ログアウト' })
    expect(logoutButton).toHaveAttribute('type', 'submit')
    expect(logoutButton.closest('form')).not.toBeNull()
  })

  it('hides the logout icon from screen readers', () => {
    render(<AppHeader />)
    const logoutButton = screen.getByRole('button', { name: 'ログアウト' })
    const icon = logoutButton.querySelector('svg')
    expect(icon).not.toBeNull()
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })
})
