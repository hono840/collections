import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({
  confirmMagicLink: vi.fn(),
}))

vi.mock('@/features/auth/actions', () => ({
  confirmMagicLink: mocks.confirmMagicLink,
  requestMagicLink: vi.fn(),
  verifyOtpCode: vi.fn(),
  signOut: vi.fn(),
}))

import { ConfirmLoginForm } from './ConfirmLoginForm'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('ConfirmLoginForm (S-6: verify only after the button press)', () => {
  it('keeps the token in a hidden field and never shows it', () => {
    const { container } = render(<ConfirmLoginForm tokenHash="hash-abc" />)

    const hiddenInput = container.querySelector('input[name="token_hash"]')
    expect(hiddenInput).toHaveAttribute('type', 'hidden')
    expect(hiddenInput).toHaveValue('hash-abc')
    expect(screen.queryByText('hash-abc')).not.toBeInTheDocument()
  })

  it('does not call the action on render (GET alone never logs in)', () => {
    render(<ConfirmLoginForm tokenHash="hash-abc" />)

    expect(mocks.confirmMagicLink).not.toHaveBeenCalled()
    const button = screen.getByRole('button', { name: 'ログインする' })
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toBeEnabled()
    expect(button).not.toHaveAttribute('aria-busy')
  })

  it('posts token_hash to confirmMagicLink when "ログインする" is pressed', async () => {
    mocks.confirmMagicLink.mockResolvedValue(null)
    const user = userEvent.setup()
    render(<ConfirmLoginForm tokenHash="hash-abc" />)

    await user.click(screen.getByRole('button', { name: 'ログインする' }))

    await waitFor(() => expect(mocks.confirmMagicLink).toHaveBeenCalledTimes(1))
    const formData = mocks.confirmMagicLink.mock.calls[0][1] as FormData
    expect(formData).toBeInstanceOf(FormData)
    expect(formData.get('token_hash')).toBe('hash-abc')
  })

  it('shows "ログイン中…" with aria-busy and disabled while pending, then returns', async () => {
    const pending = deferred<null>()
    mocks.confirmMagicLink.mockReturnValue(pending.promise)
    const user = userEvent.setup()
    render(<ConfirmLoginForm tokenHash="hash-abc" />)

    await user.click(screen.getByRole('button', { name: 'ログインする' }))

    const busyButton = await screen.findByRole('button', { name: 'ログイン中…' })
    expect(busyButton).toBeDisabled()
    expect(busyButton).toHaveAttribute('aria-busy', 'true')

    pending.resolve(null)
    const idleButton = await screen.findByRole('button', { name: 'ログインする' })
    expect(idleButton).toBeEnabled()
    expect(idleButton).not.toHaveAttribute('aria-busy')
  })

  it('accepts a className for layout', () => {
    const { container } = render(<ConfirmLoginForm tokenHash="hash-abc" className="mt-8" />)
    expect(container.querySelector('form')).toHaveClass('mt-8')
  })
})
