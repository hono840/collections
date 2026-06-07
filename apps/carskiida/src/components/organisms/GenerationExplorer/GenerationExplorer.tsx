'use client'

import { useEffect, useState } from 'react'
import { SectionHeading } from '@/components/atoms/SectionHeading'
import { GenerationTimeline } from '@/components/organisms/GenerationTimeline'
import { GradeSpecPanel } from '@/components/organisms/GradeSpecPanel'
import { PartStructureAccordion } from '@/components/organisms/PartStructureAccordion'
import { PlantMap } from '@/components/organisms/PlantMap'
import type { Generation } from '@/types/car'

export interface GenerationExplorerProps {
  generations: Generation[]
  /** URL の ?gen= で指定された初期世代 ID（共有URLからの復元） */
  initialGenId?: string
}

/**
 * 世代エクスプローラー（organism / client）。
 * 世代切替の状態を保持し、選択世代の 諸元・パーツ構造・生産地・ナラティブ を描画する。
 * 全世代データは Server 側から渡されるため、切替で追加フェッチは発生しない（SSG と両立）。
 */
export function GenerationExplorer({
  generations,
  initialGenId,
}: GenerationExplorerProps) {
  const initial =
    (initialGenId && generations.find((g) => g.id === initialGenId)?.id) ||
    generations[0]?.id ||
    ''
  const [activeId, setActiveId] = useState(initial)

  // 共有 URL (?gen=) からの世代復元。SSG を保つためサーバでは読まず、マウント後に同期する。
  useEffect(() => {
    const gen = new URLSearchParams(window.location.search).get('gen')
    if (gen && generations.some((g) => g.id === gen)) {
      setActiveId(gen)
    }
  }, [generations])

  const active =
    generations.find((g) => g.id === activeId) ?? generations[0]

  function handleSelect(id: string) {
    setActiveId(id)
    // URL に世代を反映（共有可能・戻る操作を壊さない簡易同期）
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('gen', id)
      window.history.replaceState(null, '', url.toString())
    }
  }

  if (!active) {
    return (
      <p className="text-sm text-ck-text-muted">世代データは収録準備中です。</p>
    )
  }

  return (
    <div className="space-y-8">
      <GenerationTimeline
        generations={generations}
        activeId={active.id}
        onSelect={handleSelect}
      />

      {!active.isCurated && (
        <p className="rounded-md border border-ck-warn bg-ck-surface px-4 py-3 text-sm text-ck-warn">
          この世代は準備中です。順次データを追加していきます。
        </p>
      )}

      {active.narrativeMd && (
        <section>
          <SectionHeading label="Overview">この世代について</SectionHeading>
          <p className="whitespace-pre-line text-base leading-relaxed text-ck-text">
            {active.narrativeMd}
          </p>
        </section>
      )}

      <section>
        <SectionHeading label="Specifications">諸元</SectionHeading>
        <GradeSpecPanel grades={active.grades} />
      </section>

      <section>
        <SectionHeading label="Parts">パーツ構造</SectionHeading>
        <PartStructureAccordion grades={active.grades} />
      </section>

      <section>
        <SectionHeading label="Production">生産地</SectionHeading>
        <PlantMap production={active.production} />
      </section>
    </div>
  )
}
