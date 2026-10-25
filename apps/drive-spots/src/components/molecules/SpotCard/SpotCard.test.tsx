import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Icon } from '@/components/atoms/Icon'
import { SpotCard } from './SpotCard'

type SpotCardTestProps = Partial<React.ComponentProps<typeof SpotCard>>

function renderCard(props: SpotCardTestProps = {}) {
  const onOpen = vi.fn()
  render(
    <SpotCard
      mark="峠"
      name="ヤビツ峠"
      region="神奈川"
      category="峠"
      done={false}
      onOpen={onOpen}
      {...props}
    />,
  )
  return { onOpen, card: screen.getByRole('button') }
}

/** The path the check icon draws, taken from the Icon atom so the test does not copy SVG data. */
function getCheckIconMarkup(): string {
  const { container, unmount } = render(<Icon name="check" />)
  const markup = container.querySelector('svg')?.innerHTML ?? ''
  unmount()
  return markup
}

function hasCheckIcon(card: HTMLElement, checkIconMarkup: string): boolean {
  return Array.from(card.querySelectorAll('svg')).some((svg) => svg.innerHTML === checkIconMarkup)
}

describe('SpotCard', () => {
  it('AC4/AC18: the whole card is one real <button type="button">', () => {
    const { card } = renderCard()

    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(card).toBeInstanceOf(HTMLButtonElement)
    expect(card).toHaveAttribute('type', 'button')
  })

  it('AC4: the text reads mark, name, then 「地域・種類」', () => {
    const { card } = renderCard({ mark: '景', name: '箱根ターンパイク', category: '絶景ロード' })

    expect(card).toHaveTextContent(/^景\s*箱根ターンパイク\s*神奈川・絶景ロード$/)
  })

  it('AC4: the mark is hidden from screen readers, so the name is the spot name and 「地域・種類」', () => {
    const { card } = renderCard({ mark: '海', name: '銚子ドーバーライン', region: '千葉', category: '海沿い' })

    expect(card).toHaveAccessibleName(/^銚子ドーバーライン\s*千葉・海沿い$/)
    const markElement = screen.getByText('海')
    expect(markElement).toHaveAttribute('aria-hidden', 'true')
  })

  it('AC4: the name has its own element (so it can be cut to one line)', () => {
    renderCard({ name: '首都高（都心環状線）' })

    expect(screen.getByText('首都高（都心環状線）')).toBeInTheDocument()
  })

  it('AC4: shows the check icon when the spot is done', () => {
    const checkIconMarkup = getCheckIconMarkup()

    const { card } = renderCard({ done: true })

    expect(hasCheckIcon(card, checkIconMarkup)).toBe(true)
  })

  it('AC4: shows no check icon when the spot is not done', () => {
    const checkIconMarkup = getCheckIconMarkup()

    const { card } = renderCard({ done: false })

    expect(hasCheckIcon(card, checkIconMarkup)).toBe(false)
  })

  it.each([true, false])('AC4: every icon is aria-hidden and the name does not change with done=%s', (done) => {
    const { card } = renderCard({ done })

    for (const svg of card.querySelectorAll('svg')) {
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    }
    expect(card).toHaveAccessibleName(/^ヤビツ峠\s*神奈川・峠$/)
  })

  it('AC4: pressing the card calls onOpen once', async () => {
    const user = userEvent.setup()
    const { card, onOpen } = renderCard()

    await user.click(card)

    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('AC18: opens from the keyboard', async () => {
    const user = userEvent.setup()
    const { onOpen } = renderCard()

    await user.tab()
    await user.keyboard('{Enter}')

    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('forwards ref to the button (used to return focus to the card)', () => {
    const cardRef = createRef<HTMLButtonElement>()

    renderCard({ ref: cardRef })

    expect(cardRef.current).toBe(screen.getByRole('button'))
  })
})
