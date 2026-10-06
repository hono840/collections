import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({ verifyOtpCode: vi.fn() }))

vi.mock('@/features/auth/actions', () => ({
  requestMagicLink: vi.fn(),
  verifyOtpCode: mocks.verifyOtpCode,
  signOut: vi.fn(),
}))

import { OtpForm } from './OtpForm'

afterEach(() => {
  vi.clearAllMocks()
})

function codeInput() {
  return screen.getByLabelText(/6桁のコード/)
}

function submitButton() {
  return screen.getByRole('button', { name: /ログイン/ })
}

describe('OtpForm', () => {
  it('has a numeric one-time-code field', () => {
    render(<OtpForm email="hiro@example.com" />)
    const input = codeInput()
    expect(input).toHaveAttribute('name', 'token')
    expect(input).toHaveAttribute('inputmode', 'numeric')
    expect(input).toHaveAttribute('autocomplete', 'one-time-code')
  })

  it('keeps submit disabled until exactly 6 digits are entered', async () => {
    const user = userEvent.setup()
    render(<OtpForm email="hiro@example.com" />)

    expect(submitButton()).toBeDisabled()
    await user.type(codeInput(), '12345')
    expect(submitButton()).toBeDisabled()
    await user.type(codeInput(), '6')
    expect(submitButton()).toBeEnabled()
  })

  it.each(['12a45', 'abcdef', '12 45'])('stays disabled for non-digit input %j', async (typed) => {
    const user = userEvent.setup()
    render(<OtpForm email="hiro@example.com" />)
    await user.type(codeInput(), typed)
    expect(submitButton()).toBeDisabled()
  })

  // R-2: value.normalize('NFKC').replace(/\D/g, '').slice(0, 6)
  describe('input normalization (R-2)', () => {
    it('converts full-width digits "１２３４５６" to "123456" and enables submit', async () => {
      const user = userEvent.setup()
      render(<OtpForm email="hiro@example.com" />)

      await user.type(codeInput(), '１２３４５６')

      expect(codeInput()).toHaveValue('123456')
      expect(submitButton()).toBeEnabled()
    })

    it.each(['123 456', '123-456', ' 123456 ', '１２３ ４５６'])(
      'normalizes a pasted code %j to "123456"',
      async (pasted) => {
        const user = userEvent.setup()
        render(<OtpForm email="hiro@example.com" />)

        await user.click(codeInput())
        await user.paste(pasted)

        expect(codeInput()).toHaveValue('123456')
        expect(submitButton()).toBeEnabled()
      },
    )

    it('cuts a pasted value longer than 6 digits to the first 6', async () => {
      const user = userEvent.setup()
      render(<OtpForm email="hiro@example.com" />)

      await user.click(codeInput())
      await user.paste('1234567890')

      expect(codeInput()).toHaveValue('123456')
    })

    it('drops non-digit characters while typing', async () => {
      const user = userEvent.setup()
      render(<OtpForm email="hiro@example.com" />)

      await user.type(codeInput(), '12a3b4')

      expect(codeInput()).toHaveValue('1234')
    })

    it('submits the normalized token', async () => {
      const user = userEvent.setup()
      mocks.verifyOtpCode.mockResolvedValue(null)
      render(<OtpForm email="hiro@example.com" />)

      await user.click(codeInput())
      await user.paste('１２３-４５６')
      await user.click(submitButton())

      const formData = mocks.verifyOtpCode.mock.calls[0][1] as FormData
      expect(formData.get('token')).toBe('123456')
    })
  })

  it('sends email and token to verifyOtpCode', async () => {
    const user = userEvent.setup()
    mocks.verifyOtpCode.mockResolvedValue(null)
    render(<OtpForm email="hiro@example.com" />)

    await user.type(codeInput(), '123456')
    await user.click(submitButton())

    expect(mocks.verifyOtpCode).toHaveBeenCalledTimes(1)
    const formData = mocks.verifyOtpCode.mock.calls[0][1] as FormData
    expect(formData.get('email')).toBe('hiro@example.com')
    expect(formData.get('token')).toBe('123456')
  })

  it('blocks resubmission while verifying', async () => {
    const user = userEvent.setup()
    mocks.verifyOtpCode.mockReturnValue(new Promise(() => {}))
    render(<OtpForm email="hiro@example.com" />)

    await user.type(codeInput(), '123456')
    await user.click(submitButton())

    const button = await screen.findByRole('button', { name: /ログイン|確認中/ })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('shows the error as an alert and marks the field invalid when the code is wrong', async () => {
    const user = userEvent.setup()
    mocks.verifyOtpCode.mockResolvedValue({
      ok: false,
      error: {
        code: 'validation',
        message: 'コードが正しくないか、有効期限が切れています。もう一度お試しください。',
      },
    })
    render(<OtpForm email="hiro@example.com" />)

    await user.type(codeInput(), '000000')
    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'コードが正しくないか、有効期限が切れています。もう一度お試しください。',
    )
    expect(codeInput()).toHaveAttribute('aria-invalid', 'true')
  })

  // R-3
  it('moves focus back to the code input when the code is wrong', async () => {
    const user = userEvent.setup()
    mocks.verifyOtpCode.mockResolvedValue({
      ok: false,
      error: {
        code: 'validation',
        message: 'コードが正しくないか、有効期限が切れています。もう一度お試しください。',
      },
    })
    render(<OtpForm email="hiro@example.com" />)

    await user.type(codeInput(), '000000')
    await user.click(submitButton())

    await screen.findByRole('alert')
    await waitFor(() => expect(codeInput()).toHaveFocus())
  })

  it('moves focus back to the code input when the request itself fails', async () => {
    const user = userEvent.setup()
    mocks.verifyOtpCode.mockRejectedValue(new Error('network'))
    render(<OtpForm email="hiro@example.com" />)

    await user.type(codeInput(), '123456')
    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('時間をおいてもう一度お試しください')
    await waitFor(() => expect(codeInput()).toHaveFocus())
  })
})
