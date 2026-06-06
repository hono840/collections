import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DateGroupHeader } from './DateGroupHeader'

// 2026-06-11T19:00:00Z → JST 6/12(金)
const ISO = '2026-06-11T19:00:00.000Z'

describe('DateGroupHeader', () => {
  it('JST の日付見出しが表示される', () => {
    render(<DateGroupHeader isoDate={ISO} />)
    expect(screen.getByText('6月12日(金)')).toBeInTheDocument()
  })

  it('見出しは h2 要素で出力される', () => {
    render(<DateGroupHeader isoDate={ISO} />)
    expect(
      screen.getByRole('heading', { level: 2, name: /6月12日/ }),
    ).toBeInTheDocument()
  })

  it('matchCount があれば試合数が表示される', () => {
    render(<DateGroupHeader isoDate={ISO} matchCount={4} />)
    expect(screen.getByText('4試合')).toBeInTheDocument()
  })

  it('matchCount が無ければ試合数は表示されない', () => {
    render(<DateGroupHeader isoDate={ISO} />)
    expect(screen.queryByText(/試合/)).not.toBeInTheDocument()
  })
})
