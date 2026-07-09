'use client'
/**
 * BackupPanel — JSON backup export + import (design-spec §6.4 / PRD 4.g — Free). Export triggers a
 * whole-state download; import reads a file, validates it with parseBackup (typed errors, never
 * throws), then requires an explicit 置き換える confirm before replacing the current data. Success
 * reports the restored counts. Wired by the parent: onExport = downloadBackup(state),
 * onImport = importState(state, 'replace').
 */
import { useRef, useState } from 'react'
import { Download, Upload, CircleCheck } from 'lucide-react'
import type { CanonicalState } from '@/lib/domain/schema'
import { parseBackup, type ImportError } from '@/lib/backup/import-json'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/atoms/Button'
import { HelperText } from '@/components/atoms/HelperText'
import { Icon } from '@/components/atoms/Icon'

const ERROR_MESSAGE: Record<ImportError, string> = {
  parse: 'ファイルを読み込めませんでした',
  'not-genka': '原価電卓のバックアップではありません',
  future: '新しいバージョンで作成されたデータです。アプリを更新してください',
  invalid: 'データの形式が正しくありません',
}

export interface BackupPanelProps {
  onExport: () => void
  onImport: (state: CanonicalState) => void
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

export function BackupPanel({ onExport, onImport, className }: BackupPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<ImportError | null>(null)
  const [pending, setPending] = useState<CanonicalState | null>(null)
  const [done, setDone] = useState<{ ingredients: number; menus: number } | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    setError(null)
    setDone(null)
    const text = await readText(file)
    const result = parseBackup(text)
    if (result.ok) {
      setPending(result.state)
    } else {
      setPending(null)
      setError(result.error)
    }
  }

  function confirmReplace() {
    if (!pending) return
    onImport(pending)
    setDone({ ingredients: pending.ingredients.length, menus: pending.menus.length })
    setPending(null)
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div>
        <h3 className="text-h3 text-ink">バックアップ</h3>
        <p className="text-body-sm text-ink-secondary">
          全データ（食材・メニュー・設定・ライセンス）をJSONで保存・復元できます。端末の移行にも使えます。
        </p>
      </div>

      <Button variant="secondary" iconStart={Download} onClick={onExport}>
        JSONバックアップをダウンロード
      </Button>

      <div>
        <input ref={inputRef} type="file" accept="application/json,.json" onChange={handleFile} className="sr-only" aria-hidden tabIndex={-1} />
        <Button variant="secondary" iconStart={Upload} fullWidth onClick={() => inputRef.current?.click()}>
          バックアップから復元
        </Button>
      </div>

      {error && <HelperText tone="danger">{ERROR_MESSAGE[error]}</HelperText>}

      {pending && (
        <div role="alertdialog" aria-label="復元の確認" className="rounded-md border border-border-strong bg-surface-sunken p-3">
          <p className="text-body-sm text-ink">
            現在のデータは置き換えられます。よろしいですか？（食材
            <span className="font-num tabular-nums">{pending.ingredients.length}</span>件・メニュー
            <span className="font-num tabular-nums">{pending.menus.length}</span>件）
          </p>
          <div className="mt-2 flex gap-2">
            <Button variant="danger" onClick={confirmReplace}>
              置き換える
            </Button>
            <Button variant="secondary" onClick={() => setPending(null)}>
              キャンセル
            </Button>
          </div>
        </div>
      )}

      {done && (
        <p className="text-body-sm inline-flex items-center gap-1 text-good-fg">
          <Icon icon={CircleCheck} size="sm" />
          復元しました（食材
          <span className="font-num tabular-nums">{done.ingredients}</span>件・メニュー
          <span className="font-num tabular-nums">{done.menus}</span>件）
        </p>
      )}
    </div>
  )
}
