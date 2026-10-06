import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// S-6: GET /auth/confirm only shows a confirmation screen. The token is consumed
// by the confirmMagicLink server action when the user presses "ログインする",
// so mail scanners prefetching the link and login-CSRF links cannot sign anyone in.

const mocks = vi.hoisted(() => ({
  confirmMagicLink: vi.fn(),
  createClient: vi.fn(),
  verifyOtp: vi.fn(),
}))

vi.mock('@/features/auth/actions', () => ({
  confirmMagicLink: mocks.confirmMagicLink,
  requestMagicLink: vi.fn(),
  verifyOtpCode: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient.mockImplementation(async () => ({
    auth: { verifyOtp: mocks.verifyOtp },
  })),
}))

import ConfirmPage from './page'

type SearchParams = Record<string, string | string[] | undefined>

const LINK_INVALID_MESSAGE =
  'ログインリンクの有効期限が切れているか、すでに使われています。もう一度メールアドレスを入力してください。'

async function renderConfirmPage(searchParams: SearchParams) {
  const element = await ConfirmPage({ searchParams: Promise.resolve(searchParams) })
  return render(element)
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('/auth/confirm page (S-6)', () => {
  it('replaces the old GET route handler (route.ts must be removed)', () => {
    // Vitest runs from the app root (jsdom's import.meta.url is not a file: URL).
    const routeFile = join(process.cwd(), 'src/app/auth/confirm/route.ts')
    expect(existsSync(routeFile)).toBe(false)
  })

  it('shows the confirmation heading and a "ログインする" button for a valid link', async () => {
    await renderConfirmPage({ token_hash: 'hash-123', type: 'email' })

    expect(screen.getByRole('heading', { name: 'ログインを確認' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ログインする' })).toBeEnabled()
  })

  it('puts token_hash in a hidden field (not shown as text)', async () => {
    const { container } = await renderConfirmPage({ token_hash: 'hash-123', type: 'email' })

    const hidden = container.querySelector('form input[type="hidden"][name="token_hash"]')
    expect(hidden).not.toBeNull()
    expect(hidden).toHaveValue('hash-123')
    expect(screen.queryByText(/hash-123/)).not.toBeInTheDocument()
  })

  it('uses the first token_hash when it is repeated', async () => {
    const { container } = await renderConfirmPage({ token_hash: ['first', 'second'], type: 'email' })
    expect(container.querySelector('input[name="token_hash"]')).toHaveValue('first')
  })

  it('does not verify the token on GET (no Supabase call while rendering)', async () => {
    await renderConfirmPage({ token_hash: 'hash-123', type: 'email' })

    expect(mocks.verifyOtp).not.toHaveBeenCalled()
    expect(mocks.confirmMagicLink).not.toHaveBeenCalled()
  })

  it('"ログインする" submits token_hash to confirmMagicLink', async () => {
    const user = userEvent.setup()
    mocks.confirmMagicLink.mockReturnValue(new Promise(() => {}))
    await renderConfirmPage({ token_hash: 'hash-123', type: 'email' })

    await user.click(screen.getByRole('button', { name: 'ログインする' }))

    await waitFor(() => expect(mocks.confirmMagicLink).toHaveBeenCalledTimes(1))
    const formData = mocks.confirmMagicLink.mock.calls[0][1] as FormData
    expect(formData.get('token_hash')).toBe('hash-123')
  })

  it.each([
    ['type is not "email" (magiclink)', { token_hash: 'hash-123', type: 'magiclink' }],
    ['type is not "email" (recovery)', { token_hash: 'hash-123', type: 'recovery' }],
    ['type is missing', { token_hash: 'hash-123' }],
    ['token_hash is missing', { type: 'email' }],
    ['token_hash is empty', { token_hash: '', type: 'email' }],
    ['only the PKCE ?code= is given', { code: 'abc' }],
  ])('shows the link_invalid message and a link to /login when %s', async (_label, searchParams) => {
    await renderConfirmPage(searchParams)

    expect(screen.getByText(LINK_INVALID_MESSAGE)).toBeInTheDocument()
    const loginLinks = screen.getAllByRole('link').filter((link) => link.getAttribute('href') === '/login')
    expect(loginLinks.length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'ログインする' })).not.toBeInTheDocument()
    expect(mocks.verifyOtp).not.toHaveBeenCalled()
  })
})
