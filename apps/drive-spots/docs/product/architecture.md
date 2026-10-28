# ドライブスポット帳 設計（v1）

仕様は `spec.md`、見た目は `../design/Main.dc.html`。ここでは「どのファイルに何を置くか」と「関数の形」を決める。テスト（test-writer）と実装（frontend-developer）はこの形に合わせる。

## 全体の流れ

`src/app/page.tsx`（サーバー側・中身は1行）→ `src/app/DriveSpotsApp.tsx`（`'use client'`、画面の切り替えと状態を持つ）→ templates / organisms を組み立てる。

データの出し入れは `src/lib/spots/` の純粋な関数に集め、画面からは `useSpotsData()` だけを使う。

## `src/lib/spots/`（ロジック。React に依存しない）

```ts
// types.ts
export const CATEGORIES = ['峠', '絶景ロード', '海沿い', 'サーキット', '都市高速'] as const
export type Category = (typeof CATEGORIES)[number]
export const CATEGORY_MARKS: Record<Category, string> // 峠→峠, 絶景ロード→景, 海沿い→海, サーキット→走, 都市高速→高
export const ALL_CATEGORIES = 'すべて'
export type CategoryFilter = typeof ALL_CATEGORIES | Category
export type Tab = 'want' | 'done'
export type Spot = {
  id: number
  name: string
  region: string
  category: Category
  distanceKm: string // 空文字 = 未入力
  exitInterchange: string // 降りるIC。空文字 = 未入力（version 2 で追加、AC46）
  season: string
  memo: string
  done: boolean
}
export const SPOTS_DATA_VERSION = 2 // この版が書く・読める一番新しい version（AC46）
export type SpotsData = { version: typeof SPOTS_DATA_VERSION; nextId: number; spots: Spot[] }
export type SpotInput = Omit<Spot, 'id' | 'done'>

// seed.ts
export function createSeedData(): SpotsData // デザインの19件、id 1〜19、nextId 20、毎回新しいオブジェクト

// spots.ts
export function addSpot(data: SpotsData, input: SpotInput): SpotsData
//   前後の空白を削る / region が空なら '未入力' / 先頭に追加 / done=false / id=nextId / nextId+1
//   nextId が MAX_NEXT_ID 以上なら何もしない（同じ中身を返す。AC16）
export function toggleDone(data: SpotsData, id: number): SpotsData
export function removeSpot(data: SpotsData, id: number): SpotsData // nextId は変えない
export function updateMemo(data: SpotsData, id: number, memo: string): SpotsData
//   AC23〜AC27: その id のメモだけを memo.trim() に変える。ほかの項目・並び順・nextId は変えない。id が無ければ同じ中身を返す（よみがえらせない）
export function filterSpots(spots: Spot[], tab: Tab, category: CategoryFilter): Spot[]
export function countByTab(spots: Spot[]): { want: number; done: number }
export type SpotInputErrors = { name?: string; distanceKm?: string }
export function validateSpotInput(input: SpotInput): SpotInputErrors
//   name が空/空白だけ → 'スポット名を入れてください'
//   distanceKm（前後の空白を削ったもの）が空でなく、/^\d+(\.\d+)?$/ に合わない → '0以上の数字を入れてください'
// どの関数も引数を書き換えない（新しいオブジェクトを返す）

// storage.ts
export const STORAGE_KEY = 'drive-spots:v1'
export const BACKUP_KEY = 'drive-spots:v1:backup'
export function getBrowserStorage(): Storage | null // window.localStorage を try/catch で取る
export function parseSpotsData(raw: string): SpotsData | null // 形が1か所でも違えば null
export function loadSpotsData(storage: Storage | null): { data: SpotsData; persistent: boolean }
//   storage が null / getItem が例外 → 初期データ, persistent=false
//   保存なし → 初期データ, persistent=true（この時点では書き込まない）
//   壊れている → 初期データ, 元の文字列を BACKUP_KEY へ。退避できた → persistent=true / 退避に失敗 → persistent=false
export function saveSpotsData(storage: Storage | null, data: SpotsData): boolean // 書けなければ false
export function updateSpotsData(
  storage: Storage | null,
  fallback: SpotsData, // 画面が持っている今のデータ
  change: (data: SpotsData) => SpotsData,
): { data: SpotsData; saved: boolean }
//   保存の直前に最新を読み直して、その上に change をかける（AC22）。読み直しの結果で分ける:
//   storage が null / getItem が例外 → 書き込まない。data=change(fallback), saved=false
//   保存なし → change(fallback) を書く
//   正しいデータ → change(読み直したデータ) を書く（別タブで増えたスポットを残す）
//   壊れている → BACKUP_KEY がその文字列と同じなら change(fallback) を書く。
//                違えば退避を試し、退避できたら書く／失敗したら書かない（saved=false）
//   書き込み（setItem）が例外 → saved=false

// useSpotsData.ts（'use client' のフック）
export function useSpotsData(): {
  ready: boolean // localStorage を読み終えたか。読む前は画面に一覧を出さない（初期データが一瞬見える・ハイドレーションずれを防ぐ）
  data: SpotsData
  persistent: boolean // false なら AC15 のお知らせを出す。保存に失敗したときも false にする（一度 false になったら戻さない）
  // 操作はすべて updateSpotsData を通す。persistent=false のあいだも書き込みは試みない（読めていない/退避できていないデータを守る）
  // window の storage イベント（key が STORAGE_KEY か null）と pageshow（persisted=true）で表示を更新する。
  // 更新は「読むだけ」: getItem → parseSpotsData が正しいデータを返したときだけ data を置き換える。
  // 読めない・保存なし・壊れている ときは何もしない（この画面の変更を初期データで消さない／退避の書き込みもしない）
  // persistent は「前の値 && 今回の結果」で、一度 false になったら戻さない
  add(input: SpotInput): void
  toggleDone(id: number): void
  remove(id: number): void
  updateMemo(id: number, memo: string): void // AC24, AC27, AC28
}
```

