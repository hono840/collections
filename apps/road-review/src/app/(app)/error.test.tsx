import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignedInError from './error'

// R-1: error boundary for the signed-in area. Next.js 16.3 passes both
// `retry` (re-fetch + re-render, stable since v16.3) and `reset` (re-render only).
// A failed load is usually a network/server hiccup, so the button must use `retry`.

function errorProps() {
  return {
    error: Object.assign(new Error('boom: secret server detail'), { digest: 'digest-1' }),
    retry: vi.fn(),
    reset: vi.fn(),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('(app)/error.tsx (R-1)', () => {
  it('shows the Japanese heading and body copy', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<SignedInError {...errorProps()} />)

    expect(screen.getByRole('heading', { name: '読み込めませんでした' })).toBeInTheDocument()
    expect(screen.getByText('通信状態を確かめて、もう一度お試しください。')).toBeInTheDocument()
  })

  it('does not show the raw error message to the user', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<SignedInError {...errorProps()} />)
    expect(screen.queryByText(/secret server detail/)).not.toBeInTheDocument()
  })

  it('"もう一度読み込む" calls retry once', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    const props = errorProps()
    render(<SignedInError {...props} />)

    await user.click(screen.getByRole('button', { name: 'もう一度読み込む' }))

    expect(props.retry).toHaveBeenCalledTimes(1)
  })
})
