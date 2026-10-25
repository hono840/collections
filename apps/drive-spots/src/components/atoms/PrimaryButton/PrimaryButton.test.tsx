import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PrimaryButton } from './PrimaryButton'

const TONES = ['accent', 'done', 'outline'] as const

describe('PrimaryButton', () => {
  it.each(TONES)('AC18: the %s button is a real <button type="button"> named by its text', (tone) => {
    render(
      <PrimaryButton tone={tone} onClick={vi.fn()}>
        保存する
      </PrimaryButton>,
    )

    const button = screen.getByRole('button', { name: '保存する' })
    expect(button).toBeInstanceOf(HTMLButtonElement)
    expect(button).toHaveAttribute('type', 'button')
  })

  it('calls onClick once per press', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <PrimaryButton tone="done" onClick={onClick}>
        行った！にする
      </PrimaryButton>,
    )

    await user.click(screen.getByRole('button', { name: '行った！にする' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('AC18: works from the keyboard', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <PrimaryButton tone="outline" onClick={onClick}>
        「行きたい」に戻す
      </PrimaryButton>,
    )

    await user.tab()
    await user.keyboard('{Enter}')

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('a decorative icon child sits left of the text and is not part of the name', () => {
    render(
      <PrimaryButton tone="done" onClick={vi.fn()}>
        <svg aria-hidden="true" data-icon="check" />
        行った！にする
      </PrimaryButton>,
    )

    const button = screen.getByRole('button', { name: '行った！にする' })
    expect(button.firstChild).toBeInstanceOf(SVGSVGElement)
  })

  it('each tone looks different', () => {
    const toneClassNames = TONES.map((tone) => {
      const { unmount } = render(
        <PrimaryButton tone={tone} onClick={vi.fn()}>
          {tone}
        </PrimaryButton>,
      )
      const className = screen.getByRole('button', { name: tone }).className
      unmount()
      return className
    })

    expect(new Set(toneClassNames).size).toBe(TONES.length)
  })
})
