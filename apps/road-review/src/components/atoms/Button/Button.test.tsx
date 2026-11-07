import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders a native button with its label', () => {
    render(<Button>道を登録</Button>)
    expect(screen.getByRole('button', { name: '道を登録' })).toBeInTheDocument()
  })

  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>キャンセル</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('accepts type="submit"', () => {
    render(<Button type="submit">送信</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('calls onClick when pressed', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>押す</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('loading sets aria-busy="true" and blocks presses (double-submit guard)', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        保存中…
      </Button>,
    )
    const button = screen.getByRole('button', { name: /保存中…/ })
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toBeDisabled()
    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('does not set aria-busy when not loading', () => {
    render(<Button>保存</Button>)
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy', 'true')
  })

  it.each(['primary', 'secondary', 'danger', 'ghost'] as const)('accepts variant=%s', (variant) => {
    render(<Button variant={variant}>ボタン</Button>)
    expect(screen.getByRole('button', { name: 'ボタン' })).toBeInTheDocument()
  })

  it('merges a custom className', () => {
    render(<Button className="w-full">ボタン</Button>)
    expect(screen.getByRole('button')).toHaveClass('w-full')
  })
})