## 古い版の守りとバックアップ（AC30〜AC40）

```ts
// storage.ts（足すもの・変えるもの）
export const LAST_BACKUP_KEY = 'drive-spots:v1:last-backup' // 最後に書き出した日時（ISO 8601 の文字列）
export function parseSpotsValue(value: unknown): SpotsData | null // parseSpotsData の中身。JSON.parse 済みの値を同じ厳しさで検査
export const MAX_NEXT_ID = 1_000_000_000 // これより大きい nextId は壊れている扱い（AC16）
export function isNewerVersionNumber(value: unknown, newestReadable: number): value is number // newestReadable より大きい安全な整数か（AC46 で引数を追加）
export function parseIsoDateTime(value: unknown): Date | null // Date#toISOString() と同じ形の文字列だけ受け付ける
export function isNewerVersionValue(value: unknown): boolean
//   オブジェクトで、version が SPOTS_DATA_VERSION（2）より大きい安全な整数のとき true（AC30）。'3' のような文字列は false（壊れている扱い）
export type SavedSpotsRead =
  | { kind: 'unreadable' } // storage が null / getItem が例外
  | { kind: 'nothing' }
  | { kind: 'valid'; data: SpotsData }
  | { kind: 'corrupt' }
  | { kind: 'newer' } // 新しい版のデータ。壊れている扱いにしない
export function readSavedSpots(storage: Storage | null): SavedSpotsRead // 読むだけ。書き込まない
export function loadSpotsData(storage: Storage | null): {
  data: SpotsData
  persistent: boolean
  newerVersion: boolean // newer のとき true。data=初期データ, persistent=false。退避も書き込みもしない
  hasSavedData: boolean // valid のときだけ true
}
export function updateSpotsData(storage, fallback, change): { data: SpotsData; saved: boolean; newerVersion: boolean }
//   読み直しが newer → data=change(fallback), saved=false, newerVersion=true。何も書かない（BACKUP_KEY にも）
export function readLastBackupAt(storage: Storage | null): Date | null // 無い・日時として読めない・例外 → null
export function writeLastBackupAt(storage: Storage | null, at: Date): boolean // 書けなければ false

// backup.ts（新規。React に依存しない）
export const BACKUP_FILE_MAX_BYTES = 1_000_000
export const BACKUP_REMINDER_DAYS = 30
export const BACKUP_FILE_MIME_TYPE = 'application/json'
export function formatCalendarDate(at: Date): string // '2026年10月25日'（ゼロ埋めなし）
export function createBackupFileContent(data: SpotsData, exportedAt: Date): string
//   JSON（2文字の字下げ）{ app: 'drive-spots', backupVersion: 1, exportedAt: exportedAt.toISOString(), data }
export function backupFileName(exportedAt: Date): string // `drive-spots-YYYY-MM-DD.json`（端末の日付）
export type ParsedBackupFile =
  | { kind: 'ok'; data: SpotsData; exportedAt: Date }
  | { kind: 'newer' }
  | { kind: 'invalid' }
export function parseBackupFile(text: string): ParsedBackupFile
//   JSON でない・オブジェクトでない・app が 'drive-spots' でない → invalid
//   backupVersion が 1 より大きい、または data.version が 2 より大きい安全な整数 → newer（厳しい検査より先に見る。AC34・AC46）
//   backupVersion が 1 でない・exportedAt が日時の文字列でない・parseSpotsValue(data) が null → invalid
export function calendarDaysBetween(from: Date, to: Date): number // 端末の暦の日付の差。未来の日時なら 0
export function formatBackupDate(at: Date, now: Date): string // '2026年10月25日（今日）' / '2026年10月20日（5日前）'
export function backupReminder(hasSavedData: boolean, lastBackupAt: Date | null, now: Date): 'none' | 'never' | 'stale'
//   hasSavedData=false → none / lastBackupAt=null → never / BACKUP_REMINDER_DAYS 日以上 → stale / それ以外 none

// src/lib/utils/download.ts（新規。'use client' から呼ぶ）
export function downloadTextFile(fileName: string, content: string, mimeType: string): void
//   Blob → URL.createObjectURL → <a download> を押す → あとで revokeObjectURL。外部への通信なし

// useSpotsData.ts（足すもの）
//   返り値に newerVersion: boolean / hasSavedData: boolean / replaceAll(data: SpotsData): void を足す
//   replaceAll は commit(() => data)。newerVersion は一度 true になったら戻さない。hasSavedData は 前の値 || saved
//   storage / pageshow の読み直しは readSavedSpots を使う: valid → data を置き換え（hasSavedData=true）、
//   newer → persistent=false・newerVersion=true（書き込まない）、それ以外 → 何もしない

// useLastBackup.ts（新規の 'use client' フック）
export function useLastBackup(): { lastBackupAt: Date | null; recordBackup(at: Date): void }
//   マウントのあとで readLastBackupAt を読む。recordBackup は writeLastBackupAt を試し、失敗しても画面上は at にする
```

