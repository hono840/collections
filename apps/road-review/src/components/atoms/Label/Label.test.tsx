import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Label } from './Label'

describe('Label', () => {
  it('associates with an input via htmlFor', () => {
    render(
      <>
        <Label htmlFor="email">メールアドレス</Label>
        <input id="email" />
      </>,
    )
    expect(screen.getByLabelText('メールアドレス')).toHaveAttribute('id', 'email')
  })

  it('shows the visible text "必須" for required fields (not color only)', () => {
    render(
      <>
        <Label htmlFor="name" required>
          道の名前
        </Label>
        <input id="name" />
      </>,
    )
    expect(screen.getByText('必須')).toBeVisible()
    expect(screen.getByLabelText(/道の名前/)).toHaveAttribute('id', 'name')
  })

  it('does not show "必須" for optional fields', () => {
    render(<Label htmlFor="memo">メモ</Label>)
    expect(screen.queryByText('必須')).not.toBeInTheDocument()
  })
})
