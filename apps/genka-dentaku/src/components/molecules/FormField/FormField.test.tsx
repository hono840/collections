import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormField } from './FormField'
import { TextInput } from '@/components/atoms/TextInput'

describe('FormField', () => {
  it('associates the label and hint with the control', () => {
    render(
      <FormField label="食材名" hint="60文字まで">
        {({ id, describedBy, invalid }) => (
          <TextInput id={id} aria-describedby={describedBy} error={invalid} value="" onChange={() => {}} />
        )}
      </FormField>,
    )
    const input = screen.getByLabelText('食材名')
    expect(input).toHaveAttribute('aria-describedby')
    expect(input).toHaveAccessibleDescription('60文字まで')
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('surfaces the error message and marks the control invalid', () => {
    render(
      <FormField label="食材名" error="食材名を入力してください">
        {({ id, describedBy, invalid }) => (
          <TextInput id={id} aria-describedby={describedBy} error={invalid} value="" onChange={() => {}} />
        )}
      </FormField>,
    )
    const input = screen.getByLabelText('食材名')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('食材名を入力してください')
  })
})
