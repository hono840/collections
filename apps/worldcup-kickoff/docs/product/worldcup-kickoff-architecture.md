# worldcup-kickoff アーキテクチャ設計書

2026 FIFA ワールドカップ（6/11 開幕）を、ルール・選手・国がわからない初心者でも「観て学べる」統合コンパニオン Web アプリ。日本語のみ・モバイルファースト。

- **種別**: 静的シード MVP（バックエンド DB なし / 認証なし / middleware なし）
- **データ源**: `openfootball/world-cup.json`（2026, パブリックドメイン）→ ビルド時に読み込む静的 JSON としてリポジトリ同梱（48チーム・104試合・12グループ・16会場）
- **ユーザー状態**: localStorage のみ（推し国・診断結果・勝敗予想・学習進捗・閲覧済み用語）
- **拡張余地**: 将来の無料ライブスコア API をデータ取得層（repository）で差し替え可能にする（MVP では未実装）

---

## 1. 技術スタック（budget-app 準拠・厳守）

| 領域 | 採用 |
| --- | --- |
| フレームワーク | Next.js **16.2.6**（App Router） |
| UI | React **19.2.6** / React DOM 19.2.6 |
| 言語 | TypeScript ^5（strict, moduleResolution: bundler, paths `@/*`→`./src/*`） |
| スタイル | Tailwind CSS **v4**（`@tailwindcss/postcss`, `globals.css` の `@theme` でトークン定義） |
| クラス結合 | `clsx` + `tailwind-merge`（`cn()` ユーティリティ） |
| アイコン | `lucide-react`（budget-app と同一） |
| 日付 | `date-fns` ^4（カウントダウン・JST 変換・試合日グルーピング） |
| バリデーション | `zod` ^4（**localStorage の読み出し検証専用**。診断・予想の永続データを安全に復元） |
| テスト | Vitest ^4（jsdom, globals, setup `./tests/setup.ts`）+ @testing-library/react + Playwright |
| PM | pnpm@10.29.2（`preinstall: npx only-allow pnpm`, `engines.node >=22`） |

**Supabase / @supabase/ssr / react-hook-form / recharts / @tanstack/react-virtual は導入しない**（DB・フォーム送信・チャート・大量行仮想化の要件が MVP に無いため）。新規追加は `zod` と `date-fns` のみ（両方 budget-app に既存実績あり）。

### pnpm-workspace.yaml

budget-app と同一の `minimumReleaseAge: 10080`（7日 cooldown）、`minimumReleaseAgeStrict: false`、`ignoredBuiltDependencies: [sharp, unrs-resolver]` を踏襲。新規ビルド許可依存は不要。

---

## 2. ディレクトリ構成

