/**
 * localStorage キー構成（architecture §4.1 / PRD 9.2）。
 * ルートは単一キーに集約し、破損時は :backup へ退避する。ハードコード禁止のため定数化。
 */

/** 永続ルート状態（CanonicalState の JSON 文字列）を保存するキー。 */
export const STORAGE_KEY = 'genka-dentaku'

/** 読込失敗時に破損内容を上書き前に退避するキー。 */
export const STORAGE_BACKUP_KEY = 'genka-dentaku:backup'

/**
 * マイグレーションの基準となるスキーマ版。
 * 単一の正は `@/lib/domain/schema.ts`（型契約の源）に定義。既存 import を壊さぬよう re-export する（architecture §4.1）。
 */
export { CURRENT_SCHEMA_VERSION } from '@/lib/domain/schema'
