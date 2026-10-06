import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FOREST_ROAD_NOTE_MESSAGE, ForestRoadNote } from './ForestRoadNote'

describe('ForestRoadNote', () => {
  it('M-08: shows the forest road message', () => {
    render(<ForestRoadNote />)
    expect(screen.getByText(FOREST_ROAD_NOTE_MESSAGE)).toBeInTheDocument()
  })

  it('M-08 message text matches the microcopy', () => {
    expect(FOREST_ROAD_NOTE_MESSAGE).toContain('林道は、舗装されていない区間')
    expect(FOREST_ROAD_NOTE_MESSAGE).toContain('通行止めの道には入らないでください。')
  })

  it('shows the text label "注意" (meaning is not carried by color only)', () => {
    render(<ForestRoadNote />)
    expect(screen.getByText('注意')).toBeInTheDocument()
  })

  it('is a calm note (role="note"), not an alert', () => {
    render(<ForestRoadNote />)
    const note = screen.getByRole('note')
    expect(note).toHaveTextContent('注意')
    expect(note).toHaveTextContent(FOREST_ROAD_NOTE_MESSAGE)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('is not dismissible (no buttons)', () => {
    render(<ForestRoadNote />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('hides the decorative forest symbol from assistive technology', () => {
    const { container } = render(<ForestRoadNote />)
    const icons = container.querySelectorAll('svg')
    expect(icons.length).toBeGreaterThan(0)
    icons.forEach((icon) => {
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  it('merges a custom className', () => {
    render(<ForestRoadNote className="mt-4" />)
    expect(screen.getByRole('note')).toHaveClass('mt-4')
  })
})