```text
apps/worldcup-kickoff/
├── package.json
├── README.md
├── next.config.ts                 # images.remotePatterns（flagcdn等）。SSG中心
├── postcss.config.mjs             # { plugins: { "@tailwindcss/postcss": {} } }
├── tsconfig.json                  # budget-app と同一（paths @/* → ./src/*, strict）
├── eslint.config.mjs              # next core-web-vitals + typescript
├── vitest.config.ts               # jsdom, globals, setupFiles ./tests/setup.ts
├── pnpm-workspace.yaml            # minimumReleaseAge: 10080
├── playwright.config.ts
├── public/
│   ├── manifest.json
│   ├── flags/                     # 国旗SVG（フォールバック用。実運用は絵文字を第一候補）
│   └── og/                        # OGP 静的画像（または next/og で動的生成）
├── tests/
│   ├── setup.ts                   # import '@testing-library/jest-dom/vitest'
│   └── e2e/                       # Playwright スペック
│       ├── home.spec.ts
│       ├── diagnosis.spec.ts
│       └── prediction.spec.ts
├── scripts/
│   └── build-data.ts              # （任意）openfootball生JSON → 正規化JSON 変換スクリプト
└── src/
    ├── app/
    │   ├── layout.tsx             # RootLayout: メタデータ・フォント(next/font)・globals.css・テーマ初期化script
    │   ├── globals.css            # @import "tailwindcss"; @theme { トークン }
    │   ├── page.tsx               # ホーム（"/"）
    │   ├── loading.tsx
    │   ├── error.tsx
    │   ├── not-found.tsx
    │   ├── opengraph-image.tsx    # （任意）next/og によるOGP
    │   ├── matches/               # 試合日程
    │   │   ├── page.tsx
    │   │   └── loading.tsx
    │   ├── bracket/               # ブラケット（トーナメント表）
    │   │   └── page.tsx
    │   ├── diagnosis/             # 推し国診断
    │   │   └── page.tsx
    │   ├── countries/             # 国図鑑
    │   │   ├── page.tsx           # 一覧（グループ別）
    │   │   └── [code]/            # 詳細（FIFA国コード）
    │   │       ├── page.tsx       # generateStaticParams で48国を静的生成
    │   │       └── not-found.tsx
    │   ├── rules/                 # ルール図鑑
    │   │   ├── page.tsx           # レッスン一覧
    │   │   └── [slug]/
    │   │       ├── page.tsx       # 各レッスン（generateStaticParams）
    │   │       └── not-found.tsx
    │   ├── glossary/              # 用語じてん
    │   │   └── page.tsx
    │   └── predictions/           # 勝敗予想
    │       └── page.tsx
    ├── components/
    │   ├── atoms/                 # 最小UIパーツ
    │   ├── molecules/             # atoms 組合せの機能単位
    │   ├── organisms/             # 独立セクション
    │   └── templates/             # ページレイアウト（データを持たない）
    ├── data/                      # 静的シードJSON（source of truth）
    │   ├── raw/
    │   │   └── worldcup-2026.json # openfootball 生データ（同梱・改変しない）
    │   ├── teams.json             # 48チーム（正規化済: code, nameJa, group, flag, …）
    │   ├── groups.json            # 12グループ（A〜L）
    │   ├── stadiums.json          # 16会場
    │   ├── players.json           # 最小限の注目選手（手動キュレーション）
    │   ├── terms.json             # 用語じてん（手動）
    │   └── rules.json             # ルールレッスン（手動）
    │   # ※ matches は raw からビルド時に正規化（src/lib/data/matches.ts）
    ├── lib/
    │   ├── constants/
    │   │   ├── tournament.ts      # KICKOFF_DATE, TIMEZONE, ROUND_LABELS など
    │   │   └── storage-keys.ts    # localStorage キー定数（命名規約の単一情報源）
    │   ├── data/                  # ★データアクセス層（repository パターン）
    │   │   ├── repository.ts      # WorldCupRepository インターフェース定義
    │   │   ├── static-repository.ts  # 静的JSON実装（MVPの本体）
    │   │   ├── index.ts           # getRepository() ファクトリ（将来 live へ差替）
    │   │   ├── teams.ts           # 正規化・lookup ヘルパ
    │   │   ├── matches.ts         # raw → Match[] 正規化、日付グルーピング
    │   │   └── normalize.ts       # openfootball生 → 内部型 への変換純関数
    │   ├── domain/                # ★型定義（ドメインモデル）
    │   │   ├── team.ts
    │   │   ├── match.ts
    │   │   ├── group.ts
    │   │   ├── stadium.ts
    │   │   ├── player.ts
    │   │   ├── term.ts
    │   │   ├── rule.ts
    │   │   ├── prediction.ts      # 永続データ型 + zod schema
    │   │   ├── diagnosis.ts       # 永続データ型 + zod schema
    │   │   └── index.ts           # re-export
    │   ├── diagnosis/
    │   │   ├── questions.ts       # 診断の設問定義
    │   │   └── scoring.ts         # 回答 → 推し国 のスコアリング純関数
    │   ├── storage/               # ★localStorage 永続化層
    │   │   ├── safe-storage.ts    # SSR安全な低レベルラッパ（get/set/remove + zod検証）
    │   │   └── schema.ts          # 各キーの zod スキーマ
    │   ├── hooks/                 # クライアントフック（'use client'）
    │   │   ├── use-local-storage.ts   # 型安全 + zod + hydration安全
    │   │   ├── use-countdown.ts       # 開幕までのカウントダウン
    │   │   ├── use-favorite-team.ts   # 推し国（use-local-storage ラッパ）
    │   │   ├── use-predictions.ts     # 勝敗予想
    │   │   ├── use-diagnosis-result.ts
    │   │   └── use-learning-progress.ts # 学習進捗・閲覧済み用語
    │   └── utils/
    │       ├── cn.ts              # clsx + tailwind-merge（budget-app と同一）
    │       ├── date.ts            # JST変換・試合日フォーマット（date-fns）
    │       └── format.ts          # スコア表示・順位表示など
    └── ...
```

### Atomic Design ディレクトリの中身（規約: 1コンポーネント=1ディレクトリ。`Xxx.tsx` / `Xxx.test.tsx` / `index.ts`）

