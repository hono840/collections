import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RuleLessonViewer } from './RuleLessonViewer'
import type { RuleBlock } from '@/lib/domain'

const blocks: RuleBlock[] = [
  { type: 'heading', text: 'オフサイドとは' },
  { type: 'paragraph', text: '攻撃側の選手が…という反則です。' },
  { type: 'list', items: ['条件1', '条件2'] },
  { type: 'callout', tone: 'tip', text: '迷ったらここを見よう' },
]

describe('RuleLessonViewer', () => {
  it('タイトルと所要時間を表示する', () => {
    render(
      <RuleLessonViewer
        titleJa="オフサイド入門"
        estimatedMinutes={5}
        bodyBlocks={blocks}
        interactive={null}
      />,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'オフサイド入門' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/約5分/)).toBeInTheDocument()
  })

  it('各種ブロック（見出し/段落/リスト/コールアウト）を描画する', () => {
    render(
      <RuleLessonViewer
        titleJa="テスト"
        estimatedMinutes={3}
        bodyBlocks={blocks}
        interactive={null}
      />,
    )
    expect(
      screen.getByRole('heading', { level: 2, name: 'オフサイドとは' }),
    ).toBeInTheDocument()
    expect(screen.getByText('攻撃側の選手が…という反則です。')).toBeInTheDocument()
    expect(screen.getByText('条件1')).toBeInTheDocument()
    expect(screen.getByText('迷ったらここを見よう')).toBeInTheDocument()
  })

  it('interactive が offside-sim のとき体験セクションを埋め込む', () => {
    render(
      <RuleLessonViewer
        titleJa="オフサイド"
        estimatedMinutes={5}
        bodyBlocks={blocks}
        interactive="offside-sim"
      />,
    )
    expect(screen.getByText('やってみよう：オフサイド体験')).toBeInTheDocument()
    expect(
      screen.getByRole('slider', { name: '攻撃側の選手の位置' }),
    ).toBeInTheDocument()
  })

  it('関連用語を用語じてんへのリンクとして列挙する', () => {
    render(
      <RuleLessonViewer
        titleJa="オフサイド"
        estimatedMinutes={5}
        bodyBlocks={blocks}
        interactive={null}
        relatedTerms={[{ slug: 'offside', termJa: 'オフサイド' }]}
      />,
    )
    const link = screen.getByRole('link', { name: /オフサイド/ })
    expect(link).toHaveAttribute('href', '/glossary#offside')
  })
})
