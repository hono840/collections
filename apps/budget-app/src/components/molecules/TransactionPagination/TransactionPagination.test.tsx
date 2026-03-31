import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TransactionPagination } from './TransactionPagination'

const mockPush = vi.fn()
const mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}))

describe('TransactionPagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('件数の表示が正しい', () => {
    render(
      <TransactionPagination currentPage={1} totalPages={3} totalCount={120} />
    )
    expect(screen.getByText(/全120件中/)).toBeInTheDocument()
    expect(screen.getByText(/1~50件を表示/)).toBeInTheDocument()
  })

  it('2ページ目の件数表示が正しい', () => {
    render(
      <TransactionPagination currentPage={2} totalPages={3} totalCount={120} />
    )
    expect(screen.getByText(/51~100件を表示/)).toBeInTheDocument()
  })

  it('最終ページでは totalCount が上限になる', () => {
    render(
      <TransactionPagination currentPage={3} totalPages={3} totalCount={120} />
    )
    expect(screen.getByText(/101~120件を表示/)).toBeInTheDocument()
  })

  it('1ページ目では「前のページ」ボタンが無効', () => {
    render(
      <TransactionPagination currentPage={1} totalPages={3} totalCount={120} />
    )
    expect(screen.getByLabelText('前のページ')).toBeDisabled()
  })

  it('最終ページでは「次のページ」ボタンが無効', () => {
    render(
      <TransactionPagination currentPage={3} totalPages={3} totalCount={120} />
    )
    expect(screen.getByLabelText('次のページ')).toBeDisabled()
  })

  it('「次のページ」をクリックすると次のページに遷移する', async () => {
    const user = userEvent.setup()
    render(
      <TransactionPagination currentPage={1} totalPages={3} totalCount={120} />
    )
    await user.click(screen.getByLabelText('次のページ'))
    expect(mockPush).toHaveBeenCalledWith('/transactions?page=2')
  })

  it('「前のページ」をクリックすると前のページに遷移する', async () => {
    const user = userEvent.setup()
    render(
      <TransactionPagination currentPage={3} totalPages={3} totalCount={120} />
    )
    await user.click(screen.getByLabelText('前のページ'))
    expect(mockPush).toHaveBeenCalledWith('/transactions?page=2')
  })

  it('ページ番号ボタンが表示される', () => {
    render(
      <TransactionPagination currentPage={1} totalPages={3} totalCount={120} />
    )
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('現在のページボタンにアクティブスタイルが適用される', () => {
    render(
      <TransactionPagination currentPage={2} totalPages={3} totalCount={120} />
    )
    const page2Btn = screen.getByText('2')
    expect(page2Btn.className).toContain('border-brand-500')
  })
})