```text
src/components/
├── atoms/
│   ├── Button/            (Button.tsx, Button.test.tsx, index.ts)
│   ├── Badge/
│   ├── Card/
│   ├── Tag/
│   ├── CountryFlag/       # 国旗（絵文字 or flagcdn img）。next/imageは外部URLのみ
│   ├── Score/             # 「2 - 1」表示
│   ├── ProgressBar/
│   ├── Skeleton/
│   ├── Spinner/
│   ├── SegmentedControl/  # タブ切替（日程フィルタ等）
│   ├── IconButton/
│   ├── Chip/              # 選択可能チップ（診断選択肢）
│   └── EmptyState/
├── molecules/
│   ├── MatchCard/         # CountryFlag + Score + 日時 + 会場
│   ├── GroupTableRow/     # 順位表1行
│   ├── DateGroupHeader/   # 日付見出し（"6月11日(木)"）
│   ├── TermPopover/       # 用語ハイライト + ポップオーバー解説
│   ├── PredictionButton/  # 勝/分/敗の3択（予想保存）
│   ├── QuizOption/        # 診断の1選択肢（Chip + ラベル）
│   ├── CountdownTimer/    # use-countdown + 数字表示
│   ├── CountryListItem/   # 一覧の1行
│   ├── FilterTabs/        # SegmentedControl ラッパ（グループ/ステージ絞込）
│   ├── RuleLessonCard/    # ルール一覧カード
│   ├── GlossaryItem/      # 用語1件（読み・意味）
│   ├── FavoriteToggle/    # 推し国の星トグル
│   └── ShareButton/       # Web Share API（診断結果共有）
├── organisms/
│   ├── SiteHeader/        # ロゴ + カウントダウン
│   ├── BottomNav/         # モバイル下部ナビ（budget-app準拠）
│   ├── MatchSchedule/     # 日付グルーピングされた MatchCard 群 + FilterTabs
│   ├── GroupTable/        # 1グループの順位表（GroupTableRow集合）
│   ├── GroupStandings/    # 全12グループの GroupTable 一覧
│   ├── BracketView/       # 決勝T トーナメント表（CSS Grid/Flex 実装）
│   ├── DiagnosisQuiz/     # 設問進行 + scoring + 結果遷移（状態を持つ）
│   ├── DiagnosisResultCard/ # 推し国結果 + ShareButton
│   ├── CountryDetailPanel/  # 国詳細（基本情報 + 注目選手 + 試合）
│   ├── PredictionBoard/   # 全試合の PredictionButton 集約 + 集計
│   ├── RuleLessonViewer/  # レッスン本文 + 図解（OffsideSimulator埋込）
│   ├── OffsideSimulator/  # ドラッグでオフサイド体験（クライアント）
│   ├── GlossaryList/      # 用語一覧 + 検索
│   └── HomeHero/          # ホームのヒーロー（カウントダウン + 次の試合 + CTA）
└── templates/
    ├── DefaultTemplate/   # SiteHeader + main + BottomNav（全画面共通の骨格）
    ├── HomeTemplate/      # ホーム専用レイアウト
    ├── ListDetailTemplate/ # 一覧＋詳細系（国図鑑・ルール図鑑）
    └── QuizTemplate/      # 診断専用（没入レイアウト・ナビ最小化）
```

---

## 3. Atomic Design マッピング

| コンポーネント | 階層 | 説明 | Server/Client |
| --- | --- | --- | --- |
| Button / IconButton | atoms | 汎用ボタン | Client（onClick） |
| Card / Badge / Tag / Chip | atoms | 表示パーツ | Server可 |
| CountryFlag | atoms | 国旗（絵文字 or 画像） | Server可 |
| Score | atoms | スコア表示 | Server可 |
| ProgressBar / Skeleton / Spinner / EmptyState | atoms | 状態表示 | Server可 |
| SegmentedControl | atoms | タブ切替 | Client |
| MatchCard | molecules | 試合1枚（旗+スコア+日時+会場） | Server可 |
| GroupTableRow | molecules | 順位表1行 | Server可 |
| DateGroupHeader | molecules | 日付見出し | Server可 |
| TermPopover | molecules | 用語ポップオーバー | Client |
| PredictionButton | molecules | 勝分敗3択（localStorage） | Client |
| QuizOption | molecules | 診断選択肢 | Client |
| CountdownTimer | molecules | カウントダウン | Client |
| FavoriteToggle / ShareButton | molecules | 推し国トグル / 共有 | Client |
| SiteHeader | organisms | ロゴ+カウントダウン | Client（カウントダウン内包） |
| BottomNav | organisms | 下部ナビ | Client（usePathname） |
| MatchSchedule | organisms | 日程セクション | Client（FilterTabs状態） |
| GroupTable / GroupStandings | organisms | 順位表 | Server可（計算はServer） |
| BracketView | organisms | トーナメント表 | Server可 |
| DiagnosisQuiz / DiagnosisResultCard | organisms | 診断進行・結果 | Client |
| CountryDetailPanel | organisms | 国詳細 | Server（一部Client子） |
| PredictionBoard | organisms | 予想ボード | Client |
| RuleLessonViewer | organisms | レッスン表示 | Server（OffsideSimulatorはClient） |
| OffsideSimulator | organisms | ドラッグ体験 | Client |
| GlossaryList | organisms | 用語一覧+検索 | Client（検索状態） |
| HomeHero | organisms | ホームヒーロー | Client（カウントダウン） |
| DefaultTemplate / HomeTemplate / ListDetailTemplate / QuizTemplate | templates | レイアウト骨格 | Server可（children受領のみ） |

