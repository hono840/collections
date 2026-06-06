import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShareButton } from './ShareButton'

/** navigator.clipboard は getter-only のため defineProperty で差し込む */
function stubClipboard(writeText: () => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  })
}

describe('ShareButton', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    // navigator.share / clipboard をテスト間で持ち越さない
    Reflect.deleteProperty(navigator, 'share')
    Reflect.deleteProperty(navigator, 'clipboard')
  })

  it('ラベルが表示される', () => {
    render(<ShareButton text="診断結果はブラジル！" label="結果をシェア" />)
    expect(
      screen.getByRole('button', { name: /結果をシェア/ }),
    ).toBeInTheDocument()
  })

  it('Web Share API があればクリックで navigator.share が呼ばれる', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { share: shareMock })

    const user = userEvent.setup()
    render(
      <ShareButton
        text="診断結果はブラジル！"
        title="推し国診断"
        url="https://example.com"
      />,
    )
    await user.click(screen.getByRole('button'))
    expect(shareMock).toHaveBeenCalledTimes(1)
    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '推し国診断',
        text: '診断結果はブラジル！',
        url: 'https://example.com',
      }),
    )
  })

  it('Web Share API が無ければクリップボードにコピーする', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    // userEvent.setup() は自前の clipboard を仕込むため、その後に上書きする
    const user = userEvent.setup()
    stubClipboard(writeText)
    render(<ShareButton text="診断結果はブラジル！" url="https://example.com" />)
    await user.click(screen.getByRole('button'))

    expect(writeText).toHaveBeenCalledWith(
      '診断結果はブラジル！\nhttps://example.com',
    )
  })

  it('コピー成功時に「コピーしました」が表示される', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    stubClipboard(writeText)
    render(<ShareButton text="診断結果はブラジル！" />)
    await user.click(screen.getByRole('button'))

    expect(await screen.findByText('コピーしました')).toBeInTheDocument()
  })
})
