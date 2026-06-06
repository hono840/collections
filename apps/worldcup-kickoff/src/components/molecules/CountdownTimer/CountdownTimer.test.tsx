import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { CountdownTimer } from './CountdownTimer'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

describe('CountdownTimer', () => {
  it('マウント後に残り日数を表示する', async () => {
    vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'))
    render(<CountdownTimer target="2026-06-02T02:03:04.000Z" />)
    await flush()
    // 1日 02時間 03分 04秒
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('02')).toBeInTheDocument()
    expect(screen.getByText('03')).toBeInTheDocument()
    expect(screen.getByText('04')).toBeInTheDocument()
  })

  it('単位ラベル（日/時間/分/秒）が表示される', async () => {
    vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'))
    render(<CountdownTimer target="2026-06-02T02:03:04.000Z" />)
    await flush()
    expect(screen.getByText('日')).toBeInTheDocument()
    expect(screen.getByText('時間')).toBeInTheDocument()
    expect(screen.getByText('分')).toBeInTheDocument()
    expect(screen.getByText('秒')).toBeInTheDocument()
  })

  it('目標経過後は completeLabel を表示する', async () => {
    vi.setSystemTime(new Date('2026-07-01T00:00:00.000Z'))
    render(
      <CountdownTimer
        target="2026-06-01T00:00:00.000Z"
        completeLabel="開幕しました"
      />,
    )
    await flush()
    expect(screen.getByText('開幕しました')).toBeInTheDocument()
  })

  it('マウント後にスクリーンリーダー用ラベルが付与される', async () => {
    vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'))
    const { container } = render(
      <CountdownTimer target="2026-06-02T02:03:04.000Z" />,
    )
    await flush()
    const labelled = container.querySelector('[aria-label^="開幕まであと"]')
    expect(labelled).not.toBeNull()
  })

  it('compact では短縮ラベルで表示する', async () => {
    vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'))
    render(<CountdownTimer target="2026-06-02T02:03:04.000Z" compact />)
    await flush()
    expect(screen.getByText('時')).toBeInTheDocument()
  })
})
