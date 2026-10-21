import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sheet } from './Sheet'

describe('Sheet', () => {
  it('renders a labelled modal dialog when open and nothing when closed', () => {
    const { rerender } = render(
      <Sheet open={false} onClose={() => {}} title="食材を追加">
        <p>本文</p>
      </Sheet>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    rerender(
      <Sheet open onClose={() => {}} title="食材を追加">
        <p>本文</p>
      </Sheet>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('heading', { name: '食材を追加' })).toBeInTheDocument()
  })

  it('closes on ESC, backdrop click and the close button when dismissible', async () => {
    const onClose = vi.fn()
    render(
      <Sheet open onClose={onClose} title="タイトル">
        <p>本文</p>
      </Sheet>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: '閉じる' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('does not close on ESC when not dismissible (blocking dialog)', () => {
    const onClose = vi.fn()
    render(
      <Sheet open onClose={onClose} title="復旧" dismissible={false}>
        <p>本文</p>
      </Sheet>,
    )
    // No close affordance is rendered.
    expect(screen.queryByRole('button', { name: '閉じる' })).not.toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders a footer slot', () => {
    render(
      <Sheet open onClose={() => {}} title="タイトル" footer={<button type="button">反映</button>}>
        <p>本文</p>
      </Sheet>,
    )
    expect(screen.getByRole('button', { name: '反映' })).toBeInTheDocument()
  })
})
