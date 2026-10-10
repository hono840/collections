import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({ onAcknowledge: vi.fn() }))

import { SafetyNoticeDialog } from './SafetyNoticeDialog'

const BODY_M04 =
  '運転中は操作しないでください。記録は安全な場所に停車してから、またはドライブの後に行ってください。このアプリは速度やタイムを扱わず、法律の範囲内でドライブ・ツーリングを楽しむための記録帳です。'
const BODY_M05 =
  '道の情報（通行止めや施設など）は、あなた自身が確認して残す記録で、公式情報ではありません。'

beforeAll(() => {
  // jsdom has no showModal/close; emulate them so a native <dialog> implementation also works.
  const prototype = HTMLDialogElement.prototype as HTMLDialogElement & {
    showModal?: () => void
    close?: () => void
  }
  if (typeof prototype.showModal !== 'function') {
    prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
  }
  if (typeof prototype.close !== 'function') {
    prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open')
    }
  }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('SafetyNoticeDialog (first-run safety notice, US-08 / PRD US-13)', () => {
  it('is shown as a modal dialog on first run (not yet acknowledged)', () => {
    render(<SafetyNoticeDialog acknowledged={false} onAcknowledge={mocks.onAcknowledge} />)
    const dialog = screen.getByRole('dialog', { name: 'はじめに' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByText(BODY_M04)).toBeInTheDocument()
    expect(within(dialog).getByText(BODY_M05)).toBeInTheDocument()
  })

  it('is not shown when already acknowledged', () => {
    render(<SafetyNoticeDialog acknowledged onAcknowledge={mocks.onAcknowledge} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText(BODY_M04)).not.toBeInTheDocument()
  })

  it('has exactly one button, "確認しました" (no × button)', () => {
    render(<SafetyNoticeDialog acknowledged={false} onAcknowledge={mocks.onAcknowledge} />)
    const buttons = within(screen.getByRole('dialog')).getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAccessibleName('確認しました')
  })

  it('puts initial focus on the heading', async () => {
    render(<SafetyNoticeDialog acknowledged={false} onAcknowledge={mocks.onAcknowledge} />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'はじめに' })).toHaveFocus()
    })
  })

  it('does not close on Escape', async () => {
    const user = userEvent.setup()
    render(<SafetyNoticeDialog acknowledged={false} onAcknowledge={mocks.onAcknowledge} />)
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'はじめに' })).toBeInTheDocument()
    expect(mocks.onAcknowledge).not.toHaveBeenCalled()
  })

  it('"確認しました" calls onAcknowledge and closes on success', async () => {
    const user = userEvent.setup()
    mocks.onAcknowledge.mockResolvedValue({ ok: true, data: undefined })
    render(<SafetyNoticeDialog acknowledged={false} onAcknowledge={mocks.onAcknowledge} />)

    await user.click(screen.getByRole('button', { name: '確認しました' }))

    expect(mocks.onAcknowledge).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('blocks double submission while saving', async () => {
    const user = userEvent.setup()
    mocks.onAcknowledge.mockReturnValue(new Promise(() => {}))
    render(<SafetyNoticeDialog acknowledged={false} onAcknowledge={mocks.onAcknowledge} />)

    const button = screen.getByRole('button', { name: '確認しました' })
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /確認しました|保存中/ })).toBeDisabled()
    })
    await user.click(screen.getByRole('button', { name: /確認しました|保存中/ }))
    expect(mocks.onAcknowledge).toHaveBeenCalledTimes(1)
  })

  it('stays open and shows the M-31 message when saving fails', async () => {
    const user = userEvent.setup()
    mocks.onAcknowledge.mockResolvedValue({
      ok: false,
      error: { code: 'unexpected', message: '保存できませんでした。もう一度お試しください。' },
    })
    render(<SafetyNoticeDialog acknowledged={false} onAcknowledge={mocks.onAcknowledge} />)

    await user.click(screen.getByRole('button', { name: '確認しました' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '保存できませんでした。もう一度お試しください。',
    )
    expect(screen.getByRole('dialog', { name: 'はじめに' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '確認しました' })).toBeEnabled()
  })

  it.each([
    ['an error result without a message', () => mocks.onAcknowledge.mockResolvedValue({ ok: false, error: { code: 'unexpected', message: '' } })],
    ['a rejection', () => mocks.onAcknowledge.mockRejectedValue(new Error('IndexedDB unavailable'))],
  ])('falls back to the M-31 message for %s and keeps the notice open', async (_label, arrange) => {
    const user = userEvent.setup()
    arrange()
    render(<SafetyNoticeDialog acknowledged={false} onAcknowledge={mocks.onAcknowledge} />)

    await user.click(screen.getByRole('button', { name: '確認しました' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('保存できませんでした。もう一度お試しください。')
    expect(screen.queryByText('IndexedDB unavailable')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'はじめに' })).toBeInTheDocument()
  })

  // R-3: while saving, the button is disabled and browsers drop its focus, so
  // after a failure focus must be put back on "確認しました" explicitly.
  // fireEvent.click is used on purpose: it does not move focus, so the test
  // cannot pass just because the click focused the button.
  it.each([
    [
      'onAcknowledge resolves to an error',
      () =>
        mocks.onAcknowledge.mockResolvedValue({
          ok: false,
          error: { code: 'unexpected', message: '保存できませんでした。もう一度お試しください。' },
        }),
    ],
    ['onAcknowledge rejects', () => mocks.onAcknowledge.mockRejectedValue(new Error('network'))],
  ])('moves focus back to "確認しました" when %s', async (_label, arrange) => {
    arrange()
    render(<SafetyNoticeDialog acknowledged={false} onAcknowledge={mocks.onAcknowledge} />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'はじめに' })).toHaveFocus()
    })

    fireEvent.click(screen.getByRole('button', { name: '確認しました' }))

    await screen.findByRole('alert')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '確認しました' })).toHaveFocus()
    })
  })
})
