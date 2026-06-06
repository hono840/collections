'use client'

import { useState } from 'react'
import { LayoutGrid, ListOrdered } from 'lucide-react'
import { SegmentedControl } from '@/components/atoms/SegmentedControl'

type View = 'list' | 'standings'

export interface CountriesViewProps {
  /** グループ別の国一覧（Server で描画したノード） */
  list: React.ReactNode
  /** 全グループ順位表（Server で描画したノード） */
  standings: React.ReactNode
}

/**
 * 国図鑑の表示切替（国を見る / 順位表）。
 * データ取得・描画は Server（page）側で済ませ、ここは表示するノードを
 * タブで出し分けるだけの薄い Client ラッパ。
 */
export function CountriesView({ list, standings }: CountriesViewProps) {
  const [view, setView] = useState<View>('list')

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl<View>
        ariaLabel="表示の切り替え"
        fullWidth
        value={view}
        onChange={setView}
        options={[
          { value: 'list', label: '国を見る', icon: <LayoutGrid className="h-4 w-4" /> },
          {
            value: 'standings',
            label: '順位表',
            icon: <ListOrdered className="h-4 w-4" />,
          },
        ]}
      />
      <div hidden={view !== 'list'}>{list}</div>
      <div hidden={view !== 'standings'}>{standings}</div>
    </div>
  )
}