**依存方向の保証**: atoms ← molecules ← organisms ← templates を厳守。例外なし。templates はデータを持たず `children`/`slot` を受け取るのみ。逆依存（例: atoms が molecules を import）は ESLint レビューで検出する。

---

## 4. データモデル / 型定義（`src/lib/domain/`）

openfootball 2026 生 JSON は `{ name, matches[] }` 構造で、各 match は `round`（"Matchday 1" / "Round of 16" / "Final" 等）、`date`、`time`（"18:00 UTC+3" 形式）、`team1`/`team2`（**チーム名文字列**）、`group`（"Group A" or null）、`ground`（会場名）、`score.ft`（`[n,n]`配列）、`score.ht`/`et`/`p` を持つ。**チームは名前文字列のみで国コードを持たない**ため、`teams.json` で名前→FIFA国コード→日本語名→旗のマッピングを手動で正規化する（これが正規化層の中心責務）。

```typescript
// src/lib/domain/team.ts
/** FIFA 3文字国コード（例: "JPN"） */
export type CountryCode = string

export interface Team {
  /** FIFA国コード（URLパラメータ・lookupキー） */
  code: CountryCode
  /** openfootball の英語チーム名（matches とのJOINキー） */
  nameEn: string
  /** 日本語表記（例: "日本"） */
  nameJa: string
  /** 所属グループID（"A"〜"L"） */
  groupId: GroupId
  /** 国旗絵文字（第一候補。例: "🇯🇵"） */
  flagEmoji: string
  /** 国旗画像URL（flagcdn等。next/image用フォールバック） */
  flagUrl: string
  /** FIFAランキング（任意・手動） */
  fifaRank?: number
  /** 初心者向け一言紹介（手動キュレーション） */
  blurbJa: string
}

// src/lib/domain/group.ts
export type GroupId =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  | 'G' | 'H' | 'I' | 'J' | 'K' | 'L'

export interface Group {
  id: GroupId
  label: string            // "グループA"
  teamCodes: CountryCode[] // 所属4国
}

/** 順位表の1行（matches から計算する派生データ。永続化しない） */
export interface GroupStanding {
  teamCode: CountryCode
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  rank: number
}

// src/lib/domain/stadium.ts
export interface Stadium {
  id: string
  nameJa: string
  city: string
  country: 'USA' | 'CAN' | 'MEX'
  /** openfootball の ground 文字列（matchesとのJOINキー） */
  rawName: string
  capacity?: number
}

// src/lib/domain/match.ts
export type MatchStage =
  | 'group'
  | 'round32'
  | 'round16'
  | 'quarter'
  | 'semi'
  | 'third'
  | 'final'

export interface Match {
  /** 一意ID（日付+両チーム or 連番。正規化時に採番） */
  id: string
  stage: MatchStage
  /** グループステージのみ。決勝Tは null */
  groupId: GroupId | null
  /** ISO日時（JST変換済み or UTCオフセット保持） */
  kickoffUtc: string
  /** 表示用JST文字列はutils/dateで生成 */
  homeTeamCode: CountryCode | null  // 決勝Tの未確定枠は null（"Winner Group A"等）
  awayTeamCode: CountryCode | null
  /** 未確定枠の表示ラベル（"グループA 1位"など） */
  homePlaceholder?: string
  awayPlaceholder?: string
  stadiumId: string | null
  /** 確定結果（過去試合のみ。MVPはシード値=未実施はnull） */
  score: { home: number; away: number } | null
  /** PK戦結果（任意） */
  penalties?: { home: number; away: number }
  roundLabel: string  // 表示用 "グループステージ第1節" 等
}

// src/lib/domain/player.ts（最小限・手動キュレーション）
export interface Player {
  id: string
  nameJa: string
  teamCode: CountryCode
  position: 'GK' | 'DF' | 'MF' | 'FW'
  /** 初心者向け注目ポイント */
  highlightJa: string
}

// src/lib/domain/term.ts（用語じてん）
export interface Term {
  /** URL/アンカー用スラッグ（例: "offside"） */
  slug: string
  termJa: string         // "オフサイド"
  reading?: string       // "おふさいど"
  definitionJa: string   // 解説本文
  /** 関連ルールレッスンへのリンク（任意） */
  relatedRuleSlug?: string
  category: 'rule' | 'position' | 'tournament' | 'stat'
}

// src/lib/domain/rule.ts（ルール解説レッスン）
export interface RuleLesson {
  slug: string           // URL: /rules/[slug]
  titleJa: string
  /** 一覧表示順 */
  order: number
  /** 所要目安（分） */
  estimatedMinutes: number
  /** 見出し+本文のブロック配列（簡易Markdown相当） */
  bodyBlocks: RuleBlock[]
  /** インタラクティブ要素の指定（例: offside-sim を埋め込む） */
  interactive?: 'offside-sim' | null
  /** 関連用語スラッグ */
  relatedTermSlugs: string[]
}

export type RuleBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'callout'; tone: 'info' | 'tip'; text: string }

// ── 以下、localStorage 永続データ（zod スキーマと対で定義）──

// src/lib/domain/prediction.ts
export type PredictionPick = 'home' | 'draw' | 'away'

export interface PredictionStore {
  version: 1
  /** matchId → 予想 */
  picks: Record<string, PredictionPick>
  updatedAt: string
}

// src/lib/domain/diagnosis.ts
export interface DiagnosisResult {
  version: 1
  /** 推し国（第1候補） */
  topTeamCode: CountryCode
  /** 上位候補（共有・再表示用） */
  ranking: CountryCode[]
  /** 回答スナップショット（再診断比較用） */
  answers: Record<string, string>
  completedAt: string
}

// 学習進捗（閲覧済みレッスン・用語）
export interface LearningProgress {
  version: 1
  readRuleSlugs: string[]
  seenTermSlugs: string[]
}
```

