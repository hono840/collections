import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Icon } from './Icon'
import type { IconName } from './Icon'

const ICON_NAMES: IconName[] = ['check', 'chevronRight', 'chevronLeft', 'plus', 'road']

function renderIcon(element: React.ReactElement): SVGSVGElement {
  const { container } = render(element)
  const svg = container.querySelector('svg')
  if (svg === null) {
    throw new Error('Icon did not render an <svg>')
  }
  return svg
}

describe('Icon', () => {
  it.each(ICON_NAMES)('AC18: the %s icon is decorative (aria-hidden="true", no role, no name)', (iconName) => {
    const svg = renderIcon(<Icon name={iconName} />)

    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).not.toHaveAttribute('role')
    expect(svg).not.toHaveAttribute('aria-label')
    expect(svg.querySelector('title')).toBeNull()
  })

  it.each(ICON_NAMES)('the %s icon draws at least one shape', (iconName) => {
    const svg = renderIcon(<Icon name={iconName} />)

    expect(svg.querySelectorAll('path, circle').length).toBeGreaterThan(0)
  })

  it('every icon name draws a different shape', () => {
    const shapeMarkups = ICON_NAMES.map((iconName) => renderIcon(<Icon name={iconName} />).innerHTML)

    expect(new Set(shapeMarkups).size).toBe(ICON_NAMES.length)
  })

  it('defaults to 24px, a 24x24 viewBox and a stroke width of 2', () => {
    const svg = renderIcon(<Icon name="plus" />)

    expect(svg).toHaveAttribute('width', '24')
    expect(svg).toHaveAttribute('height', '24')
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    expect(svg).toHaveAttribute('stroke-width', '2')
  })

  it('applies size and strokeWidth', () => {
    const svg = renderIcon(<Icon name="check" size={18} strokeWidth={2.6} />)

    expect(svg).toHaveAttribute('width', '18')
    expect(svg).toHaveAttribute('height', '18')
    expect(svg).toHaveAttribute('stroke-width', '2.6')
    // The viewBox stays 24x24 so the shapes scale with the size.
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
  })

  it('takes its color from currentColor and has no fill', () => {
    const svg = renderIcon(<Icon name="road" />)

    expect(svg).toHaveAttribute('stroke', 'currentColor')
    expect(svg).toHaveAttribute('fill', 'none')
  })

  it('passes className through to the svg', () => {
    const svg = renderIcon(<Icon name="chevronRight" className="text-done shrink-0" />)

    expect(svg).toHaveClass('text-done', 'shrink-0')
  })
})
