import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEFAULT_STATE } from '@/lib/storage/canonical-store'
import { serializeBackup } from '@/lib/backup/export-json'
import { DataRecoveryDialog } from './DataRecoveryDialog'

describe('DataRecoveryDialog', () => {
  it('is a blocking modal (no close) and offers download-reset for corrupt data', async () => {
    const onDownloadReset = vi.fn()
    render(
      <DataRecoveryDialog open issue="corrupt" onDownloadReset={onDownloadReset} onReset={() => {}} onRestore={() => {}} />,
    )
    expect(screen.getByRole('heading', { name: '保存データを読み込めませんでした' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '閉じる' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'データをダウンロードして初期化' }))
    expect(onDownloadReset).toHaveBeenCalledOnce()
  })

  it('restores from a valid JSON backup', async () => {
    const onRestore = vi.fn()
    const { container } = render(
      <DataRecoveryDialog open issue="future" onDownloadReset={() => {}} onReset={() => {}} onRestore={onRestore} />,
    )
    expect(screen.getByRole('heading', { name: '新しいバージョンのデータです' })).toBeInTheDocument()

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File([serializeBackup(DEFAULT_STATE)], 'backup.json', { type: 'application/json' })
    await userEvent.upload(input, file)
    expect(onRestore).toHaveBeenCalledOnce()
  })
})