### openfootball → 内部型 正規化（`src/lib/data/normalize.ts`）

純関数として実装。`round` 文字列 → `MatchStage`/`groupId` への写像テーブル、`team1`/`team2` 文字列 → `CountryCode`（`teams.json` の `nameEn` で逆引き）、`ground` → `stadiumId`、`time` 文字列（"18:00 UTC+3"）→ `kickoffUtc`（ISO）への変換を担う。**生 JSON は `src/data/raw/` に無改変で同梱**し、正規化はビルド時（モジュール評価時）に一度だけ実行されるよう純関数化する。任意で `scripts/build-data.ts` を用意し、生 JSON を事前正規化した JSON にコンパイルしてリポジトリに保存することで、ランタイム計算コストを排除する選択肢も残す（MVP はランタイム正規化で可）。

---

## 5. データアクセス層（repository パターン / `src/lib/data/`）

将来のライブ API 差し替えを見据え、**取得インターフェースを実装から分離**する。

```typescript
// src/lib/data/repository.ts
export interface WorldCupRepository {
  getTeams(): Promise<Team[]>
  getTeamByCode(code: CountryCode): Promise<Team | null>
  getGroups(): Promise<Group[]>
  getStadiums(): Promise<Stadium[]>
  getMatches(): Promise<Match[]>
  getMatchesByGroup(groupId: GroupId): Promise<Match[]>
  getMatchesByTeam(code: CountryCode): Promise<Match[]>
  getKnockoutMatches(): Promise<Match[]>
  /** 順位表（matches から計算 or ライブAPIから取得） */
  getGroupStandings(groupId: GroupId): Promise<GroupStanding[]>
  getPlayersByTeam(code: CountryCode): Promise<Player[]>
  getTerms(): Promise<Term[]>
  getRuleLessons(): Promise<RuleLesson[]>
  getRuleLesson(slug: string): Promise<RuleLesson | null>
}
```

