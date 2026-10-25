import { TextField } from '@/components/atoms/TextField'
import type { TextFieldProps } from '@/components/atoms/TextField'

type FormFieldProps = Omit<TextFieldProps, 'invalid' | 'describedBy' | 'labelledBy'> & {
  label: string
  /** Shown under the field and linked with aria-describedby; the field gets aria-invalid. */
  error?: string
}

/** <label> + text field + error message (the add form's rows). */
export function FormField({ id, label, error, ref, ...textFieldProps }: FormFieldProps) {
  const errorId = `${id}-error`
  const hasError = error !== undefined && error !== ''

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-13 font-medium text-ink-muted">
        {label}
      </label>
      <TextField
        {...textFieldProps}
        id={id}
        ref={ref}
        invalid={hasError}
        describedBy={hasError ? errorId : undefined}
      />
      {hasError ? (
        <p id={errorId} className="text-13 text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
