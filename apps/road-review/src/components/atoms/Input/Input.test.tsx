import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './Input'

describe('Input', () => {
  it('renders a textbox and forwards native props', () => {
    render(<Input name="email" type="email" autoComplete="email" aria-label="メールアドレス" />)
    const input = screen.getByRole('textbox', { name: 'メールアドレス' })
    expect(input).toHaveAttribute('name', 'email')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveAttribute('autocomplete', 'email')
  })

  it('accepts typing', async () => {
    const user = userEvent.setup()
    render(<Input aria-label="名前" />)
    await user.type(screen.getByRole('textbox'), '碓氷峠')
    expect(screen.getByRole('textbox')).toHaveValue('碓氷峠')
  })

  it('invalid sets aria-invalid="true"', () => {
    render(<Input aria-label="メールアドレス" invalid />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('omits aria-invalid when valid', () => {
    render(<Input aria-label="メールアドレス" />)
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid')
  })

  it('links to an error message via aria-describedby', () => {
    render(
      <>
        <Input aria-label="メールアドレス" invalid aria-describedby="email-error" />
        <p id="email-error">メールアドレスの形式が正しくありません</p>
      </>,
    )
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription(
      'メールアドレスの形式が正しくありません',
    )
  })
})
