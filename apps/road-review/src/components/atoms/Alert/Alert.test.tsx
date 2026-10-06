import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Alert } from './Alert'

describe('Alert', () => {
  it('variant="error" uses role="alert" so the message is announced immediately', () => {
    render(<Alert variant="error">時間をおいてもう一度お試しください</Alert>)
    expect(screen.getByRole('alert')).toHaveTextContent('時間をおいてもう一度お試しください')
  })

  it.each(['info', 'warning'] as const)('variant="%s" is not an alert', (variant) => {
    render(<Alert variant={variant}>お知らせ</Alert>)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('お知らせ')).toBeInTheDocument()
  })

  it('allows overriding the role (e.g. role="note" for the safety banner)', () => {
    render(
      <Alert variant="info" role="note">
        運転中は操作しないでください
      </Alert>,
    )
    expect(screen.getByRole('note')).toHaveTextContent('運転中は操作しないでください')
  })

  it('renders an optional title', () => {
    render(
      <Alert variant="warning" title="注意">
        本文
      </Alert>,
    )
    expect(screen.getByText('注意')).toBeInTheDocument()
    expect(screen.getByText('本文')).toBeInTheDocument()
  })

  it('hides decorative icons from assistive technology (meaning is in the text)', () => {
    const { container } = render(<Alert variant="error">エラー</Alert>)
    container.querySelectorAll('svg').forEach((icon) => {
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })
})
