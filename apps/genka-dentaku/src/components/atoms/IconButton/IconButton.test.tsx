import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Plus } from 'lucide-react'
import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('exposes its accessible name via label', () => {
    render(<IconButton icon={Plus} label="材料を追加" />)
    expect(screen.getByRole('button', { name: '材料を追加' })).toBeInTheDocument()
  })

  it('hides the glyph from assistive tech (labelled by the button)', () => {
    const { container } = render(<IconButton icon={Plus} label="追加" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('fires onClick', async () => {
    const onClick = vi.fn()
    render(<IconButton icon={Plus} label="追加" onClick={onClick} />)
    await userEvent.click(screen.getByRole('button', { name: '追加' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
