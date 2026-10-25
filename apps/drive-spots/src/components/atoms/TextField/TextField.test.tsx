import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { TextField } from './TextField'
import type { TextFieldProps } from './TextField'

/** Keeps the value in state, like FormField's parent does, so typing builds up a whole string. */
function StatefulTextField(props: Omit<TextFieldProps, 'value' | 'onValueChange'> & {
  onValueChange?: (value: string) => void
}) {
  const [value, setValue] = useState('')
  return (
    <TextField
      {...props}
      value={value}
      onValueChange={(nextValue) => {
        setValue(nextValue)
        props.onValueChange?.(nextValue)
      }}
    />
  )
}

function getField(): HTMLElement {
  return screen.getByRole('textbox')
}

describe('TextField', () => {
  describe('single line (default)', () => {
    it('AC18: renders a real <input type="text"> with the given id and value', () => {
      render(<TextField id="spot-name" value="ヤビツ峠" onValueChange={vi.fn()} />)

      const field = getField()
      expect(field).toBeInstanceOf(HTMLInputElement)
      expect(field).toHaveAttribute('type', 'text')
      expect(field).toHaveAttribute('id', 'spot-name')
      expect(field).toHaveValue('ヤビツ峠')
    })

    it('turns autocomplete off and shows the placeholder', () => {
      render(<TextField id="region" value="" onValueChange={vi.fn()} placeholder="例：神奈川" />)

      expect(getField()).toHaveAttribute('autocomplete', 'off')
      expect(screen.getByPlaceholderText('例：神奈川')).toBe(getField())
    })

    it('calls onValueChange with the new value on every keystroke', async () => {
      const user = userEvent.setup()
      const onValueChange = vi.fn()
      render(<StatefulTextField id="spot-name" onValueChange={onValueChange} />)

      await user.type(getField(), '大観山')

      expect(onValueChange.mock.calls.map(([value]) => value)).toEqual(['大', '大観', '大観山'])
      expect(getField()).toHaveValue('大観山')
    })

    it("inputMode 'decimal' sets inputmode for the phone number keypad, and the type stays text", () => {
      render(<TextField id="distance" value="" onValueChange={vi.fn()} inputMode="decimal" />)

      expect(getField()).toHaveAttribute('inputmode', 'decimal')
      expect(getField()).toHaveAttribute('type', 'text')
    })

    it('has no inputmode by default', () => {
      render(<TextField id="region" value="" onValueChange={vi.fn()} />)

      expect(getField()).not.toHaveAttribute('inputmode')
    })

    it('forwards ref to the <input> (used to focus the first invalid field)', () => {
      const inputRef = createRef<HTMLInputElement>()

      render(<TextField id="spot-name" value="" onValueChange={vi.fn()} ref={inputRef} />)

      expect(inputRef.current).toBe(getField())
    })
  })

  describe('multiline', () => {
    it('AC18: multiline renders a real <textarea> with 4 rows by default', () => {
      render(<TextField id="memo" value="" onValueChange={vi.fn()} multiline />)

      const field = getField()
      expect(field).toBeInstanceOf(HTMLTextAreaElement)
      expect(field).toHaveAttribute('id', 'memo')
      expect(field).toHaveAttribute('rows', '4')
    })

    it('applies rows', () => {
      render(<TextField id="memo" value="" onValueChange={vi.fn()} multiline rows={6} />)

      expect(getField()).toHaveAttribute('rows', '6')
    })

    it('AC6: typing Enter inserts a line break into the value', async () => {
      const user = userEvent.setup()
      const onValueChange = vi.fn()
      render(<StatefulTextField id="memo" multiline onValueChange={onValueChange} />)

      await user.type(getField(), '一行目{Enter}二行目')

      expect(getField()).toHaveValue('一行目\n二行目')
      expect(onValueChange).toHaveBeenLastCalledWith('一行目\n二行目')
    })

    it('shows the value and placeholder', () => {
      render(
        <TextField id="memo" value={'冬は\n通行止め'} onValueChange={vi.fn()} multiline placeholder="例：冬は通行止め" />,
      )

      expect(getField()).toHaveValue('冬は\n通行止め')
      expect(getField()).toHaveAttribute('placeholder', '例：冬は通行止め')
    })
  })

  describe('invalid and describedBy', () => {
    it.each([false, true])('AC10/AC11: invalid sets aria-invalid="true" (multiline: %s)', (multiline) => {
      render(<TextField id="field" value="" onValueChange={vi.fn()} multiline={multiline} invalid />)

      expect(getField()).toHaveAttribute('aria-invalid', 'true')
      expect(getField()).toBeInvalid()
    })

    it.each([false, true])('AC10/AC11: a valid field is not marked invalid (multiline: %s)', (multiline) => {
      render(<TextField id="field" value="" onValueChange={vi.fn()} multiline={multiline} />)

      expect(getField()).not.toBeInvalid()
      expect(getField()).not.toHaveAttribute('aria-invalid', 'true')
    })

    it.each([false, true])('describedBy sets aria-describedby (multiline: %s)', (multiline) => {
      render(
        <>
          <TextField id="field" value="" onValueChange={vi.fn()} multiline={multiline} describedBy="field-error" />
          <p id="field-error">スポット名を入れてください</p>
        </>,
      )

      expect(getField()).toHaveAttribute('aria-describedby', 'field-error')
      expect(getField()).toHaveAccessibleDescription('スポット名を入れてください')
    })

    it('has no aria-describedby by default', () => {
      render(<TextField id="field" value="" onValueChange={vi.fn()} />)

      expect(getField()).not.toHaveAttribute('aria-describedby')
    })
  })

  describe('focus style (AC18)', () => {
    // Tailwind v4 `outline-none` is `outline-style: none`, which also removes the outline that
    // forced-colors (Windows high contrast) mode relies on. `outline-hidden` keeps it there.
    it('AC18: input and textarea use outline-hidden instead of outline-none so forced-colors mode keeps a focus ring', () => {
      render(
        <>
          <TextField id="single-line" value="" onValueChange={vi.fn()} />
          <TextField id="multiline" value="" onValueChange={vi.fn()} multiline />
        </>,
      )

      const fields = screen.getAllByRole('textbox')
      expect(fields).toHaveLength(2)
      for (const field of fields) {
        expect(field).not.toHaveClass('outline-none')
        expect(field).toHaveClass('outline-hidden')
      }
    })
  })
})
