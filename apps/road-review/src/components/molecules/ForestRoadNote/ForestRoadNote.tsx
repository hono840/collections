import { Alert } from '@/components/atoms/Alert'
import { RoadTypeSymbol } from '@/components/atoms/RoadTypeBadge'

/** M-08 (PRD / UX microcopy). */
export const FOREST_ROAD_NOTE_MESSAGE =
  '林道は、舗装されていない区間や道幅の狭い区間があったり、一般車両の通行止めや季節による閉鎖が行われていたりする場合があります。お出かけ前に道路管理者の情報を確認し、通行止めの道には入らないでください。'

export type ForestRoadNoteProps = {
  className?: string
}

/**
 * Forest road note (spec 4-7 ForestRoadNote). A calm note with the text label "注意",
 * shown in the road form when 林道 is chosen and under the road detail heading. Not dismissible.
 */
export function ForestRoadNote({ className }: ForestRoadNoteProps) {
  return (
    <Alert
      variant="warning"
      role="note"
      className={className}
      icon={<RoadTypeSymbol roadType="forest" className="size-5" />}
      title={<span className="text-warning">注意</span>}
    >
      <p className="leading-relaxed">{FOREST_ROAD_NOTE_MESSAGE}</p>
    </Alert>
  )
}
