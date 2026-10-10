import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Spinner } from './Spinner'

describe('Spinner', () => {
  it('is a status region with a default visually-hidden label', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toHaveTextContent('読み込み中')
  })

  it('accepts a custom label', () => {
    render(<Spinner label="送信中" />)
    expect(screen.getByRole('status')).toHaveTextContent('送信中')
  })
})
