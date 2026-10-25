import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FormField } from './FormField'

const NAME_REQUIRED_MESSAGE = 'スポット名を入れてください'

describe('FormField', () => {
  it('AC18: the <label> is linked to the <input> (getByLabelText finds the field)', () => {
    render(<FormField id="spot-name" label="スポット名（必須）" value="" onValueChange={vi.fn()} />)

    const field = screen.getByLabelText('スポット名（必須）')
    expect(field).toBeInstanceOf(HTMLInputElement)
    expect(field).toHaveAttribute('id', 'spot-name')
    expect(screen.getByText('スポット名（必須）')).toBeInstanceOf(HTMLLabelElement)
    expect(screen.getByText('スポット名（必須）')).toHaveAttribute('for', 'spot-name')
  })

  it('AC18: multiline links the label to a <textarea>', () => {
    render(<FormField id="memo" label="メモ" value="" onValueChange={vi.fn()} multiline rows={4} />)

    const field = screen.getByLabelText('メモ')
    expect(field).toBeInstanceOf(HTMLTextAreaElement)
    expect(field).toHaveAttribute('rows', '4')
  })

  it('shows the value and calls onValueChange with the typed value', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<FormField id="region" label="地域" value="神奈" onValueChange={onValueChange} />)

    const field = screen.getByLabelText('地域')
    expect(field).toHaveValue('神奈')
    await user.type(field, '川')

    expect(onValueChange).toHaveBeenCalledWith('神奈川')
  })

  it('passes placeholder and inputMode to the field', () => {
    render(
      <FormField
        id="distance"
        label="片道の距離（km）"
        value=""
        onValueChange={vi.fn()}
        placeholder="例：60"
        inputMode="decimal"
      />,
    )

    const field = screen.getByLabelText('片道の距離（km）')
    expect(field).toHaveAttribute('placeholder', '例：60')
    expect(field).toHaveAttribute('inputmode', 'decimal')
  })

  describe('without an error', () => {
    it.each([
      ['no error prop', undefined],
      ['an empty error string', ''],
    ])('AC10: with %s the field is not invalid, has no description and no message is shown', (_description, error) => {
      render(<FormField id="spot-name" label="スポット名（必須）" value="" onValueChange={vi.fn()} error={error} />)

      const field = screen.getByLabelText('スポット名（必須）')
      expect(field).not.toBeInvalid()
      expect(field).not.toHaveAttribute('aria-invalid', 'true')
      expect(field).not.toHaveAttribute('aria-describedby')
      expect(field).toHaveAccessibleDescription('')
      expect(screen.queryByText(NAME_REQUIRED_MESSAGE)).not.toBeInTheDocument()
    })
  })

  describe('with an error', () => {
    it('AC10: shows the message under the field', () => {
      render(
        <FormField id="spot-name" label="スポット名（必須）" value="" onValueChange={vi.fn()} error={NAME_REQUIRED_MESSAGE} />,
      )

      const field = screen.getByLabelText('スポット名（必須）')
      const message = screen.getByText(NAME_REQUIRED_MESSAGE)
      expect(field.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it.each([false, true])(
      'AC10/AC11: sets aria-invalid="true" and describes the field with the message (multiline: %s)',
      (multiline) => {
        render(
          <FormField
            id="field"
            label="項目"
            value=""
            onValueChange={vi.fn()}
            multiline={multiline}
            error={NAME_REQUIRED_MESSAGE}
          />,
        )

        const field = screen.getByLabelText('項目')
        expect(field).toHaveAttribute('aria-invalid', 'true')
        const describedById = field.getAttribute('aria-describedby') ?? ''
        expect(describedById).not.toBe('')
        expect(document.getElementById(describedById)).toHaveTextContent(NAME_REQUIRED_MESSAGE)
        expect(field).toHaveAccessibleDescription(NAME_REQUIRED_MESSAGE)
      },
    )

    it('AC10: removing the error removes aria-invalid, the description and the message', () => {
      const { rerender } = render(
        <FormField id="spot-name" label="スポット名（必須）" value="" onValueChange={vi.fn()} error={NAME_REQUIRED_MESSAGE} />,
      )

      rerender(<FormField id="spot-name" label="スポット名（必須）" value="大" onValueChange={vi.fn()} />)

      const field = screen.getByLabelText('スポット名（必須）')
      expect(field).not.toBeInvalid()
      expect(field).not.toHaveAttribute('aria-describedby')
      expect(screen.queryByText(NAME_REQUIRED_MESSAGE)).not.toBeInTheDocument()
    })

    it('two fields with errors each point at their own message', () => {
      render(
        <>
          <FormField id="spot-name" label="スポット名（必須）" value="" onValueChange={vi.fn()} error="名前のエラー" />
          <FormField id="distance" label="片道の距離（km）" value="" onValueChange={vi.fn()} error="距離のエラー" />
        </>,
      )

      expect(screen.getByLabelText('スポット名（必須）')).toHaveAccessibleDescription('名前のエラー')
      expect(screen.getByLabelText('片道の距離（km）')).toHaveAccessibleDescription('距離のエラー')
    })
  })

  it('forwards ref to the single-line input', () => {
    const inputRef = createRef<HTMLInputElement>()

    render(<FormField id="spot-name" label="スポット名（必須）" value="" onValueChange={vi.fn()} ref={inputRef} />)

    expect(inputRef.current).toBe(screen.getByLabelText('スポット名（必須）'))
  })
})
