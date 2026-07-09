/**
 * 単位プリセット（architecture §3 / §5.1・PRD 0.4）。
 * 単一の正は `@/lib/domain/schema.ts`（型契約の源）に移設済み。
 * 既存の import パスを壊さないため、本ファイルは schema から re-export する薄い層とする。
 */
export { WEIGHT_UNITS, VOLUME_UNITS, COUNT_UNIT_PRESETS } from '@/lib/domain/schema'
