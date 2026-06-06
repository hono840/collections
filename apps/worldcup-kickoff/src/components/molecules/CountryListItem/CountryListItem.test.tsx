import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CountryListItem } from './CountryListItem'

describe('CountryListItem', () => {
  it('国名とグループラベルが表示される', () => {
    render(
      <CountryListItem flagEmoji="🇯🇵" nameJa="日本" groupLabel="グループA" />,
    )
    expect(screen.getByText('日本')).toBeInTheDocument()
    expect(screen.getByText('グループA')).toBeInTheDocument()
  })

  it('tier に応じたバッジが表示される', () => {
    render(
      <CountryListItem
        flagEmoji="🇧🇷"
        nameJa="ブラジル"
        groupLabel="グループB"
        tier="favorite"
      />,
    )
    expect(screen.getByText('優勝候補')).toBeInTheDocument()
  })

  it('href があれば行全体がリンクになる', () => {
    render(
      <CountryListItem
        flagEmoji="🇯🇵"
        nameJa="日本"
        groupLabel="グループA"
        href="/countries/JPN"
      />,
    )
    const link = screen.getByRole('link', { name: /日本/ })
    expect(link).toHaveAttribute('href', '/countries/JPN')
  })

  it('href が無ければリンクにならない', () => {
    render(
      <CountryListItem flagEmoji="🇯🇵" nameJa="日本" groupLabel="グループA" />,
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('trailing スロットが描画される', () => {
    render(
      <CountryListItem
        flagEmoji="🇯🇵"
        nameJa="日本"
        groupLabel="グループA"
        trailing={<span>★</span>}
      />,
    )
    expect(screen.getByText('★')).toBeInTheDocument()
  })
})
