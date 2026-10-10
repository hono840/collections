import type { ReactNode } from 'react'

export type RoadDetailTemplateProps = {
  /** id of the heading inside `header` that names the article. */
  labelledBy?: string
  header: ReactNode
  /** e.g. the 林道 note (M-08). */
  notice?: ReactNode
  /** 評価のまとめ (only when there are drives). */
  ratings?: ReactNode
  roadInfo: ReactNode
  /** Pin text / small map. */
  pins?: ReactNode
  drives: ReactNode
  /** e.g. the "走行記録を追加" link. */
  actions?: ReactNode
  dangerZone?: ReactNode
}

/**
 * Road detail layout (architecture 2.1; UX 2.3 S-06). No data, no text of its own.
 * DOM / 1-column order: header -> notice -> ratings -> roadInfo -> pins -> drives -> actions -> dangerZone.
 * md+: left column (7fr) ratings / drives / actions, right column (5fr) roadInfo / pins
 * (grid placement in globals.css `.rr-road-detail-body`, so the reading order stays the DOM order).
 */
export function RoadDetailTemplate({
  labelledBy,
  header,
  notice,
  ratings,
  roadInfo,
  pins,
  drives,
  actions,
  dangerZone,
}: RoadDetailTemplateProps) {
  return (
    <article aria-labelledby={labelledBy} className="mx-auto w-full max-w-300 space-y-6">
      <div>{header}</div>
      {notice ? <div>{notice}</div> : null}
      <div className="rr-road-detail-body">
        {ratings ? <div data-slot="main">{ratings}</div> : null}
        <div data-slot="side" className="space-y-6 md:sticky md:top-20">
          {roadInfo}
          {pins ? <div>{pins}</div> : null}
        </div>
        <div data-slot="main">{drives}</div>
        {actions ? <div data-slot="main">{actions}</div> : null}
      </div>
      {dangerZone ? <div>{dangerZone}</div> : null}
    </article>
  )
}
