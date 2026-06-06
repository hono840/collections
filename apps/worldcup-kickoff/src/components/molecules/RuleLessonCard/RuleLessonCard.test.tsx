import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RuleLessonCard } from './RuleLessonCard'

describe('RuleLessonCard', () => {
  it('タイトルと所要時間が表示される', () => {
    render(<RuleLessonCard titleJa="オフサイドを理解する" estimatedMinutes={5} />)
    expect(screen.getByText('オフサイドを理解する')).toBeInTheDocument()
    expect(screen.getByText('約5分')).toBeInTheDocument()
  })

  it('href があればリンクになる', () => {
    render(
      <RuleLessonCard
        titleJa="オフサイドを理解する"
        estimatedMinutes={5}
        href="/rules/offside"
      />,
    )
    const link = screen.getByRole('link', { name: /オフサイドを理解する/ })
    expect(link).toHaveAttribute('href', '/rules/offside')
  })

  it('href が無ければリンクにならない', () => {
    render(<RuleLessonCard titleJa="オフサイド" estimatedMinutes={5} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('completed なら学習済みが表示される', () => {
    render(
      <RuleLessonCard
        titleJa="オフサイド"
        estimatedMinutes={5}
        completed
      />,
    )
    expect(screen.getByText('学習済み')).toBeInTheDocument()
  })

  it('description があれば補足が表示される', () => {
    render(
      <RuleLessonCard
        titleJa="オフサイド"
        estimatedMinutes={5}
        description="初心者がつまずく代表的なルール"
      />,
    )
    expect(
      screen.getByText('初心者がつまずく代表的なルール'),
    ).toBeInTheDocument()
  })
})
