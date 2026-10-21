import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEFAULT_STATE } from '@/lib/storage/canonical-store'
import { serializeBackup } from '@/lib/backup/export-json'
import { BackupPanel } from './BackupPanel'

function backupFile(json: string): File {
  return new File([json], 'genka-dentaku-backup.json', { type: 'application/json' })
}

describe('BackupPanel', () => {
  it('fires the export callback', async () => {
    const onExport = vi.fn()
    render(<BackupPanel onExport={onExport} onImport={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'JSONバックアップをダウンロード' }))
    expect(onExport).toHaveBeenCalledOnce()
  })

  it('requires a replace confirm before importing a valid backup, then reports counts', async () => {
    const onImport = vi.fn()
    const { container } = render(<BackupPanel onExport={() => {}} onImport={onImport} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement

    const state = { ...DEFAULT_STATE, ingredients: [...DEFAULT_STATE.ingredients] }
    await userEvent.upload(input, backupFile(serializeBackup(state)))

    // Confirmation (after the async file read), not an immediate import.
    expect(onImport).not.toHaveBeenCalled()
    expect(await screen.findByRole('alertdialog', { name: '復元の確認' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '置き換える' }))
    expect(onImport).toHaveBeenCalledOnce()
    expect(screen.getByText(/復元しました/)).toBeInTheDocument()
  })

  it('shows a typed error for a foreign file', async () => {
    const { container } = render(<BackupPanel onExport={() => {}} onImport={() => {}} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, backupFile(JSON.stringify({ app: 'other-app', state: {} })))
    expect(await screen.findByText('原価電卓のバックアップではありません')).toBeInTheDocument()
  })
})
