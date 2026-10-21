import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders a button and fires onClick', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>保存</Button>)
    await userEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('defaults to type="button" to avoid accidental form submits', () => {
    render(<Button>保存</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('is busy and disabled while loading', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        保存
      </Button>,
    )
    const btn = screen.getByRole('button', { name: '保存' })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('does not fire when disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        保存
      </Button>,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })
})
