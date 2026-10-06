import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { fireEvent, render, screen } from '@testing-library/react'
import GlobalError from './global-error'

// R-1: replaces the root layout when it fails, so it renders its own <html lang="ja"><body>.

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

describe('global-error.tsx (R-1)', () => {
  it('renders its own <html lang="ja"> and <body> with the Japanese copy', () => {
    const markup = renderToStaticMarkup(<GlobalError {...errorProps()} />)

    expect(markup).toMatch(/^<html[^>]*\slang="ja"/)
    expect(markup).toContain('<body')
    expect(markup).toContain('読み込めませんでした')
    expect(markup).toContain('通信状態を確かめて、もう一度お試しください。')
    expect(markup).toContain('もう一度読み込む')
    expect(markup).not.toContain('secret server detail')
  })

  it('"もう一度読み込む" calls retry once', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const props = errorProps()
    render(<GlobalError {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'もう一度読み込む' }))

    expect(props.retry).toHaveBeenCalledTimes(1)
  })
})
