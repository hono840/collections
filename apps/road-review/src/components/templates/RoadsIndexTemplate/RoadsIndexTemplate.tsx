import type { ReactNode } from 'react'

export type RoadsIndexTemplateProps = {
  /** Page actions next to the heading (e.g. the "道を登録" link). */
  actions: ReactNode
  /** Supplementary map. The list always carries the same content (architecture 9.5). */
  map?: ReactNode
  list: ReactNode
}

/**
 * Roads index layout (architecture 2.1 / 9.5, UX 2.3). No data.
 * Reading order: heading -> actions -> list -> map. On md+ the list (2fr) sits left of the map (3fr).
 */
export function RoadsIndexTemplate({ actions, map, list }: RoadsIndexTemplateProps) {
  return (
    <section aria-labelledby="roads-heading">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 id="roads-heading" className="heading-mincho text-2xl text-ink">
          道の一覧
        </h1>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <div className={map ? 'mt-6 grid gap-6 md:grid-cols-5' : 'mt-6'}>
        <div className={map ? 'min-w-0 md:col-span-2' : undefined}>{list}</div>
        {map ? (
          <div className="min-w-0 md:col-span-3">
            <div className="md:sticky md:top-20">{map}</div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
