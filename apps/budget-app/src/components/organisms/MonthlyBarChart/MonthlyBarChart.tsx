'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/format'

interface MonthlyData {
  label: string
  total: number
}

export interface MonthlyBarChartProps {
  data: MonthlyData[]
}

interface TooltipPayloadItem {
  value: number
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
      <p className="font-semibold text-slate-900 dark:text-zinc-100">
        {label}
      </p>
      <p className="text-slate-600 dark:text-zinc-400">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  )
}

export function MonthlyBarChart({ data }: MonthlyBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500 dark:text-zinc-400">
        データがありません
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--chart-grid)"
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: 'var(--chart-text)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
          tick={{ fontSize: 12, fill: 'var(--chart-text)' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--chart-cursor)' }} />
        <Bar
          dataKey="total"
          fill="var(--color-brand-500, #6366f1)"
          radius={[6, 6, 0, 0]}
          maxBarSize={60}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
