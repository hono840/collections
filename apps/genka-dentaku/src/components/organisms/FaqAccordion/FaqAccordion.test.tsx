import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { FaqItem } from '@/lib/content/faq'
import { FaqAccordion } from './FaqAccordion'

const items: FaqItem[] = [
  { id: 'a', q: '質問A', a: '回答A' },
  { id: 'b', q: '質問B', a: '回答B' },
]

describe('FaqAccordion', () => {
  it('renders every question and answer', () => {
    render(<FaqAccordion items={items} />)
    expect(screen.getByText('質問A')).toBeInTheDocument()
    expect(screen.getByText('質問B')).toBeInTheDocument()
    // 回答は閉じていても DOM に存在する（SEO 本文）。
    expect(screen.getByText('回答A')).toBeInTheDocument()
    expect(screen.getByText('回答B')).toBeInTheDocument()
  })

  it('toggles a disclosure open and closed via its native summary', () => {
    render(<FaqAccordion items={items} />)
    const summary = screen.getByText('質問A').closest('summary')
    const details = screen.getByText('質問A').closest('details')
    if (summary === null || details === null) throw new Error('summary/details not found')

    expect(details.open).toBe(false)
    fireEvent.click(summary)
    expect(details.open).toBe(true)
    fireEvent.click(summary)
    expect(details.open).toBe(false)
  })
})
