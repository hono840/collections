'use client'
/**
 * ExportPanel — CSV / PDF 出力（PRD 4.f・Pro限定 / design-spec §6.4・§7）。設定＞データ管理に置き、
 * JSONバックアップ（BackupPanel・Free）とは目的が異なる加工・提出用の出力をまとめる。
 *
 * ゲートの判定は呼び出し側（AppRoot の useLicense().gate(...)）が持ち、本コンポーネントは isPro に応じて
 * 「Pro: ハンドラ実行 / Free: ロック＋押下で UpgradeGateBanner をインライン表示」を描画するだけ。
 * バナー状態は親が所有（gateReason）し、アクション位置にインラインで出す（全画面ブロックにしない・§7）。
 */
import type { LucideIcon } from 'lucide-react'
import { FileDown, Printer, Lock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { HelperText } from '@/components/atoms/HelperText'
import { UpgradeGateBanner } from '@/components/organisms/UpgradeGateBanner'

export type ExportGateReason = 'export-csv' | 'export-pdf'

export interface ExportPanelProps {
  isPro: boolean
  /** Whether there is anything to export (menus or ingredients). Only gates Pro users. */
  hasData: boolean
  onExportMenusCsv: () => void
  onExportIngredientsCsv: () => void
  onExportBreakdownCsv: () => void
  onPrintMenus: () => void
  /** Parent-owned inline gate (set when a Free user clicks a locked control). */
  gateReason: ExportGateReason | null
  onRequireUpgrade: (reason: ExportGateReason) => void
  onDismissGate: () => void
  className?: string
}

function ExportButton({
  label,
  icon,
  locked,
  disabled,
  onClick,
}: {
  label: string
  icon: LucideIcon
  locked: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <Button variant="secondary" fullWidth iconStart={locked ? Lock : icon} disabled={disabled} onClick={onClick}>
      {label}
    </Button>
  )
}

export function ExportPanel({
  isPro,
  hasData,
  onExportMenusCsv,
  onExportIngredientsCsv,
  onExportBreakdownCsv,
  onPrintMenus,
  gateReason,
  onRequireUpgrade,
  onDismissGate,
  className,
}: ExportPanelProps) {
  // Free: any control is locked → open the upsell. Pro: run the action (disabled only when empty).
  const csvHandler = (run: () => void) => () => (isPro ? run() : onRequireUpgrade('export-csv'))
  const pdfHandler = () => (isPro ? onPrintMenus() : onRequireUpgrade('export-pdf'))
  const disabled = isPro && !hasData

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-h3 text-ink">エクスポート（CSV・PDF）</h3>
          {!isPro && <Badge tone="pro">PRO</Badge>}
        </div>
        <p className="text-body-sm text-ink-secondary">
          メニュー・食材・原価計算書をExcelでそのまま開けるCSVに出力、またはメニュー表を印刷（PDF）できます。
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <ExportButton label="メニュー一覧CSV" icon={FileDown} locked={!isPro} disabled={disabled} onClick={csvHandler(onExportMenusCsv)} />
        <ExportButton label="食材マスタCSV" icon={FileDown} locked={!isPro} disabled={disabled} onClick={csvHandler(onExportIngredientsCsv)} />
        <ExportButton label="原価明細CSV" icon={FileDown} locked={!isPro} disabled={disabled} onClick={csvHandler(onExportBreakdownCsv)} />
        <ExportButton label="メニュー表を印刷（PDF）" icon={Printer} locked={!isPro} disabled={disabled} onClick={pdfHandler} />
      </div>

      {isPro && !hasData && (
        <HelperText>出力できるデータがありません。メニューや食材を登録してください。</HelperText>
      )}

      {gateReason && <UpgradeGateBanner reason={gateReason} onDismiss={onDismissGate} />}
    </div>
  )
}