- `static-repository.ts`: `src/data/*.json` を import し、`normalize.ts` を通して上記を実装（MVP の本体）。すべて同期的だが API 互換のため `async`。
- `index.ts`: `export function getRepository(): WorldCupRepository { return staticRepository }`。**将来は環境変数や feature flag で `liveRepository`（無料スコア API ラッパ）に切替**。Server Component はこの `getRepository()` 経由でのみデータにアクセスし、JSON 直 import を禁止する（差し替え一点化）。
- 順位表計算（`getGroupStandings`）は `matches.ts` の純関数 `computeStandings(matches)` に委譲。ライブ化時はこの関数を API レスポンスに置換するだけで済む。

---

## 6. localStorage 永続化層（`src/lib/storage/` + `src/lib/hooks/`）

### キー命名規約（`src/lib/constants/storage-keys.ts` に集約）

```typescript
const PREFIX = 'wck'   // worldcup-kickoff の略・名前空間衝突回避
export const STORAGE_KEYS = {
  favoriteTeam: `${PREFIX}:favorite-team`,
  predictions: `${PREFIX}:predictions`,
  diagnosisResult: `${PREFIX}:diagnosis-result`,
  learningProgress: `${PREFIX}:learning-progress`,
  theme: `${PREFIX}:theme`,
} as const
```

規約: `wck:<kebab-case-feature>`。すべて 1 箇所で定義し、ハードコード禁止。

### SSR 安全な低レベルラッパ（`safe-storage.ts`）

`typeof window === 'undefined'` ガードを内蔵。読み出し時は対応する zod スキーマ（`storage/schema.ts`）で必ず検証し、**スキーマ不一致・破損・旧バージョンは握り潰して `null` を返す**（古い `version` のデータは無視 or マイグレーション）。これにより不正な localStorage がアプリをクラッシュさせない。

### 型安全 `useLocalStorage` フック（hydration mismatch 回避）

```typescript
// src/lib/hooks/use-local-storage.ts （'use client'）
// 設計要点:
// 1. 初期 state は「常に defaultValue」で返す（サーバ・初回クライアントレンダーを一致させる）
// 2. useEffect マウント後に localStorage を読み、zod 検証して setState で上書き
// 3. mounted フラグを併せて返し、UI 側が「未水和中はプレースホルダ表示」を選べる
//    （budget-app の ThemeToggle と同一パターン）
// 4. 値更新時は state 更新 + safeStorage.set + 同一タブ内 storage イベント発火（任意で複数フック同期）
export function useLocalStorage<T>(
  key: string,
  schema: ZodType<T>,
  defaultValue: T,
): { value: T; setValue: (v: T | ((p: T) => T)) => void; mounted: boolean }
```

この基盤の上に機能別ラッパ（`use-favorite-team` / `use-predictions` / `use-diagnosis-result` / `use-learning-progress`）を薄く重ねる。hydration mismatch は「初回レンダーは必ず defaultValue + `mounted` ガード」で構造的に回避する（budget-app の `ThemeToggle` / `layout.tsx` の即時テーマスクリプトと同じ思想）。

---

## 7. ルーティング設計

| ルート | ページ | 使用 template | 主な organisms | レンダリング |
| --- | --- | --- | --- | --- |
| `/` | ホーム | HomeTemplate | HomeHero, MatchSchedule(直近), GlossaryList(一部) | SSG（静的） |
| `/matches` | 試合日程 | DefaultTemplate | MatchSchedule（全104試合・FilterTabs） | SSG + クライアント絞込 |
| `/bracket` | ブラケット | DefaultTemplate | BracketView | SSG |
| `/diagnosis` | 推し国診断 | QuizTemplate | DiagnosisQuiz, DiagnosisResultCard | SSG（ロジックはClient） |
| `/countries` | 国図鑑一覧 | ListDetailTemplate | GroupStandings or CountryList | SSG |
| `/countries/[code]` | 国詳細 | ListDetailTemplate | CountryDetailPanel | SSG（generateStaticParams で48国） |
| `/rules` | ルール一覧 | ListDetailTemplate | RuleLessonCard 一覧 | SSG |
| `/rules/[slug]` | ルールレッスン | ListDetailTemplate | RuleLessonViewer（+OffsideSimulator） | SSG（generateStaticParams） |
| `/glossary` | 用語じてん | DefaultTemplate | GlossaryList | SSG + クライアント検索 |
| `/predictions` | 勝敗予想 | DefaultTemplate | PredictionBoard | SSG（予想はClient/localStorage） |

