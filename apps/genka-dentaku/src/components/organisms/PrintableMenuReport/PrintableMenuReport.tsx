/**
 * PrintableMenuReport — 印刷用のメニュー原価率レポート（PRD 4.f #1 / design-spec §6.5）。
 * 画面上は非表示（`hidden`）で、印刷時のみ表示する（`print:block`）純プレゼンテーション。
 * AppRoot が AppShell の外側に置き、印刷時はアプリのクロムを隠して本レポートだけを出す。
 * 信号は色に依存せず必ずラベル（良好/注意/危険/要確認）を併記する（印刷＝白黒想定・§6.5）。
 */
import type { MenuSummary } from '@/lib/domain'
import { roundYen } from '@/lib/domain'
import { formatYen, formatPercent1, formatDate } from '@/lib/utils/format'
import { SITE_NAME } from '@/lib/site'
import { cn } from '@/lib/utils/cn'
import { SEMAPHORE } from '@/components/atoms/StatusDot/semaphore'

export interface PrintableMenuReportProps {
  summaries: MenuSummary[]
  /** 出力日（テスト用に注入可能）。 */
  generatedAt?: Date
  className?: string
}

const DASH = '—'

export function PrintableMenuReport({ summaries, generatedAt = new Date(), className }: PrintableMenuReportProps) {
  return (
    <div
      data-print-root
      role="document"
      aria-label="メニュー原価率レポート"
      className={cn('hidden bg-white p-8 text-ink print:block', className)}
    >
      <header className="mb-6 flex items-baseline justify-between border-b border-ink pb-3">
        <h1 className="text-h1 font-bold">{SITE_NAME} — メニュー原価率レポート</h1>
        <p className="text-body-sm">出力日: {formatDate(generatedAt)}</p>
      </header>

      {summaries.length === 0 ? (
        <p className="text-body-sm">出力できるメニューがありません。メニューを登録してください。</p>
      ) : (
        <table className="w-full border-collapse text-body-sm">
          <thead>
            <tr className="border-b border-ink text-left">
              <th className="py-2 pr-3 font-bold">メニュー</th>
              <th className="py-2 pr-3 text-right font-bold">売価(税込)</th>
              <th className="py-2 pr-3 text-right font-bold">原価(税抜)</th>
              <th className="py-2 pr-3 text-right font-bold">原価率</th>
              <th className="py-2 pr-3 text-right font-bold">粗利(税抜)</th>
              <th className="py-2 font-bold">状態</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <tr key={s.menu.id} className="border-b border-border-strong">
                <td className="py-2 pr-3">{s.menu.name}</td>
                <td className="py-2 pr-3 text-right font-num tabular-nums">
                  {s.sellIncTax === null ? DASH : formatYen(roundYen(s.sellIncTax))}
                </td>
                <td className="py-2 pr-3 text-right font-num tabular-nums">
                  {s.costYen === null ? DASH : formatYen(s.costYen)}
                </td>
                <td className="py-2 pr-3 text-right font-num tabular-nums">
                  {s.ratePercent1 === null ? DASH : formatPercent1(s.ratePercent1)}
                </td>
                <td className="py-2 pr-3 text-right font-num tabular-nums">
                  {s.marginExTax === null ? DASH : formatYen(roundYen(s.marginExTax))}
                </td>
                <td className="py-2">{SEMAPHORE[s.status].label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <footer className="mt-6 text-caption text-ink-secondary">
        原価率は税抜原価 ÷ 税抜売価で算出。信号（良好／注意／危険）は色に依存せずラベルで表記しています。
      </footer>
    </div>
  )
}
