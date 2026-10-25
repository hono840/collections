import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './EmptyState'

const EMPTY_TITLE = 'まだありません'

describe('EmptyState', () => {
  it('AC5: shows the title and a text description', () => {
    render(<EmptyState title={EMPTY_TITLE} description="説明文です" />)

    expect(screen.getByText(EMPTY_TITLE)).toBeInTheDocument()
    expect(screen.getByText('説明文です')).toBeInTheDocument()
  })

  it('AC5: the title comes before the description', () => {
    render(<EmptyState title={EMPTY_TITLE} description="説明文です" />)

    const titleElement = screen.getByText(EMPTY_TITLE)
    const descriptionElement = screen.getByText('説明文です')
    expect(titleElement.compareDocumentPosition(descriptionElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('AC5: accepts rich content as the description (the design breaks the line with <br>)', () => {
    const { container } = render(
      <EmptyState
        title={EMPTY_TITLE}
        description={
          <>
            行ったスポットは、詳細画面の
            <br />
            「行った！」ボタンでここに移ります
          </>
        }
      />,
    )

    expect(container).toHaveTextContent('行ったスポットは、詳細画面の「行った！」ボタンでここに移ります')
    expect(container.querySelector('br')).not.toBeNull()
  })

  it('AC5: its road icon is decorative (aria-hidden)', () => {
    const { container } = render(<EmptyState title={EMPTY_TITLE} description="説明文です" />)

    const icons = container.querySelectorAll('svg')
    expect(icons).toHaveLength(1)
    expect(icons[0]).toHaveAttribute('aria-hidden', 'true')
  })

  it('AC5: is not a control', () => {
    render(<EmptyState title={EMPTY_TITLE} description="説明文です" />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