**Next.js 16 のポイント（context7 で確認済み）**:
- 動的ルート（`[code]`, `[slug]`）は `generateStaticParams()` で全件をビルド時に静的生成。`export const dynamicParams = false` を付け、未定義パラメータは 404（`not-found.tsx`）に倒す。
- ページの `params` は **Promise**（`const { code } = await params`）。budget-app には動的ルートが無いため、ここは本アプリ初採用 — frontend-developer は必ず `await params` で受けること。
- 各 `page.tsx` / `[code]/page.tsx` に `generateMetadata` を実装（国名・レッスン名を title/OGP に反映）。
- バックエンド呼び出しが無いので `'use cache'` や ISR は不要。全ページ純 SSG。

---

## 8. 状態管理方針

- **Server Components 中心**: データ表示（日程・順位・国図鑑・ルール・用語）はすべて Server Component が `getRepository()` から取得し描画。クライアント JS を最小化。
- **クライアント状態は localStorage フックに集約**: 推し国・予想・診断結果・学習進捗は `useLocalStorage` 系フックがローカルに保持。グローバルストア（Redux/Zustand）は不要。
- **React Context は最小限**: 「推し国」は複数 organisms（Header のバッジ表示・国図鑑・診断結果）で参照されるため、`FavoriteTeamProvider`（Context + useLocalStorage）を**1つだけ**導入し RootLayout 直下に配置。それ以外（予想・診断）は使用箇所が局所的なのでフック直利用で十分。
- **診断クイズの進行状態**は `DiagnosisQuiz` organism 内の `useReducer`/`useState` でローカル管理し、完了時のみ `useDiagnosisResult` で永続化。

---

## 9. インタラクティブ要素の技術選定

外部依存を増やさず Tailwind v4 + 標準 Web API で実装する方針。

- **OffsideSimulator（ドラッグ操作）**: ライブラリ不使用。Pointer Events（`onPointerDown/Move/Up` + `setPointerCapture`）で選手アイコンを横移動させ、最終ライン（DFライン）との位置関係でオフサイド判定をリアルタイム表示。SVG または絶対配置 div + CSS transform。**タッチ対応（モバイル必須）は Pointer Events が一括カバー**。dnd-kit 等は過剰なので不採用。
- **BracketView（トーナメント表）**: ライブラリ不使用。CSS Grid（列=ラウンド、行=試合）+ Flex で接続線は擬似要素 or 単純ボーダーで表現。横スクロール（モバイル）は `overflow-x-auto` + スナップ。react-brackets 等の専用ライブラリは依存・スタイル制約が大きいため不採用。
- **CountdownTimer**: `use-countdown`（`setInterval` + date-fns で残差計算）。SSR では静的初期値、マウント後に駆動。
- **GlossaryList 検索 / 日程フィルタ**: クライアント `useState` での配列フィルタ。`use-debounce`（budget-app から移植）で入力デバウンス。
- **TermPopover**: ネイティブ `<details>`/`<dialog>` or 軽量自前ポップオーバー（Radix 等は導入しない）。キーボード・フォーカストラップは自前で最小実装。
- **ShareButton**: `navigator.share`（Web Share API）+ クリップボードフォールバック。

新規ライブラリ追加は **`zod` と `date-fns` のみ**（いずれも budget-app 実績あり）。重量級依存はゼロ。

---

## 10. テスト戦略

| レイヤ | 対象 | ツール |
| --- | --- | --- |
| ユニット（ロジック） | `normalize.ts`（生→内部型変換）, `computeStandings`（順位計算）, `diagnosis/scoring.ts`, `utils/date.ts`/`format.ts` | Vitest（純関数・jsdom 不要だが globals 利用） |
| ユニット（データ層） | `static-repository` が48国/104試合/12グループ/16会場を正しく返すこと、未確定枠の扱い | Vitest |
| ユニット（フック） | `useLocalStorage`（SSR安全・zod検証・破損データ握り潰し・mounted遷移）, `use-countdown` | Vitest + @testing-library/react（renderHook） |
| コンポーネント | atoms/molecules/organisms（MatchCard 表示、PredictionButton クリックで永続化、DiagnosisQuiz 進行、CountryFlag フォールバック） | @testing-library/react + user-event（budget-app の Button.test.tsx 形式に準拠） |
| E2E | ①ホーム→日程閲覧 ②診断を最後まで回答→結果表示→リロードで保持 ③予想を入力→リロードで保持 ④国図鑑詳細遷移 ⑤ルールレッスン+オフサイド体験 | Playwright（`tests/e2e/`） |

