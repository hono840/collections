import { describe, expect, it } from 'vitest'
import { createRef } from 'react'
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

  it('tabIndex=-1 + ref allows moving focus to the alert programmatically (error summary)', () => {
    const alertRef = createRef<HTMLDivElement>()
    render(
      <Alert variant="error" ref={alertRef} tabIndex={-1}>
        入力内容を確認してください
      </Alert>,
    )
    const alert = screen.getByRole('alert')
    expect(alertRef.current).toBe(alert)
    expect(alert).toHaveAttribute('tabindex', '-1')
    alertRef.current?.focus()
    expect(alert).toHaveFocus()
  })

  it('has no tabindex by default (not in the tab order)', () => {
    render(<Alert variant="error">エラー</Alert>)
    expect(screen.getByRole('alert')).not.toHaveAttribute('tabindex')
  })
})
