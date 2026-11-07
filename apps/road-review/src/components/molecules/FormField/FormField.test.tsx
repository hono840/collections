import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input } from '@/components/atoms/Input'
import { FormField } from './FormField'

// Contract: FormField({ id, label, required?, hint?, error?, children })
//   Label(htmlFor=id) + children (the control) + hint (<p id={`${id}-hint`}>) + FieldError (id={`${id}-error`}).
//   The control wires aria-describedby itself (ids are deterministic).

describe('FormField (Label + control + FieldError)', () => {
  it('associates the visible label with the control', () => {
    render(
      <FormField id="road-name" label="道の名前">
        <Input id="road-name" />
      </FormField>,
    )
    expect(screen.getByLabelText('道の名前')).toHaveAttribute('id', 'road-name')
  })

  it('shows the text "必須" for required fields (not color only)', () => {
    render(
      <FormField id="road-name" label="道の名前" required>
        <Input id="road-name" />
      </FormField>,
    )
    expect(screen.getByText('必須')).toBeInTheDocument()
  })

  it('does not show "必須" for optional fields', () => {
    render(
      <FormField id="memo" label="メモ">
        <Input id="memo" />
      </FormField>,
    )
    expect(screen.queryByText('必須')).not.toBeInTheDocument()
  })

  it('renders the error with id `${id}-error` so the control can reference it', () => {
    render(
      <FormField id="road-name" label="道の名前" error="道の名前を入力してください">
        <Input id="road-name" invalid aria-describedby="road-name-error" />
      </FormField>,
    )
    const error = screen.getByText('道の名前を入力してください')
    expect(error.closest('[id]')).toHaveAttribute('id', 'road-name-error')
    expect(screen.getByLabelText('道の名前')).toHaveAccessibleDescription(
      expect.stringContaining('道の名前を入力してください'),
    )
    // Polite announcement, not role="alert" (architecture 2.1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders no error element when there is no error', () => {
    const { container } = render(
      <FormField id="road-name" label="道の名前">
        <Input id="road-name" />
      </FormField>,
    )
    expect(container.querySelector('#road-name-error')).toBeNull()
  })

  it('renders a hint with id `${id}-hint`', () => {
    const { container } = render(
      <FormField id="road-name" label="道の名前" hint="50文字以内">
        <Input id="road-name" aria-describedby="road-name-hint" />
      </FormField>,
    )
    expect(container.querySelector('#road-name-hint')).toHaveTextContent('50文字以内')
  })
})
