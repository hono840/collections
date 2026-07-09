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
 * STEP 2 で `@/lib/domain/schema.ts` に zod スキーマ（CURRENT_SCHEMA_VERSION）を定義後、
 * そちらを単一の正として re-export に置き換える（architecture §4.1）。
 * それまでは足場として本ファイルで定義する。
 */
export const CURRENT_SCHEMA_VERSION = 1 as const
