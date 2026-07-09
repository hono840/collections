'use client'
/**
 * SettingsPanel — 原価率アラート閾値 / 税の既定 / シミュ丸め単位 / ライセンス / データ管理 / 法務
 * (design-spec §6.3–6.4 / §8.3). Thresholds are edited locally and only committed when
 * 良好上限 < 注意上限 (mirrors settingsSchema.refine) so an invalid, unreadable-on-reload state is
 * never written. The license section shows the verified status (incl. the grace countdown and the
 * unsupported-browser message) and wires LicenseKeyField → applyLicenseKey. Destructive actions
 * (サンプル削除 / 全消去) require an inline confirm. The BackupPanel is injected via slot.
 */
import { useState } from 'react'
import { Crown, TriangleAlert } from 'lucide-react'
import type { Settings } from '@/lib/domain'
import type { LicenseStatus } from '@/lib/license/verify'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { Icon } from '@/components/atoms/Icon'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Select } from '@/components/atoms/Select'
import { SegmentedControl } from '@/components/atoms/SegmentedControl'
import { HelperText } from '@/components/atoms/HelperText'
import { ThresholdSetting } from '@/components/molecules/ThresholdSetting'
import { LicenseKeyField, type LicenseStatus as FieldStatus } from '@/components/molecules/LicenseKeyField'
import { TrustBadge } from '@/components/molecules/TrustBadge'

export interface SettingsPanelProps {
  settings: Settings
  onChangeSettings: (patch: Partial<Settings>) => void
  license: LicenseStatus
  ed25519Supported: boolean
  onVerifyLicense: (key: string) => Promise<LicenseStatus>
  onClearLicense: () => void
  hasSamples: boolean
  onClearSamples: () => void
  onResetAll: () => void
  backupSlot?: React.ReactNode
  className?: string
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h2 text-ink">{title}</h2>
      {children}
    </section>
  )
}

function ConfirmBlock({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div role="alertdialog" aria-label={confirmLabel} className="rounded-md border border-danger-fg bg-danger-bg p-3">
      <p className="text-body-sm text-danger-fg">{message}</p>
      <div className="mt-2 flex gap-2">
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
    </div>
  )
}

const RATE_OPTIONS = [
  { value: '8', label: '8%' },
  { value: '10', label: '10%' },
]
const ROUNDING_OPTIONS = [
  { value: '1', label: '¥1' },
  { value: '10', label: '¥10' },
  { value: '50', label: '¥50' },
  { value: '100', label: '¥100' },
]

