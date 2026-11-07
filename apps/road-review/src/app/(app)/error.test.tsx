import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppError from './error'

// R-1: error boundary for the app area (no account in v2/v3). Next.js 16.3 passes both
// `retry` (re-fetch + re-render, stable since v16.3) and `reset` (re-render only).
// The button must use `retry` (re-render the segment).

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
    render(<AppError {...errorProps()} />)

    expect(screen.getByRole('heading', { name: '読み込めませんでした' })).toBeInTheDocument()
    expect(screen.getByText('もう一度お試しください。')).toBeInTheDocument()
  })

  it('does not show the raw error message to the user', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<AppError {...errorProps()} />)
    expect(screen.queryByText(/secret server detail/)).not.toBeInTheDocument()
  })

  it('"もう一度読み込む" calls retry once', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    const props = errorProps()
    render(<AppError {...props} />)

    await user.click(screen.getByRole('button', { name: 'もう一度読み込む' }))

    expect(props.retry).toHaveBeenCalledTimes(1)
  })
})
