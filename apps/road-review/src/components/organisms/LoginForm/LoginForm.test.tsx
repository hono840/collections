import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({
  requestMagicLink: vi.fn(),
  verifyOtpCode: vi.fn(),
}))

vi.mock('@/features/auth/actions', () => ({
  requestMagicLink: mocks.requestMagicLink,
  verifyOtpCode: mocks.verifyOtpCode,
  signOut: vi.fn(),
}))

import { LoginForm } from './LoginForm'

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

async function fillAndSubmit(email: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/メールアドレス/), email)
  await user.click(screen.getByRole('button', { name: 'ログインリンクを送る' }))
  return user
}

describe('LoginForm', () => {
  it('has a labelled email field suitable for autofill', () => {
    render(<LoginForm />)
    const input = screen.getByLabelText(/メールアドレス/)
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveAttribute('name', 'email')
    expect(input).toHaveAttribute('autocomplete', 'email')
  })

  it('disables native validation so the app shows its own Japanese messages', () => {
    const { container } = render(<LoginForm />)
    expect(container.querySelector('form')).toHaveAttribute('novalidate')
  })

  it('submits email and next to requestMagicLink', async () => {
    mocks.requestMagicLink.mockResolvedValue({ ok: true, data: { email: 'hiro@example.com' } })
    render(<LoginForm next="/roads/abc" />)

    await fillAndSubmit('hiro@example.com')

    expect(mocks.requestMagicLink).toHaveBeenCalledTimes(1)
    const formData = mocks.requestMagicLink.mock.calls[0][1] as FormData
    expect(formData.get('email')).toBe('hiro@example.com')
    expect(formData.get('next')).toBe('/roads/abc')
  })

  it('shows "送信中…" and blocks resubmission while pending', async () => {
    const pending = deferred<unknown>()
    mocks.requestMagicLink.mockReturnValue(pending.promise)
    render(<LoginForm />)

    await fillAndSubmit('hiro@example.com')

    const button = await screen.findByRole('button', { name: /送信中…/ })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')

    pending.resolve({ ok: true, data: { email: 'hiro@example.com' } })
    expect(await screen.findByLabelText(/6桁のコード/)).toBeInTheDocument()
  })

  it('after sending, shows the sent message and the 6-digit code form on the same screen', async () => {
    mocks.requestMagicLink.mockResolvedValue({ ok: true, data: { email: 'hiro@example.com' } })
    render(<LoginForm />)

    await fillAndSubmit('hiro@example.com')

    expect(
      await screen.findByText(/hiro@example\.com にログイン用のメールを送りました/),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/6桁のコード/)).toBeInTheDocument()
  })

  it('shows the field error for an invalid email (aria-invalid + described by the message)', async () => {
    mocks.requestMagicLink.mockResolvedValue({
      ok: false,
      error: {
        code: 'validation',
        message: 'メールアドレスの形式が正しくありません',
        fieldErrors: { email: ['メールアドレスの形式が正しくありません'] },
      },
    })
    render(<LoginForm />)

    await fillAndSubmit('not-an-email')

    const input = screen.getByLabelText(/メールアドレス/)
    expect(await screen.findByText(/メールアドレスの形式が正しくありません/)).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(/メールアドレスの形式が正しくありません/)
    expect(screen.queryByLabelText(/6桁のコード/)).not.toBeInTheDocument()
  })

  it('shows the rate_limited message as an alert and keeps the typed address', async () => {
    mocks.requestMagicLink.mockResolvedValue({
      ok: false,
      error: { code: 'rate_limited', message: '時間をおいてもう一度お試しください' },
    })
    render(<LoginForm />)

    await fillAndSubmit('hiro@example.com')

    expect(await screen.findByRole('alert')).toHaveTextContent('時間をおいてもう一度お試しください')
    expect(screen.getByLabelText(/メールアドレス/)).toHaveValue('hiro@example.com')
    expect(screen.queryByLabelText(/6桁のコード/)).not.toBeInTheDocument()
  })

  it('shows the link error (M-23) when opened with initialError="link_invalid"', () => {
    render(<LoginForm initialError="link_invalid" />)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'ログインリンクの有効期限が切れているか、すでに使われています。もう一度メールアドレスを入力してください。',
    )
  })
})
