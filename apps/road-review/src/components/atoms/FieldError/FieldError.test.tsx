import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FieldError } from './FieldError'

describe('FieldError', () => {
  it('renders the message in a polite live region with the given id', () => {
    render(<FieldError id="email-error">メールアドレスの形式が正しくありません</FieldError>)
    const message = screen.getByText(/メールアドレスの形式が正しくありません/)
    const region = message.closest('[id="email-error"]')
    expect(region).not.toBeNull()
    expect(region).toHaveAttribute('aria-live', 'polite')
  })

  it('is not role="alert" (field errors are announced politely; architecture 2.1)', () => {
    render(<FieldError id="email-error">エラー</FieldError>)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders nothing when there is no message', () => {
    const { container } = render(<FieldError id="email-error" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('works as the accessible description of an input', () => {
    render(
      <>
        <input aria-label="メールアドレス" aria-invalid="true" aria-describedby="email-error" />
        <FieldError id="email-error">メールアドレスの形式が正しくありません</FieldError>
      </>,
    )
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription(
      /メールアドレスの形式が正しくありません/,
    )
  })
})
