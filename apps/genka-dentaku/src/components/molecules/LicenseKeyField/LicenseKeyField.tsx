'use client'
/**
 * LicenseKeyField — key input + 解錠 button + status message (design-spec §4.5 / §8.2). Client.
 * Props-only re: verification: it owns the input text and calls `onVerify(key)`, while the
 * verification lifecycle (`status`) and any override `message` are driven by the parent (which
 * owns the license hook). Success/error/unsupported are shown with an icon (not colour-only).
 */
import { useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { TextInput } from '@/components/atoms/TextInput'
import { Button } from '@/components/atoms/Button'
import { HelperText } from '@/components/atoms/HelperText'
import { Icon } from '@/components/atoms/Icon'

export type LicenseStatus = 'idle' | 'verifying' | 'success' | 'error' | 'unsupported'

export interface LicenseKeyFieldProps {
  status: LicenseStatus
  onVerify: (key: string) => void
  /** Override the default status message. */
  message?: string
  defaultValue?: string
  className?: string
}

const DEFAULT_MESSAGE = {
  success: 'Proを解錠しました',
  error: 'ライセンスキーが正しくありません',
  unsupported: 'このブラウザではライセンスを確認できません',
} as const

export function LicenseKeyField({ status, onVerify, message, defaultValue = '', className }: LicenseKeyFieldProps) {
  const [key, setKey] = useState(defaultValue)
  const verifying = status === 'verifying'
  const trimmed = key.trim()

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <TextInput
            aria-label="ライセンスキー"
            placeholder="GENKA-XXXX-XXXX-XXXX-XXXX"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            error={status === 'error'}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <Button onClick={() => onVerify(trimmed)} loading={verifying} disabled={verifying || trimmed === ''}>
          解錠
        </Button>
      </div>
      {status === 'success' && (
        <p className="text-body-sm inline-flex items-center gap-1 text-good-fg">
          <Icon icon={CircleCheck} size="sm" />
          {message ?? DEFAULT_MESSAGE.success}
        </p>
      )}
      {status === 'error' && <HelperText tone="danger">{message ?? DEFAULT_MESSAGE.error}</HelperText>}
      {status === 'unsupported' && <HelperText tone="danger">{message ?? DEFAULT_MESSAGE.unsupported}</HelperText>}
    </div>
  )
}
