'use client'
/**
 * DataRecoveryDialog — the blocking recovery gate for corrupt / future-version storage
 * (architecture §4.3 / PRD 8.8). It is a non-dismissible modal (no ESC / backdrop / close) so the
 * app cannot mutate or overwrite the raw payload until the user resolves it. Order per §4.3:
 * download the raw data (quarantined to :backup first), THEN reset from empty or restore from a JSON
 * backup. Never a white screen; never a silent overwrite.
 */
import { useRef, useState } from 'react'
import { TriangleAlert, FileWarning, Download, Upload } from 'lucide-react'
import type { CanonicalState } from '@/lib/domain/schema'
import { parseBackup, type ImportError } from '@/lib/backup/import-json'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/atoms/Button'
import { Icon } from '@/components/atoms/Icon'
import { HelperText } from '@/components/atoms/HelperText'
import { Sheet } from '@/components/organisms/Sheet'

const ERROR_MESSAGE: Record<ImportError, string> = {
  parse: 'ファイルを読み込めませんでした',
  'not-genka': '原価電卓のバックアップではありません',
  future: '新しいバージョンで作成されたデータです',
  invalid: 'データの形式が正しくありません',
}

const TITLE = { corrupt: '保存データを読み込めませんでした', future: '新しいバージョンのデータです' } as const
const DESC = {
  corrupt: 'このブラウザに保存されたデータを読み込めませんでした。上書きする前に、まず生データをダウンロードして保全できます。',
  future: 'このデータは新しいバージョンの原価電卓で作成されています。データ破損を防ぐため読み込みを保留しました。',
} as const

export interface DataRecoveryDialogProps {
  open: boolean
  issue: 'corrupt' | 'future'
  /** Quarantine + download the raw payload, then start empty. */
  onDownloadReset: () => void
  /** Reset to empty (raw stays quarantined in :backup). */
  onReset: () => void
  /** Restore from a validated JSON backup. */
  onRestore: (state: CanonicalState) => void
  className?: string
}

function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export function DataRecoveryDialog({ open, issue, onDownloadReset, onReset, onRestore, className }: DataRecoveryDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<ImportError | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    const text = await readText(file)
    const result = parseBackup(text)
    if (result.ok) onRestore(result.state)
    else setError(result.error)
  }

  return (
    <Sheet open={open} onClose={() => {}} title={TITLE[issue]} variant="dialog" dismissible={false} className={className}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2">
          <Icon
            icon={issue === 'future' ? FileWarning : TriangleAlert}
            size="md"
            className={issue === 'future' ? 'text-caution-fg' : 'text-danger-fg'}
          />
          <p className="text-body-sm text-ink-secondary">{DESC[issue]}</p>
        </div>

        <div className="flex flex-col gap-2">
          <Button iconStart={Download} onClick={onDownloadReset}>
            データをダウンロードして初期化
          </Button>
          <div>
            <input ref={inputRef} type="file" accept="application/json,.json" onChange={handleFile} className="sr-only" aria-hidden tabIndex={-1} />
            <Button variant="secondary" fullWidth iconStart={Upload} onClick={() => inputRef.current?.click()}>
              バックアップから復元
            </Button>
          </div>
          {error && <HelperText tone="danger">{ERROR_MESSAGE[error]}</HelperText>}
          <Button variant="ghost" onClick={onReset} className={cn('text-danger-fg')}>
            ダウンロードせずに初期化
          </Button>
        </div>

        <p className="text-caption text-ink-muted">初期化しても、元のデータは端末内の退避先に保全されます。</p>
      </div>
    </Sheet>
  )
}