## スポットの編集と降りるIC（AC41〜AC48）

見た目・文言・フォーカスは `../design/spot-edit.md`。

```ts
// storage.ts（変えるもの）
export function parseSpotsValue(value: unknown): SpotsData | null
//   version 1 と 2 を受け付け、いつも version 2 の形で返す（AC46）
//   version 1: 各スポットは今までの8項目を同じ厳しさで検査し、exitInterchange: '' を足す（exitInterchange というキーがあっても無視する）
//   version 2: 各スポットは exitInterchange も文字列であること（無い・文字列でない → null）
//   nextId・ID の重なり・MAX_NEXT_ID の検査は今のまま
export function isNewerVersionNumber(value: unknown, newestReadable: number): value is number
//   newestReadable より大きい安全な整数か。保存データは SPOTS_DATA_VERSION（2）、バックアップの backupVersion は 1 と比べる
export function isNewerVersionValue(value: unknown): boolean // version が SPOTS_DATA_VERSION より大きい（AC30）
//   loadSpotsData / readSavedSpots は version 1 を valid として返すだけで、書き込まない（次の変更で version 2 になる）

// backup.ts（変えるもの）
//   parseBackupFile: backupVersion が 1 より大きい、または data.version が 2 より大きい → newer（AC34）
//   data は parseSpotsValue を通すので version 1 のファイルも読める（version 2 になって返る）。書き出しの backupVersion は 1 のまま

// spots.ts（足すもの・変えるもの）
//   addSpot: exitInterchange も前後の空白を削る。返す version は SPOTS_DATA_VERSION
export function spotToInput(spot: Spot): SpotInput
//   編集画面の最初の値（AC42）。region がちょうど '未入力' なら ''。ほかの項目はそのまま
export function updateSpot(data: SpotsData, id: number, input: SpotInput): SpotsData
//   AC43: その id の 名前・種類・地域・距離・降りるIC・時期・メモ を、addSpot と同じ整え方（前後の空白を削る・地域が空なら '未入力'）で変える
//   done・id・並び順・nextId は変えない。id が無ければ同じ中身を返す（よみがえらせない、AC45）
//   整え方は addSpot と1つの関数を共有する（2か所で書かない）

// seed.ts: 各スポットに exitInterchange: ''、version は SPOTS_DATA_VERSION

// useSpotsData.ts（足すもの）
//   updateSpot(id: number, input: SpotInput): void // commit((data) => updateSpot(data, id, input))。AC45
//   読み込む前の空のデータ（NOT_LOADED_STATE）も version 2
```

