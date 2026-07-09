import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { DEFAULT_STATE } from '@/lib/storage/canonical-store'
import { createSampleState } from '@/lib/sample/sample-data'
import { selectDashboardMenus } from '@/lib/domain'
import type { CanonicalState } from '@/lib/domain/schema'
import { PrintableMenuReport } from './PrintableMenuReport'

function sampleSummaries() {
  const { ingredients, menus } = createSampleState()
  const state: CanonicalState = { ...DEFAULT_STATE, ingredients, menus }
  return selectDashboardMenus(state)
}

describe('PrintableMenuReport', () => {
  it('renders the report title and an output date', () => {
    render(<PrintableMenuReport summaries={sampleSummaries()} generatedAt={new Date('2026-07-09T00:00:00.000Z')} />)
    expect(screen.getByRole('heading', { name: /メニュー原価率レポート/ })).toBeInTheDocument()
    expect(screen.getByText(/出力日:/)).toHaveTextContent('2026年7月9日')
  })

  it('lists the seeded 唐揚げ定食 with its cost rate and a color-independent status LABEL', () => {
    render(<PrintableMenuReport summaries={sampleSummaries()} />)
    const row = screen.getByText('唐揚げ定食').closest('tr') as HTMLElement
    expect(within(row).getByText('24.8%')).toBeInTheDocument()
    // §6.5: status is shown as a text label (not colour alone).
    expect(within(row).getByText('良好')).toBeInTheDocument()
  })

  it('shows an empty-state message when there are no menus', () => {
    render(<PrintableMenuReport summaries={[]} />)
    expect(screen.getByText(/出力できるメニューがありません/)).toBeInTheDocument()
  })

  it('is a labelled print document root (hidden on screen, shown in print)', () => {
    const { container } = render(<PrintableMenuReport summaries={[]} />)
    const root = container.querySelector('[data-print-root]') as HTMLElement
    expect(root).toHaveAttribute('aria-label', 'メニュー原価率レポート')
    expect(root.className).toContain('hidden')
    expect(root.className).toContain('print:block')
  })
})
