import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InfoTile } from './InfoTile'

function renderInDefinitionList(element: React.ReactElement) {
  return render(<dl>{element}</dl>)
}

describe('InfoTile', () => {
  it('AC6: renders the label as a term (<dt>) and the value as its definition (<dd>)', () => {
    renderInDefinitionList(<InfoTile label="地域" value="神奈川" />)

    expect(screen.getByRole('term')).toHaveTextContent('地域')
    expect(screen.getByRole('definition')).toHaveTextContent('神奈川')
    expect(screen.getByText('地域').tagName).toBe('DT')
    expect(screen.getByText('神奈川').tagName).toBe('DD')
  })

  it('AC6: label and value share one wrapper element, label first', () => {
    renderInDefinitionList(<InfoTile label="自宅からの距離（片道）" value="約 60 km" />)

    const labelElement = screen.getByText('自宅からの距離（片道）')
    const valueElement = screen.getByText('約 60 km')
    expect(labelElement.parentElement).toBe(valueElement.parentElement)
    expect(labelElement.parentElement).toHaveTextContent(/^自宅からの距離（片道）\s*約 60 km$/)
    expect(labelElement.nextElementSibling).toBe(valueElement)
  })

  it('AC6: shows the value text as given (e.g. 未入力)', () => {
    renderInDefinitionList(<InfoTile label="おすすめ時期" value="未入力" wide />)

    expect(screen.getByRole('definition')).toHaveTextContent(/^未入力$/)
  })

  it('wide changes only the layout, not the content', () => {
    const { container: normalContainer } = renderInDefinitionList(<InfoTile label="おすすめ時期" value="紅葉の季節" />)
    const { container: wideContainer } = renderInDefinitionList(<InfoTile label="おすすめ時期" value="紅葉の季節" wide />)

    const normalTile = normalContainer.querySelector('dl > div')
    const wideTile = wideContainer.querySelector('dl > div')
    expect(wideTile?.textContent).toBe(normalTile?.textContent)
    expect(wideTile?.className).not.toBe(normalTile?.className)
  })
})
