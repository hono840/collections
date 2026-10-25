import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from './Badge'

describe('Badge', () => {
  it.each([
    ['accent', '絶景ロード'],
    ['done', '行った'],
  ] as const)('AC6: the %s badge shows its text', (tone, text) => {
    render(<Badge tone={tone}>{text}</Badge>)

    expect(screen.getByText(text)).toBeInTheDocument()
  })

  it('AC6: is plain text (no role, not a control)', () => {
    render(<Badge tone="accent">峠</Badge>)

    const badge = screen.getByText('峠')
    expect(badge).not.toHaveAttribute('role')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('AC6: the 行った badge looks different from the category badge', () => {
    render(
      <>
        <Badge tone="accent">峠</Badge>
        <Badge tone="done">行った</Badge>
      </>,
    )

    expect(screen.getByText('行った').className).not.toBe(screen.getByText('峠').className)
  })
})