export function SettingsPanel({
  settings,
  onChangeSettings,
  license,
  ed25519Supported,
  onVerifyLicense,
  onClearLicense,
  hasSamples,
  onClearSamples,
  onResetAll,
  backupSlot,
  className,
}: SettingsPanelProps) {
  const [warn, setWarn] = useState(settings.alertWarnThreshold)
  const [danger, setDanger] = useState(settings.alertDangerThreshold)
  // Re-sync the local (editable) thresholds when settings change externally (render-phase).
  const [prevThresholds, setPrevThresholds] = useState({ w: settings.alertWarnThreshold, d: settings.alertDangerThreshold })
  if (prevThresholds.w !== settings.alertWarnThreshold || prevThresholds.d !== settings.alertDangerThreshold) {
    setPrevThresholds({ w: settings.alertWarnThreshold, d: settings.alertDangerThreshold })
    setWarn(settings.alertWarnThreshold)
    setDanger(settings.alertDangerThreshold)
  }

  const [fieldStatus, setFieldStatus] = useState<FieldStatus>('idle')
  const [fieldMessage, setFieldMessage] = useState<string | undefined>()
  const [confirm, setConfirm] = useState<null | 'samples' | 'reset'>(null)

  const unsupported = !ed25519Supported || license.status === 'unsupported'
  const planLabel = license.plan === 'annual' ? '年額' : license.plan === 'monthly' ? '月額' : ''

  async function handleVerify(key: string) {
    if (!ed25519Supported) {
      setFieldStatus('unsupported')
      return
    }
    setFieldStatus('verifying')
    setFieldMessage(undefined)
    const status = await onVerifyLicense(key)
    if (status.status === 'active' || status.status === 'grace') {
      setFieldStatus('success')
    } else if (status.status === 'unsupported') {
      setFieldStatus('unsupported')
    } else if (status.status === 'expired') {
      setFieldStatus('error')
      setFieldMessage('このキーは有効期限が切れています')
    } else {
      setFieldStatus('error')
    }
  }

  return (
    <div className={cn('flex flex-col gap-8 pb-4', className)}>
      <Section title="原価率アラート">
        <ThresholdSetting
          warn={warn}
          danger={danger}
          onChange={({ warn: w, danger: d }) => {
            setWarn(w)
            setDanger(d)
            if (w < d) onChangeSettings({ alertWarnThreshold: w, alertDangerThreshold: d })
          }}
        />
      </Section>

      <Section title="税の既定">
        <div className="flex flex-col gap-2">
          <span className="text-label text-ink-secondary">既定の入力方式</span>
          <SegmentedControl<'in' | 'ex'>
            ariaLabel="既定の入力方式"
            options={[
              { value: 'in', label: '税込' },
              { value: 'ex', label: '税抜' },
            ]}
            value={settings.defaultPriceIncludesTax ? 'in' : 'ex'}
            onChange={(mode) => onChangeSettings({ defaultPriceIncludesTax: mode === 'in' })}
          />
        </div>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-label text-ink-secondary">食材の既定税率</span>
            <Select
              aria-label="食材の既定税率"
              options={RATE_OPTIONS}
              value={String(settings.defaultIngredientTaxRate)}
              onChange={(v) => onChangeSettings({ defaultIngredientTaxRate: Number(v) })}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-label text-ink-secondary">売価の既定税率</span>
            <Select
              aria-label="売価の既定税率"
              options={RATE_OPTIONS}
              value={String(settings.defaultSellTaxRate)}
              onChange={(v) => onChangeSettings({ defaultSellTaxRate: Number(v) })}
            />
          </label>
        </div>
      </Section>

      <Section title="値上げシミュレーション">
        <label className="flex flex-col gap-1.5">
          <span className="text-label text-ink-secondary">推奨売価の丸め単位（切り上げ）</span>
          <Select
            aria-label="推奨売価の丸め単位"
            options={ROUNDING_OPTIONS}
            value={String(settings.simRoundingUnit)}
            onChange={(v) => onChangeSettings({ simRoundingUnit: Number(v) as Settings['simRoundingUnit'] })}
          />
        </label>
      </Section>

      <Section title="Pro / ライセンス">
        {license.isPro ? (
          <div className="rounded-md border border-pro bg-pro-subtle p-3">
            <div className="flex items-center gap-2">
              <Icon icon={Crown} size="sm" className="text-pro-ink" />
              <Badge tone="pro">PRO</Badge>
              <span className="text-h3 text-ink">Pro利用中</span>
            </div>
            <p className="text-body-sm mt-1 text-ink-secondary">
              {planLabel}プラン
              {license.expiresAt && ` ・ 有効期限 ${formatDate(license.expiresAt)}`}
            </p>
            {license.inGrace && license.daysRemaining !== null && (
              <p className="text-body-sm mt-1 inline-flex items-center gap-1 text-caution-fg">
                <Icon icon={TriangleAlert} size="sm" />
                有効期限まであと<span className="font-num tabular-nums">{license.daysRemaining}</span>日。更新してください。
              </p>
            )}
            <Button variant="secondary" className="mt-2" onClick={onClearLicense}>
              ライセンスを解除
            </Button>
          </div>
        ) : (
          <>
            {license.status === 'expired' && (
              <p className="text-body-sm inline-flex items-center gap-1 text-caution-fg">
                <Icon icon={TriangleAlert} size="sm" />
                Proの有効期限が切れました。更新または新しいキーを入力してください。
              </p>
            )}
            {unsupported && (
              <HelperText tone="danger">
                このブラウザではライセンスを確認できません。ブラウザを更新すると解錠できます（キーは保持されます）。
              </HelperText>
            )}
            <p className="text-body-sm text-ink-secondary">購入済みの方は、届いたライセンスキーを入力してください。</p>
            <LicenseKeyField status={fieldStatus} onVerify={handleVerify} message={fieldMessage} />
            <a href="/pricing" className="text-label self-start text-primary-ink underline">
              Proの料金を見る
            </a>
          </>
        )}
      </Section>

      <Section title="データ管理">
        {backupSlot}
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          {hasSamples &&
            (confirm === 'samples' ? (
              <ConfirmBlock
                message="サンプルデータを削除しますか？（自分で作成したデータは残ります）"
                confirmLabel="サンプルを削除"
                onConfirm={() => {
                  onClearSamples()
                  setConfirm(null)
                }}
                onCancel={() => setConfirm(null)}
              />
            ) : (
              <Button variant="secondary" onClick={() => setConfirm('samples')}>
                サンプルデータを削除
              </Button>
            ))}

          {confirm === 'reset' ? (
            <ConfirmBlock
              message="すべてのデータ（食材・メニュー・設定・ライセンス）を消去します。取り消せません。よろしいですか？"
              confirmLabel="全データを消去"
              onConfirm={() => {
                onResetAll()
                setConfirm(null)
              }}
              onCancel={() => setConfirm(null)}
            />
          ) : (
            <Button variant="danger" onClick={() => setConfirm('reset')}>
              全データを消去
            </Button>
          )}
        </div>
      </Section>

      <Section title="情報">
        <TrustBadge variant="full" />
        <ul className="flex flex-col gap-2">
          <li>
            <a href="/pricing" className="text-body-sm text-primary-ink underline">
              料金プラン
            </a>
          </li>
          <li>
            <a href="/faq" className="text-body-sm text-primary-ink underline">
              よくある質問
            </a>
          </li>
          <li>
            <a href="/legal/tokushoho" className="text-body-sm text-primary-ink underline">
              特定商取引法に基づく表記
            </a>
          </li>
          <li>
            <a href="/legal/privacy" className="text-body-sm text-primary-ink underline">
              プライバシーポリシー
            </a>
          </li>
        </ul>
      </Section>
    </div>
  )
}
