import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BracketView, type BracketRound } from './BracketView'

const JPN = { flagEmoji: '🇯🇵', nameJa: '日本' }
const BRA = { flagEmoji: '🇧🇷', nameJa: 'ブラジル' }

const ROUNDS: BracketRound[] = [
  {
    stage: 'round16',
    label: 'ラウンド16',
    matches: [
      {
        id: 'wc-090',
        home: JPN,
        away: BRA,
        score: { home: 2, away: 1 },
      },
      {
        id: 'wc-091',
        home: null,
        away: null,
        homePlaceholder: 'A組1位',
        awayPlaceholder: 'B組2位',
        score: null,
      },
    ],
  },
  {
    stage: 'final',
    label: '決勝',
    matches: [
      {
        id: 'wc-104',
        home: null,
        away: null,
        homePlaceholder: '準決勝1の勝者',
        awayPlaceholder: '準決勝2の勝者',
        score: null,
      },
    ],
  },
]

const THIRD: BracketRound = {
  stage: 'third',
  label: '3位決定戦',
  matches: [
    {
      id: 'wc-103',
      home: null,
      away: null,
      homePlaceholder: '準決勝1の敗者',
      awayPlaceholder: '準決勝2の敗者',
      score: null,
    },
  ],
}

describe('BracketView', () => {
  it('確定チームの国名が表示される', () => {
    render(<BracketView rounds={ROUNDS} />)
    expect(screen.getByText('日本')).toBeInTheDocument()
    expect(screen.getByText('ブラジル')).toBeInTheDocument()
  })

  it('未確定枠はプレースホルダ文字列で表示される', () => {
    render(<BracketView rounds={ROUNDS} />)
    expect(screen.getByText('A組1位')).toBeInTheDocument()
    expect(screen.getByText('準決勝1の勝者')).toBeInTheDocument()
  })

  it('ラウンド見出しが描画される', () => {
    render(<BracketView rounds={ROUNDS} />)
    expect(
      screen.getByRole('group', { name: 'ラウンド16' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '決勝' })).toBeInTheDocument()
  })

  it('確定スコアが表示される', () => {
    render(<BracketView rounds={ROUNDS} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('横スクロール領域はキーボードフォーカス可能', () => {
    render(<BracketView rounds={ROUNDS} />)
    const region = screen.getByRole('region', {
      name: '決勝トーナメント表（横スクロールできます）',
    })
    expect(region).toHaveAttribute('tabIndex', '0')
  })

  it('3位決定戦を別枠で表示する', () => {
    render(<BracketView rounds={ROUNDS} thirdPlace={THIRD} />)
    expect(screen.getByText('3位決定戦')).toBeInTheDocument()
    expect(screen.getByText('準決勝1の敗者')).toBeInTheDocument()
  })
})