- `SpotFormScreen` に `mode?: 'add' | 'edit'`（既定 'add'。見出しが「スポットを追加」／「スポットを編集」になる）と `initialInput?: SpotInput`（既定は今の空の入力）を足す。`initialInput` は `useState` の初期値として1回だけ使う（別のタブの変更で入力を書きかえない、AC45）。降りるIC の欄は「地域 ｜ 距離」のすぐ下（`id` は `${fieldIdPrefix}-exit-interchange`）。
- `SpotDetailScreen` に `onEdit: () => void` と `focusTarget?: 'heading' | 'editSpot'`（既定 'heading'。`focusOnMount` が true のときだけ効く。'editSpot' なら「スポットを編集」にフォーカス）を足す。降りるIC の箱を足す。
- `SpotCard` に `exitInterchange: string` を足す（`''` なら3行目を作らない）。`SpotListScreen` は `spot.exitInterchange` を渡す。
- `DriveSpotsApp`: 画面に `'edit'` を足す。編集画面は `<SpotFormScreen key={選択中の id} mode="edit" initialInput={spotToInput(選択中のスポット)} />`。
  - 保存 → `updateSpot(選択中の id, input)` → 詳細へ（`focusTarget='editSpot'`）。キャンセル → 詳細へ（`focusTarget='editSpot'`）。一覧から詳細を開くときは `focusTarget='heading'`。
  - 選択中のスポットが無くなったら一覧へ、の今の判定を `'edit'` にも効かせる（AC45）。`selectedSpotId` は編集中もそのまま。
  - タブ・種類の絞り込みは編集では変えない（AC43）。

## コンポーネント（Atomic Design、`src/components/`）

| 階層 | コンポーネント | 役目 |
| --- | --- | --- |
| atoms | `Chip` | 丸いチップ（選択中/未選択）。カテゴリ絞り込みと追加画面の種類で使う |
| atoms | `Badge` | 詳細の「種類」「行った」バッジ |
| atoms | `Icon` | インライン SVG（check / chevronRight / chevronLeft / plus / road）。飾りは `aria-hidden` |
| atoms | `TextField` | `input` / `textarea`（デザインの `.fld`） |
| atoms | `PrimaryButton` | 56px の大きいボタン（色を指定できる） |
| molecules | `TabSwitch` | 「行きたい N / 行った N」 |
| molecules | `CategoryChips` | 横スクロールのチップ列 |
| molecules | `SpotCard` | 一覧の1行（押すと詳細）。降りるIC が入っていれば3行目に「{降りるIC}で降りる」 |
| molecules | `FormField` | `label` + 入力欄 + エラー文 |
| molecules | `InfoTile` | 詳細の「地域」「距離」「降りるIC」「時期」の箱 |
| molecules | `EmptyState` | 「まだありません」 |
| organisms | `SpotListScreen` | 一覧画面（見出し・バックアップボタン・タブ・チップ・お知らせ・カード・追加ボタン）。`persistent` の代わりに `saveNotice: 'none' \| 'unavailable' \| 'newer-version'`、ほかに `backupReminder: 'none' \| 'never' \| 'stale'`・`showRestoreHint: boolean`・`onOpenBackup()` を受け取る |
| organisms | `SpotDetailScreen` | 詳細画面。削除の2回押し状態と、メモの編集中かどうか・編集中の文字を中に持つ（画面を離れると消える）。保存は `onUpdateMemo(memo)` で親に渡す。「スポットを編集」は `onEdit()` |
| organisms | `SpotFormScreen` | 追加画面と編集画面（`mode`）。入力値とエラー表示を中に持ち、`validateSpotInput` を使う |
| organisms | `BackupScreen` | バックアップ画面。props は `spots`・`lastBackupAt`・`saveNotice`（SpotListScreen と同じ型。'newer-version' ならお知らせを出して書き出し・読み込みを使えなくする、'unavailable' なら読み込み後に保存できなかったと出す）・`onBack()`・`onExport()`・`onReplace(data)`・`focusOnMount?`。ファイルの検査結果（エラー・中身の確認・読み込み済み）は中に持ち、画面を離れたら消える。`parseBackupFile` と `BACKUP_FILE_MAX_BYTES` を使う |
| templates | `AppShell` | 画面の枠（最大幅 480px・`100dvh`・safe-area・背景色）。データは持たない |

依存の向きは atoms ← molecules ← organisms ← templates。organisms は `src/lib/spots/` の型と関数を使ってよい。画面の切り替え（一覧/詳細/追加/編集/バックアップ）・タブ・カテゴリ・選択中の ID は `DriveSpotsApp` が持つ。書き出しは `DriveSpotsApp` が `createBackupFileContent` → `downloadTextFile` → `recordBackup` の順に呼ぶ。

## テストの置き場所

- `src/lib/spots/*.test.ts` — ロジックの単体テスト
- `src/components/**/X.test.tsx` — 各コンポーネントと同じフォルダ（必須）
- `src/app/DriveSpotsApp.test.tsx` — 受入条件を画面の操作で確かめる結合テスト（localStorage は jsdom のものを毎回空にして使う）
