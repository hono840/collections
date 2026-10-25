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
  season: string
  memo: string
  done: boolean
}
export type SpotsData = { version: 1; nextId: number; spots: Spot[] }
export type SpotInput = Omit<Spot, 'id' | 'done'>

// seed.ts
export function createSeedData(): SpotsData // デザインの19件、id 1〜19、nextId 20、毎回新しいオブジェクト

// spots.ts
export function addSpot(data: SpotsData, input: SpotInput): SpotsData
//   前後の空白を削る / region が空なら '未入力' / 先頭に追加 / done=false / id=nextId / nextId+1
export function toggleDone(data: SpotsData, id: number): SpotsData
export function removeSpot(data: SpotsData, id: number): SpotsData // nextId は変えない
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
}
```

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
| molecules | `SpotCard` | 一覧の1行（押すと詳細） |
| molecules | `FormField` | `label` + 入力欄 + エラー文 |
| molecules | `InfoTile` | 詳細の「地域」「距離」「時期」の箱 |
| molecules | `EmptyState` | 「まだありません」 |
| organisms | `SpotListScreen` | 一覧画面（見出し・タブ・チップ・保存できないお知らせ・カード・追加ボタン） |
| organisms | `SpotDetailScreen` | 詳細画面。削除の2回押し状態を中に持つ（画面を離れると消える） |
| organisms | `SpotFormScreen` | 追加画面。入力値とエラー表示を中に持ち、`validateSpotInput` を使う |
| templates | `AppShell` | 画面の枠（最大幅 480px・`100dvh`・safe-area・背景色）。データは持たない |

依存の向きは atoms ← molecules ← organisms ← templates。organisms は `src/lib/spots/` の型と関数を使ってよい。画面の切り替え（一覧/詳細/追加）・タブ・カテゴリ・選択中の ID は `DriveSpotsApp` が持つ。

## テストの置き場所

- `src/lib/spots/*.test.ts` — ロジックの単体テスト
- `src/components/**/X.test.tsx` — 各コンポーネントと同じフォルダ（必須）
- `src/app/DriveSpotsApp.test.tsx` — 受入条件を画面の操作で確かめる結合テスト（localStorage は jsdom のものを毎回空にして使う）
