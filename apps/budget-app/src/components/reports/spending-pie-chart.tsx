'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils/format'

interface CategorySpending {
  categoryId: string
  categoryName: string
  categoryColor: string
  total: number
}

interface SpendingPieChartProps {
  data: CategorySpending[]
}

interface TooltipPayloadItem {
  payload: CategorySpending & { percent: number }
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
}) {
  if (!active || !payload || payload.length === 0) return null

  const item = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
      <p className="font-semibold text-slate-900 dark:text-zinc-100">
        {item.categoryName}
      </p>
      <p className="text-slate-600 dark:text-zinc-400">
        {formatCurrency(item.total)}
      </p>
      <p className="text-xs text-slate-500 dark:text-zinc-500">
        {item.percent.toFixed(1)}%
      </p>
    </div>
  )
}

export function SpendingPieChart({ data }: SpendingPieChartProps) {
  const totalSpending = data.reduce((sum, item) => sum + item.total, 0)

  // Add percent to each item
  const chartData = data.map((item) => ({
    ...item,
    percent: totalSpending > 0 ? (item.total / totalSpending) * 100 : 0,
  }))

  if (data.length === 0 || totalSpending === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500 dark:text-zinc-400">
        データがありません
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="total"
            nameKey="categoryName"
          >
            {chartData.map((item) => (
              <Cell key={item.categoryId} fill={item.categoryColor} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {chartData.map((item) => (
          <div key={item.categoryId} className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: item.categoryColor }}
            />
            <span className="text-xs text-slate-600 dark:text-zinc-400">
              {item.categoryName}
            </span>
            <span className="text-xs font-medium tabular-nums text-slate-900 dark:text-zinc-100">
              {formatCurrency(item.total)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
