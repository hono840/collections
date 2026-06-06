import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HomeHero, type HomeHeroTeam } from './HomeHero'
import { FavoriteTeamProvider } from '@/components/providers/FavoriteTeamProvider'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'

const TEAMS_BY_CODE: Record<string, HomeHeroTeam> = {
  JPN: { code: 'JPN', nameJa: '日本', flagEmoji: '🇯🇵' },
  BRA: { code: 'BRA', nameJa: 'ブラジル', flagEmoji: '🇧🇷' },
}

function renderHero() {
  return render(
    <FavoriteTeamProvider>
      <HomeHero teamsByCode={TEAMS_BY_CODE} />
    </FavoriteTeamProvider>,
  )
}

describe('HomeHero', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('タイトルが表示される', () => {
    renderHero()
    expect(
      screen.getByRole('heading', { name: /ワールドカップ 2026/ }),
    ).toBeInTheDocument()
  })

  it('3分導線（ルール基本・推し国診断）への CTA が表示される', () => {
    renderHero()
    expect(
      screen.getByRole('link', { name: /まず3分でW杯を知ろう/ }),
    ).toHaveAttribute('href', '/rules/soccer-basics')
    expect(
      screen.getByRole('link', { name: /あなたの推し国は？診断/ }),
    ).toHaveAttribute('href', '/diagnosis')
  })

  it('推し国が未設定なら診断を促す', () => {
    renderHero()
    expect(screen.getByText('まだ推し国がありません')).toBeInTheDocument()
  })

  it('推し国が設定済みなら国名と国ページリンクが表示される', async () => {
    localStorage.setItem(
      STORAGE_KEYS.favoriteTeam,
      JSON.stringify('JPN'),
    )
    renderHero()
    // mounted 後に localStorage が反映される
    expect(await screen.findByText('日本')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /日本/ }),
    ).toHaveAttribute('href', '/countries/JPN')
  })
})