- テスト命名・記述は日本語（budget-app 準拠: `it('children が正しく表示される', …)`）。
- `setup.ts` は budget-app と同一（`import '@testing-library/jest-dom/vitest'`）。
- localStorage テストは jsdom の `localStorage` を `beforeEach` でクリア。
- スコープが「観て学ぶ」体験中心のため、**ロジック純関数（正規化・順位計算・診断スコアリング）のユニット網羅**を最優先カバレッジ目標とする。

---

## 11. パフォーマンス / SEO / A11y

**パフォーマンス（モバイル前提）**
- 全ページ純 SSG（外部 fetch なし）→ TTFB 最小・LCP 良好。
- Server Components 中心でクライアント JS を最小化。`'use client'` は インタラクティブ organisms/molecules に限定。
- 国旗は第一候補を**絵文字**（画像リクエストゼロ）。画像が必要な箇所のみ `next/image`（flagcdn 等の remote は `next.config.ts` の `images.remotePatterns` 許可、`sizes` 指定、LCP 画像は `priority`）。
- フォントは `next/font/google`（日本語主体のため Noto Sans JP の必要グリフのみ subset）。CLS 防止のため `display: swap`。

**SEO**
- ルートごとに `generateMetadata`（title/description/OGP/canonical）。国詳細・レッスンは固有メタ。
- `app/sitemap.ts`（48国 + レッスン + 主要ルートを列挙）と `app/robots.ts` を追加。
- OGP は `app/opengraph-image.tsx`（`next/og`）でブランド画像を生成。
- 構造化データ（任意）: 試合日程に `SportsEvent` JSON-LD を付与可。

**A11y（初心者・モバイル・キーボード）**
- セマンティック HTML（`<nav>`/`<main>`/`<table>` で順位表 / `<button>` で操作）。
- フォーカスリング可視・キーボード操作完備（診断は矢印/Enter で選択可能に）。`SegmentedControl`/`PredictionButton` は `role`/`aria-checked`（budget-app の ThemeToggle radiogroup パターン踏襲）。
- OffsideSimulator はドラッグ不能ユーザー向けにボタン（←/→）操作の代替手段を必ず併設。
- コントラスト比 AA 以上（`@theme` トークンで管理）。`lang="ja"`、`viewport-fit=cover`、44px 以上のタップ領域。
- 動きに敏感なユーザー向けに `prefers-reduced-motion` でカウントダウン/アニメを抑制。

---

## 実装ガイド

### frontend-developer 向け
- まず atoms（CountryFlag, Score, Chip, SegmentedControl, EmptyState）→ molecules → organisms → templates の順で実装（下位から）。各コンポーネントは指定階層ディレクトリに `Xxx.tsx` / `Xxx.test.tsx` / `index.ts` の3点セットで作成。
- データは必ず Server Component で `getRepository()` から取得し props で下層へ流す。JSON を component から直接 import しない。
- `'use client'` は CountdownTimer, OffsideSimulator, DiagnosisQuiz, PredictionBoard, GlossaryList, BottomNav, FilterTabs 等インタラクティブ要素に限定。
- localStorage は必ず `useLocalStorage`（+ zod スキーマ）経由。直接 `localStorage.getItem` を component に書かない。hydration 対策は `mounted` ガードで（ThemeToggle 参照）。
- 動的ルートの `params` は `await params` で受ける（Next.js 16）。`generateStaticParams` + `dynamicParams = false` を必ず付ける。
- `cn()`・カラーは `@theme` トークン経由（ハードコード hex 禁止）。budget-app の Button/ThemeToggle/error.tsx/loading.tsx をスタイル・構造の参照実装とする。

### backend-developer 向け
- 本 MVP に Server Actions / DB / 認証は無い。担当はデータ層（`src/lib/data/`）と純ロジック。
- `repository.ts`（インターフェース）→ `normalize.ts`（openfootball 生→内部型の純関数）→ `static-repository.ts`（JSON実装）→ `index.ts`（ファクトリ）を実装。`getRepository()` を唯一の公開エントリにする。
- `teams.json` / `stadiums.json` / `groups.json` / `terms.json` / `rules.json` / `players.json` を整備。特に **teams.json の `nameEn`（openfootball 表記との一致）と `code`/`nameJa`/`flagEmoji` のマッピング精度**が全機能の土台。raw 試合データの `team1`/`team2`/`ground` 文字列と完全一致させること。
- 順位計算 `computeStandings(matches)`・診断スコアリング `score(answers)` を純関数として実装し、ユニットテストを最優先で付ける。
- ライブ API 差し替え余地: `liveRepository`（同インターフェース）を将来追加する想定で、`getGroupStandings` のロジックは `computeStandings` に隔離しておく。
