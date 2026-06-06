import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QuizTemplate } from './QuizTemplate'

describe('QuizTemplate', () => {
  it('children が表示される', () => {
    render(
      <QuizTemplate>
        <p>設問</p>
      </QuizTemplate>,
    )
    expect(screen.getByText('設問')).toBeInTheDocument()
  })

  it('progress スロットが表示される', () => {
    render(
      <QuizTemplate progress={<div data-testid="progress-slot" />}>
        本文
      </QuizTemplate>,
    )
    expect(screen.getByTestId('progress-slot')).toBeInTheDocument()
  })

  it('footer スロットが表示される', () => {
    render(
      <QuizTemplate footer={<div data-testid="footer-slot" />}>
        本文
      </QuizTemplate>,
    )
    expect(screen.getByTestId('footer-slot')).toBeInTheDocument()
  })

  it('footer が無い場合は sticky フッターが描画されない', () => {
    const { container } = render(<QuizTemplate>本文</QuizTemplate>)
    expect(container.querySelector('.sticky')).toBeNull()
  })
})
