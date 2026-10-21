# 原価電卓（genka-dentaku）技術アーキテクチャ設計書

- **日付**: 2026-07-09 / **担当**: code-architect（CTO 配下・設計専任、コードは書かない）
- **役割**: frontend-developer / backend-developer がそのまま着手できる設計図。ファイル構成・型契約（zod）・純関数シグネチャ・依存方向を確定する。
- **入力文脈（正の順）**: (1) `docs/product/genka-dentaku-prd.md`（計算・データモデル・ゲーティングの**唯一の正**。特に第0/5/9/10章と**第12章 確定裁定**）、(2) `docs/product/genka-dentaku-design-spec.md`（トークン・コンポーネント目録）、(3) `docs/finance/genka-dentaku-costs.md`、(4) `docs/strategy/restaurant-cost-calculator-brief.md`、(5) `CLAUDE.md`、(6) 参照アプリ `apps/worldcup-kickoff/`（設定の手本。**静的エクスポート差分あり**）。
- **技術裏取り注記**: context7 MCP は本セッションのツールに提供されなかったため、Next.js 16 の `output:'export'`／metadata routes／`ImageResponse` の静的互換、Web Crypto **Ed25519** 対応、Node 22 の `.mts` 実行は各公式ドキュメント（Next.js / MDN / Node.js）を Web で一次確認。zod v4 API は参照アプリ実コード（`zod ^4.4.3`）で実物確認した。

## 目次
0. 概要 / 1. 技術スタックと選定理由 / 2. ディレクトリツリー / 3. ドメインモデル（zod） / 4. 永続化・マイグレーション / 5. 再計算エンジン / 6. ライセンスキー + mint / 7. Free/Pro ゲーティング / 8. ページマップ + SEO / 9. Atomic Design / 10. テスト戦略 / 11. ビルド・デプロイ / 12. 依存リスト / 13. 実装順序（TDD） / 14. リスクとトレードオフ

---

## 0. 概要

**原価電卓**は、日本の個人経営飲食店オーナー向けの**完全クライアントサイド メニュー原価計算ツール**。サーバー・サインアップ・外部送信を持たず、全データ（レシピ・仕入価格）は端末の `localStorage` にのみ保存する。

- **wedge**: 「食材の仕入れ値を1つ直すだけで、それを使う全メニューの原価率が即座に再計算される」。これを保証するため、**派生値（有効単価・原価・原価率・粗利・信号色・順位）は一切永続化せず、常に純関数で算出**する（PRD 第9章／本書 第5章）。
- **収益**: フリーミアム。Free = メニュー3件＋CSV/PDF 不可。Pro = ¥980/月・**¥9,800/年（主 CTA）**。Stripe Payment Link ＋ **オフライン検証のライセンスキー**（バックエンド不要）。
- **静的エクスポート方針（最重要）**: Next.js 16 App Router を **`output:'export'`** でビルドし **Cloudflare Pages 無料枠**へデプロイ。server actions / app/api / middleware / ISR は**一切使わない**。ツール本体（`/app`）は `'use client'` の**クライアントアイランド**、ランディング等は静的 Server Component。

---

## 1. 技術スタックと選定理由

### 1.1 スタック（制約 C1）

| レイヤ | 採用 | 理由 |
| --- | --- | --- |
| フレームワーク | **Next.js 16.2.6** App Router + `output:'export'` | 静的生成＋メタデータ規約を型安全に。SPA を静的配信でき CF Pages 無料枠に載る |
| UI | **React 19.2.6 / react-dom 19.2.6** | `useSyncExternalStore` による hydration 安全な localStorage 購読（参照アプリ手本） |
| 言語 | **TypeScript ^5**（strict） | zod 由来型を全層の契約に |
| スタイル | **Tailwind CSS v4**（`@theme`）+ `@tailwindcss/postcss ^4` | design-spec トークンを `@theme` にマップ。ハードコード hex 禁止 |
| クラス結合 | `clsx ^2.1.1` + `tailwind-merge ^3.6.0`（`cn()`） | 参照 `src/lib/utils/cn.ts` 踏襲 |
| アイコン | `lucide-react ^1.17.0` | 個別 import でツリーシェイク。○/△/⬢・錠前・王冠等 |
| 検証 | `zod ^4.4.3` | localStorage/インポートの実行時検証＋`z.infer`。参照と同一版・同一 API |
| ホスティング | **Cloudflare Pages 無料枠**（第一）/ Vercel Pro（次点） | CFO 確定：CF は商用可・帯域無制限・¥0。Vercel Hobby は決済リンク設置で商用→Pro 必須 |
| パッケージ管理 | **pnpm@10.29.2**（node>=22 / pnpm>=10.16） | cooldown・only-allow のサプライチェーン規約 |

### 1.2 「入れない」判断（新規 runtime 依存＝ゼロ、制約 C2）

- **date-fns 不採用**: 有効期限・出力日時の表示は **`Intl.DateTimeFormat`（ゼロ依存）**、残日数は `(exp - now)/86400000` の素の算術で足りる。
- **next/image 不採用**: 写真素材不要。装飾は CSS ＋ インライン SVG。よって `images.unoptimized:true` は**不要**（next/image を使う場合のみ静的エクスポートで必須になる設定。使わないので付けない）。ラスタ画像が将来必要な時のみ追加する。
- **next/font 不採用（webフォント・ゼロ／CPO 裁定）**: 参照は `next/font/google`（Noto Sans JP）だが本アプリは **webフォントを一切読み込まない**。`--font-sans` は日本語ゴシックのシステムスタック、`--font-num`（主役数字）は**システム等幅スタック**（`ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace`）。ビルド時フェッチも無く完全オフライン・最速 LCP・CLS ゼロ。**参照アプリからの意図的な差分**。
- **状態管理ライブラリ不採用**: `CanonicalState` を `useLocalStorage`（zod・hydration 安全）で永続化＋Context 配布、派生値は純セレクタ＋`useMemo`（第4/5章）。
- **PDF/CSV/暗号ライブラリ不採用**: PDF＝`@media print`＋`window.print()`、CSV＝`Blob`（UTF-8 **BOM 付き**・CRLF）、暗号＝**Web Crypto（Ed25519）**。全てブラウザ標準でゼロ依存。

> やむを得ず追加が要る場合のみ、依存名・用途・代替検討・必要理由を明記し **<span style="color:red">supply-chain-auditor レビュー対象</span>** として赤字 flag（本設計では発生しない）。

### 1.3 静的エクスポートの裏取り（要点）

- **動く**: `sitemap.ts`/`robots.ts`/`manifest.ts`（ビルド時に静的ファイル生成）、`icon.tsx`/`apple-icon.tsx`/`opengraph-image.tsx`（`ImageResponse`＝Satori でビルド時 PNG）、`metadata` API。file convention としてビルド時解決のため `output:'export'` と両立（Next.js 公式 Static Exports / Metadata Files で確認）。
- **動かない（禁止）**: server actions / app/api / middleware / ISR（`export const revalidate`）/ 動的リクエスト読取。動的ルート無しのため `generateStaticParams` も不要。
- **参照アプリ差分**: worldcup-kickoff は `next.config` 空・`sitemap.ts` が `async`＋`getRepository()`・ホームが `revalidate=3600`（ISR）＝**静的エクスポートではない**。本アプリは (a) `next.config` に `output:'export'`、(b) `sitemap/robots/manifest` は**同期**（データ取得なし）、(c) `revalidate` **不使用**。書き方は手本に厳密に倣い、この3点のみ差し替える。

---

## 2. ディレクトリツリー

`apps/genka-dentaku/` 配下（実ファイル名レベル。テストは同居 `X.test.tsx` / `x.test.ts`）。

```
apps/genka-dentaku/
├── package.json
├── pnpm-workspace.yaml            # minimumReleaseAge:10080 等（手本どおり）
├── tsconfig.json                  # 手本どおり（"**/*.mts" を include に含む）
├── next.config.ts                 # ★ output:'export'（差分）
├── postcss.config.mjs             # @tailwindcss/postcss（手本どおり）
├── eslint.config.mjs              # 手本どおり
├── vitest.config.ts               # jsdom/globals/setupFiles/alias（手本どおり）
├── playwright.config.ts           # testDir tests/e2e / webServer pnpm dev :3000（手本どおり）
├── .gitignore                     # 手本 + ★ /.secrets/ を追加
├── README.md
├── next-env.d.ts                  # 自動生成
├── scripts/
│   └── mint-license-key.mts       # ★ Ed25519 keygen / mint（Node 22・pnpm mint-key）
├── tests/
│   ├── setup.ts                   # @testing-library/jest-dom/vitest（手本どおり）
│   └── e2e/
│       ├── wedge.spec.ts          # 食材価格変更→全メニュー即再計算
│       └── export-gating.spec.ts  # Free ロック→Pro 解錠でエクスポート可
└── src/
    ├── app/
    │   ├── layout.tsx             # RootLayout（webフォント無し・AppShell は /app 側）
    │   ├── globals.css            # @import "tailwindcss"; @theme{...}（design-spec §2 値）
    │   ├── icon.tsx               # ImageResponse（ネイビー地・¥/電卓モチーフ）
    │   ├── apple-icon.tsx         # ImageResponse 180x180
    │   ├── opengraph-image.tsx    # ImageResponse 1200x630（全ルート既定 OG）
    │   ├── sitemap.ts             # ★ 同期・静的ルートのみ
    │   ├── robots.ts              # ★ 同期
    │   ├── manifest.ts            # ★ 同期・PWA
    │   ├── page.tsx               # ランディング（Server, SEO）
    │   ├── app/
    │   │   └── page.tsx           # ツール SPA（Server 薄皮 → <AppRoot/> client island, robots:noindex）
    │   ├── pricing/
    │   │   └── page.tsx           # 料金（Server + 小 client island: PlanToggle/LicenseKeyField）
    │   ├── faq/
    │   │   └── page.tsx           # FAQ（Server, SEO）
    │   └── legal/
    │       ├── tokushoho/page.tsx # 特定商取引法表記（Server）
    │       └── privacy/page.tsx   # プライバシーポリシー（Server）
    ├── components/
    │   ├── atoms/                 # Button/IconButton/Icon/TextInput/NumberInput/UnitSelect/
    │   │                          #   Select/SegmentedControl/Toggle/Slider/Checkbox/Badge/
    │   │                          #   StatusDot/Label/HelperText/Spinner/Skeleton/Divider/Chip
    │   ├── molecules/             # FormField/NumberStepper/TaxToggle/ComputedReadout/
    │   │                          #   IngredientPicker/RecipeLineRow/CostRatePill/CostRateMeter/
    │   │                          #   KpiCard/MenuRow/SimulationSlider/BeforeAfterStat/
    │   │                          #   PlanFeatureRow/PlanToggle/SearchBar/SortControl/EmptyState/
    │   │                          #   TrustBadge/UpgradePrompt/LicenseKeyField/ThresholdSetting/
    │   │                          #   SampleDataBanner/Toast/IngredientForm
    │   ├── organisms/             # AppHeader/BottomNav/KpiSummary/DashboardMenuList/
    │   │                          #   IngredientListPanel/IngredientFormSheet/RecipeEditor/
    │   │                          #   LiveCostSummary/SimulationPanel/PricingTable/
    │   │                          #   UpgradeGateBanner/OnboardingSheet/SemaphoreLegend/
    │   │                          #   SettingsPanel/RecalcIndicator/MarketingHero/FaqAccordion/
    │   │                          #   LegalPageLayout/DataRecoveryDialog/BackupPanel/
    │   │                          #   PrintableMenuReport/PrintableCostSheet
    │   └── templates/
    │       ├── AppShell/          # モバイル枠（AppHeader+main+BottomNav+FAB+シート/トーストポータル）
    │       └── MarketingTemplate/ # LP/料金/法務/FAQ（hero+sections+footer）
    │   # 各コンポーネントは PascalCase ディレクトリ = { X.tsx, X.test.tsx, index.ts }
    ├── lib/
    │   ├── constants/
    │   │   ├── storage-keys.ts    # STORAGE_KEY='genka-dentaku' / :backup / SCHEMA_VERSION
    │   │   ├── limits.ts          # FREE_MAX_MENUS=3
    │   │   ├── plans.ts           # 価格・期間（monthly 38d / annual 373d）・GRACE_DAYS=7
    │   │   └── units.ts           # WEIGHT_UNITS/VOLUME_UNITS/COUNT_UNIT_PRESETS
    │   ├── domain/                # ★ 純関数・型（テスト網羅対象）
    │   │   ├── schema.ts          # zod スキーマ + z.infer 型（型契約の単一源）
    │   │   ├── units.ts           # dimensionOf/convertQuantity ほか
    │   │   ├── tax.ts             # toExTax/toIncTax
    │   │   ├── rounding.ts        # roundYen/ratioToPercent1/roundUnitPrice2/ceilToUnit
    │   │   ├── cost.ts            # effectiveUnitPrice/lineCost/menuCost/costRate/grossMargin
    │   │   ├── simulation.ts      # recommendedSellExTax/simulatedRate
    │   │   ├── alert.ts           # alertStatus（信号色判定）
    │   │   ├── selectors.ts       # MenuSummary/dashboard/kpi 派生セレクタ
    │   │   └── index.ts           # バレル re-export
    │   ├── storage/
    │   │   ├── safe-storage.ts    # 手本どおり（SSR 安全・zod・破損 null 化）
    │   │   ├── migrations.ts      # MIGRATIONS 登録＋migrateToLatest
    │   │   └── canonical-store.ts # load/save/quarantine/reset/DEFAULT_STATE
    │   ├── license/
    │   │   ├── keys.ts            # 埋め込み公開鍵・PREFIX・SIG 長
    │   │   ├── codec.ts           # base64url・parseLicenseKey
    │   │   └── verify.ts          # verifyLicenseKey（Ed25519）/isEd25519Supported
    │   ├── backup/
    │   │   ├── export-json.ts     # JSON エクスポート（Free）
    │   │   └── import-json.ts     # JSON 検証・移行・取り込み（Free）
    │   ├── export/
    │   │   ├── csv.ts             # BOM+CRLF CSV 生成（Pro）
    │   │   └── print.ts           # window.print トリガ（Pro）
    │   ├── sample/
    │   │   └── sample-data.ts     # PRD 10.2 の食材＋唐揚げ定食（isSample:true）
    │   ├── state/
    │   │   └── AppStateProvider.tsx  # Context + actions（'use client'）
    │   ├── hooks/
    │   │   ├── use-local-storage.ts  # 手本どおり（useSyncExternalStore・mounted）
    │   │   ├── use-canonical-store.ts# CanonicalState 永続ストア
    │   │   ├── use-app-state.ts      # useContext ラッパ
    │   │   ├── use-license.ts        # 検証結果の派生（isPro/status/canAddMenu）
    │   │   ├── use-dashboard.ts      # KPI+悪い順一覧（useMemo）
    │   │   └── use-menu-summary.ts   # 単一メニュー派生
    │   └── utils/
    │       ├── cn.ts              # 手本どおり
    │       ├── format.ts          # 円/％/日時（Intl）表示フォーマット
    │       └── id.ts              # crypto.randomUUID ラッパ
    └── styles/                    # （任意）design-spec が示す theme.css を使う場合。既定は globals.css に集約
```

---

## 3. ドメインモデル（zod スキーマ）

型契約の**単一の正**は `src/lib/domain/schema.ts`。zod スキーマから `z.infer` で型を導出し、domain 純関数・storage・UI はすべてこの型を import する。PRD 第9章のエンティティ名（Ingredient / Menu / RecipeItem / Settings / License / Meta）に厳密に一致させる。

> **zod v4 API 確認**: 下記で使う `z.object / z.string / z.number / z.boolean / z.enum / z.literal / z.union / z.array / .min / .max / .nonnegative / .positive / .int / .nullable / .optional / .refine / .superRefine / z.infer / safeParse` はいずれも zod v4 標準 API。参照アプリ `schema.ts` の `z.object/z.literal/z.enum/z.record(key,value)/z.array/z.infer` と同一系統であることを実物確認済み。

```ts
// src/lib/domain/schema.ts
import { z } from 'zod'

/** マイグレーションの基準。localStorage ルートに保持 */
export const CURRENT_SCHEMA_VERSION = 1 as const

/** 単位の次元 */
export const dimensionSchema = z.enum(['weight', 'volume', 'count'])

/** 重量・容量は固定単位。個数系は自由文字列（個/枚/束/本/袋/玉/丁/合…）を許容 */
export const WEIGHT_UNITS = ['g', 'kg'] as const
export const VOLUME_UNITS = ['ml', 'L'] as const
export const COUNT_UNIT_PRESETS = ['個', '枚', '束', '本', '袋', '玉', '丁', '合', '杯', '尾', 'パック'] as const

/** 単位は文字列。妥当性は Ingredient で dimension と突き合わせる（下の superRefine） */
export const unitSchema = z.string().min(1)

/** 税率（実運用は 8 | 10 を主用。境界は 0..100 で守る） */
const taxRateSchema = z.number().min(0).max(100)

/** 食材（有効単価は保存しない＝都度算出） */
export const ingredientSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(60),
    purchasePriceExTax: z.number().nonnegative(), // 税抜正規化（計算の正）。円
    inputPrice: z.number().nonnegative(),         // ユーザー入力額（再表示・再編集用）。円
    priceIncludesTax: z.boolean(),                // 入力が税込か
    taxRate: taxRateSchema,                        // 8 | 10 等
    purchaseQuantity: z.number().positive(),       // 購入量（>0：ゼロ除算防止）
    unit: unitSchema,                              // g/kg/ml/L/個…（dimension と整合必須）
    dimension: dimensionSchema,
    yieldPercent: z.number().min(1).max(100),      // 歩留まり 1..100（0 禁止＝ゼロ除算防止）
    isSample: z.boolean(),                          // サンプル由来（一括クリア識別）
    createdAt: z.string(),                          // ISO8601
    updatedAt: z.string(),
  })
  .superRefine((ing, ctx) => {
    if (ing.dimension === 'weight' && !(WEIGHT_UNITS as readonly string[]).includes(ing.unit)) {
      ctx.addIssue({ code: 'custom', path: ['unit'], message: 'weight の単位は g|kg のみ' })
    }
    if (ing.dimension === 'volume' && !(VOLUME_UNITS as readonly string[]).includes(ing.unit)) {
      ctx.addIssue({ code: 'custom', path: ['unit'], message: 'volume の単位は ml|L のみ' })
    }
    // count は任意の非空文字列を許容（個≠枚≠束…換算不可、第5章）
  })

/** 材料明細（使用量 0 は許容＝PRD 8.10）。単位互換は食材参照時に engine が判定 */
export const recipeItemSchema = z.object({
  ingredientId: z.string().min(1),
  quantity: z.number().nonnegative(),
  unit: unitSchema,
})

/** メニュー（原価・原価率・粗利・信号色は保存しない＝都度算出） */
export const menuSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  sellPriceExTax: z.number().nonnegative(), // 税抜正規化。0 は要確認
  sellInputPrice: z.number().nonnegative(),
  sellPriceIncludesTax: z.boolean(),
  sellTaxRate: taxRateSchema,                // 10 | 8
  items: z.array(recipeItemSchema),
  isSample: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** 設定（閾値・税既定・シミュ丸め） */
export const settingsSchema = z
  .object({
    alertWarnThreshold: z.number().min(0).max(100),   // 既定 30（緑/黄 境界）
    alertDangerThreshold: z.number().min(0).max(100), // 既定 35（黄/赤 境界）
    defaultIngredientTaxRate: taxRateSchema,          // 既定 8
    defaultSellTaxRate: taxRateSchema,                // 既定 10
    defaultPriceIncludesTax: z.boolean(),             // 既定 true（税込入力）
    simRoundingUnit: z.union([z.literal(1), z.literal(10), z.literal(50), z.literal(100)]), // 既定 10
    currency: z.literal('JPY'),
  })
  .refine((s) => s.alertWarnThreshold < s.alertDangerThreshold, {
    message: 'alertWarnThreshold は alertDangerThreshold より小さくすること',
    path: ['alertWarnThreshold'],
  })

/**
 * ライセンス（永続）。
 * key が真実源。plan/issuedAt/expiresAt/status は署名検証で「都度導出」し永続しない
 * ＝(1) 派生値を保存しない原則、(2) localStorage を手編集して Pro を詐称できない耐タンパー、の両立。
 */
export const licenseSchema = z.object({
  key: z.string().nullable(),          // 署名済みキー（GENKA-...）。未解錠は null
  lastSeenDate: z.string().nullable(), // 時計巻き戻しのソフト検知用（PRD 5.4 / 裁定2）
})

/** メタ（オンボーディング・サンプル投入フラグ） */
export const metaSchema = z.object({
  onboardingDone: z.boolean(),
  sampleSeeded: z.boolean(),
})

/** 永続ルート状態（単一キー genka-dentaku に集約） */
export const canonicalStateSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  meta: metaSchema,
  settings: settingsSchema,
  ingredients: z.array(ingredientSchema),
  menus: z.array(menuSchema),
  license: licenseSchema,
})

/** キー内の署名対象ペイロード（第6章） */
export const licensePayloadSchema = z.object({
  plan: z.enum(['monthly', 'annual']),
  iss: z.string().min(1),           // 発行者識別（例 'genka-dentaku'）
  iat: z.number().int().positive(), // 発行 epoch 秒
  exp: z.number().int().positive(), // 失効 epoch 秒（monthly=+38d / annual=+373d を mint 時に設定）
  ref: z.string().optional(),       // 購入識別子（Stripe 注文ID 等・任意。心理的抑止）
})

// ── z.infer 型（アプリ全体はこれを import） ──
export type Dimension = z.infer<typeof dimensionSchema>
export type Unit = z.infer<typeof unitSchema>
export type Ingredient = z.infer<typeof ingredientSchema>
export type RecipeItem = z.infer<typeof recipeItemSchema>
export type Menu = z.infer<typeof menuSchema>
export type Settings = z.infer<typeof settingsSchema>
export type License = z.infer<typeof licenseSchema>
export type Meta = z.infer<typeof metaSchema>
export type CanonicalState = z.infer<typeof canonicalStateSchema>
export type LicensePayload = z.infer<typeof licensePayloadSchema>
```

**設計上の要点（制約 C3/C4 との整合）**
- **税抜正規化の永続**は PRD 第0.3/9章の明示要求（「内部保存は常に税抜に正規化」）。`purchasePriceExTax`/`sellPriceExTax` を保存し、`inputPrice`/`priceIncludesTax`/`taxRate` を再表示用に併持する。**ドリフト防止**：正規化は単一の純関数 `toExTax()`（第5章）を write パスでのみ呼び、インポート/マイグレーション時にも入力メタから再正規化する。exTax 系フィールドの書き込み箇所（writer）はこの正規化経路の1箇所に限定し、**不変条件テスト `purchasePriceExTax === toExTax(inputPrice, priceIncludesTax, taxRate)`（sellPriceExTax も同様）** を storage/import のテストに追加してドリフト級のバグを機械的に検出する（CTOレビュー指摘2）。
- **wedge 派生値（有効単価・原価・原価率・粗利・信号色・順位）は永続しない**（C4 の核心）。`licenseSchema` の `plan/exp/status` も同様に非永続＝署名検証で都度導出（耐タンパー）。
- **PRD 第9章との差分**: PRD の License 表は `plan/issuedAt/expiresAt/status` を保存フィールドとして列挙するが、本設計はそれらを**キーからの派生**として毎回検証で得る（手編集による Pro 詐称を防ぐ）。エンティティ名・他フィールドは PRD に完全一致。

---

## 4. 永続化・マイグレーション設計

参照アプリの `safe-storage.ts`（SSR 安全・zod 検証・破損は null 化）と `use-local-storage.ts`（`useSyncExternalStore`、`getServerSnapshot=default`、`mounted` フラグ）を**手本に踏襲**。これが C10（hydration mismatch 回避）と C3（破損耐性）の核。

### 4.1 キー構成（PRD 9.2）
- ルート: **`genka-dentaku`**（`CanonicalState` の JSON 文字列、単一キー集約）。
- 破損退避: **`genka-dentaku:backup`**（読込失敗時に破損内容を上書き前に退避）。
- 定数は `src/lib/constants/storage-keys.ts` に集約（ハードコード禁止）。

```ts
// src/lib/constants/storage-keys.ts
export const STORAGE_KEY = 'genka-dentaku'
export const STORAGE_BACKUP_KEY = 'genka-dentaku:backup'
export { CURRENT_SCHEMA_VERSION } from '@/lib/domain/schema'
```

### 4.2 マイグレーション（PRD 9.3）

```ts
// src/lib/storage/migrations.ts
export type Migration = (raw: Record<string, unknown>) => Record<string, unknown>

/** from-version → 次版へ上げる関数。現行=1 のため空。将来の例:
 *   1: (raw) => ({ ...raw, schemaVersion: 2, settings: { ...raw.settings, newField: default } }) */
export const MIGRATIONS: Record<number, Migration> = {}

/** 版を順に最新へ。移行不能（未知/欠落/未来版）は throw せず raw をそのまま返し、後段の検証に破損判定を委ねる */
export function migrateToLatest(raw: unknown): unknown
```
- 方針: 後方互換の**デフォルト補完**を基本、破壊的変更のみ版を上げる。インポート（第4.4）も同じ経路を通す。

### 4.3 破損復旧・未来版（PRD 8.8 / 9.3・制約 C3）

`safe-storage` の「破損→null→既定へフォールバック」だけでは**黙ってデータを消し得る**。C3（「生データをエクスポートしてから安全にリセット」）を満たすため、`canonical-store.ts` に**分類付きロード**を追加する。

```ts
// src/lib/storage/canonical-store.ts
export const DEFAULT_STATE: CanonicalState  // schemaVersion:1, meta 初期, settings 既定, 空配列, license{null,null}

export type LoadResult =
  | { status: 'empty' }                       // キー無し（初回）
  | { status: 'ok'; state: CanonicalState }   // 検証OK（必要なら移行済み）
  | { status: 'future'; rawText: string }     // 保存版 > 現行 → 読取専用/拒否
  | { status: 'corrupt'; rawText: string }    // JSON/スキーマ破損

export function loadCanonicalState(): LoadResult // 生読み→版ピーク→migrate→safeParse
export function quarantineCorrupt(rawText: string): void        // :backup へ退避（上書き前）
export function saveCanonicalState(state: CanonicalState): void // QuotaExceededError を捕捉（PRD 8.7）
export function resetCanonicalState(): CanonicalState           // DEFAULT_STATE を書込み返す
```

- **復旧フロー**: `AppStateProvider` はマウント時に `loadCanonicalState()` を1度実行。`corrupt`/`future` の場合、いかなる mutation よりも先に **`DataRecoveryDialog`（organism）** を表示し、(1) **破損データを JSON でダウンロード**（生 `rawText`）→ (2) `:backup` へ退避 → (3) **リセットして最初から** or **JSON バックアップから復元**、の順に導く。`ok`/`empty` のみ通常起動。ホワイトスクリーンにしない・黙って上書きしない。**ゲーティング保証（CTOレビュー指摘3）**: `AppStateProvider` は `DataRecoveryDialog` が解決（退避・エクスポート・リセット/復元のいずれか完了）するまで**全 mutation と `saveCanonicalState` をゲート**する。これにより破損 raw が反応系フック（§4.4 の黙殺フォールバック既定値）経由で上書き保存される事故を構造的に防ぐ — 分類ロード（§4.3）が常に反応系ストア（§4.4）より先に走る。

### 4.4 永続ストアフック（制約 C10・状態管理方針）

CTO 推奨どおり `useLocalStorage` を再利用する。マイグレーションは `z.preprocess` で被せる。

```ts
// src/lib/hooks/use-canonical-store.ts
import { z } from 'zod'
// マイグレーションを内包した検証スキーマ（旧版は自動移行、破損は検証失敗→既定）
const migratingSchema = z.preprocess(migrateToLatest, canonicalStateSchema) as unknown as z.ZodType<CanonicalState>

export function useCanonicalStore(): {
  state: CanonicalState
  setState: (next: CanonicalState | ((prev: CanonicalState) => CanonicalState)) => void
  mounted: boolean
}
// = useLocalStorage(STORAGE_KEY, migratingSchema, DEFAULT_STATE) の薄いラッパ
```
- `useLocalStorage` が hydration 安全（server=default）・**同一/他タブ同期**（`storage` イベント）・参照安定（snapshot キャッシュ）を担保。`mounted` が true になるまで UI は**スケルトン**を表示（C10）。
- 破損/未来版の分類は §4.3 の `loadCanonicalState()` が別途担当し、Provider がゲートする（`useLocalStorage` の silent-fallback 契約は変えない）。
- **代替案**: `useSyncExternalStore` で `LoadResult` を直接返す専用ストアを自作する案もあるが、手本の再利用性・実績を優先して上記を**推奨**とする。

### 4.5 Context Provider と mutation（`/app` 配下・'use client'）

```ts
// src/lib/state/AppStateProvider.tsx
export interface AppStateActions {
  addIngredient(input: IngredientInput): void
  updateIngredient(id: string, patch: Partial<IngredientInput>): void
  removeIngredient(id: string): { removed: true } | { removed: false; usedByMenuCount: number } // 使用中は確認要求
  confirmRemoveIngredient(id: string): void
  addMenu(input: MenuInput): { ok: true } | { ok: false; reason: 'free-limit' }  // Free 3件超は拒否
  updateMenu(id: string, patch: Partial<MenuInput>): void
  duplicateMenu(id: string): { ok: true } | { ok: false; reason: 'free-limit' }
  removeMenu(id: string): void
  addLine(menuId: string, line: RecipeItem): void
  updateLine(menuId: string, index: number, patch: Partial<RecipeItem>): void
  removeLine(menuId: string, index: number): void
  updateSettings(patch: Partial<Settings>): void
  applyLicenseKey(key: string): Promise<LicenseStatus>  // Ed25519 検証（第6章）
  clearLicense(): void
  seedSamples(): void
  clearSamples(): void
  resetAll(): void
  importState(state: CanonicalState, mode: 'replace' | 'merge'): void  // 既定 replace（PRD 4.g）
}
export interface AppStateValue {
  state: CanonicalState
  mounted: boolean
  loadIssue: LoadResult['status']
  license: LicenseStatus     // 検証由来（派生）
  actions: AppStateActions
}
export function useAppState(): AppStateValue  // Provider 外使用は throw
```
- すべての mutation は `setState`（write-through）で `CanonicalState` を更新→`saveCanonicalState`。**書き込みは常に入力メタから税抜正規化を再計算**して整合を保つ。
- **派生値はここで持たない**。`use-dashboard` / `use-menu-summary` が `state` から `useMemo` で算出（第5章）。これが「即時再計算」と「派生を保存しない」を構造的に保証する。

---

## 5. 再計算エンジン（純関数シグネチャ）

`src/lib/domain/` の純関数。すべて副作用なし・単体テスト可能。**内部はフル精度、丸めは表示時のみ**（PRD 0.5）。派生値は保存せず、セレクタ層で毎レンダー算出＋`useMemo` で最適化（制約 C4）。

### 5.1 単位換算（PRD 0.4・制約 C4）

| 次元 | 単位 | 基準（内部） | 換算則 |
| --- | --- | --- | --- |
| weight（重量） | g, kg | g | 1 kg = 1000 g |
| volume（容量） | ml, L | ml | 1 L = 1000 ml |
| count（個数） | 個/枚/束/本/袋/玉/丁/合… | 各単位そのもの | **換算なし。同一単位のみ相互利用可**（個≠枚≠束） |

```ts
// src/lib/domain/units.ts
export function dimensionOf(unit: Unit): Dimension  // g|kg→weight, ml|L→volume, その他→count
export function unitsCompatible(ingredientUnit: Unit, ingredientDim: Dimension, lineUnit: Unit): boolean
/** value[from] を to へ換算。weight/volume は係数換算、count は from===to のみ、次元不一致・count 別単位は null（ガード） */
export function convertQuantity(value: number, from: Unit, to: Unit, dimension: Dimension): number | null
```
- レシピ行の使用量単位セレクタは食材の次元と互換な単位のみ提示し**構造的に非互換入力を防ぐ**（PRD 8.1）。万一インポート等で混入した場合は engine が `unit-mismatch` を返し、該当行を「不明」扱い（原価に誤算入しない）。

### 5.2 税・原価・原価率・粗利（PRD 0.2/0.3）

```ts
// src/lib/domain/tax.ts
export function toExTax(inputPrice: number, includesTax: boolean, taxRate: number): number // 税込→税抜（フル精度）/ 税抜はそのまま
export function toIncTax(exTax: number, taxRate: number): number

// src/lib/domain/cost.ts
export type LineIssue = 'missing-ingredient' | 'unit-mismatch' | 'invalid-ingredient'
export type LineCost = { ok: true; cost: number } | { ok: false; reason: LineIssue }

/** 有効単価（税抜, 円/購入単位）= purchasePriceExTax / (purchaseQuantity × yieldPercent/100)。ゼロ除算は null */
export function effectiveUnitPrice(ing: Ingredient): number | null
/** レシピ1行の材料費（税抜, フル精度）。欠落/次元不一致は ok:false */
export function lineCost(item: RecipeItem, ing: Ingredient | undefined): LineCost
export interface MenuCost {
  total: number                       // 税抜・フル精度（各行をフル精度で合計。行ごとに丸めない）
  lines: Array<{ item: RecipeItem; cost: number | null; issue?: LineIssue }>
  issues: LineIssue[]
  hasBlockingIssue: boolean           // 材料費不明を含む → 原価は「要確認」
}
/** メニュー原価集計（税抜）。欠落食材はスキップし issues に記録（誤った原価を出さない・PRD 8.6） */
export function menuCost(menu: Menu, ingredientsById: Map<string, Ingredient>): MenuCost
/** 原価率(0..1)。売価<=0 は null（—表示）。= costExTax / sellExTax */
export function costRate(costExTax: number, sellExTax: number): number | null
/** 粗利（税抜, 円）= sellExTax - costExTax */
export function grossMargin(costExTax: number, sellExTax: number): number
```

### 5.3 シミュレーション（PRD 0.5 / 裁定3）

```ts
// src/lib/domain/simulation.ts
/** 目標原価率 r%(0<r) から推奨売価（税抜, フル精度）。cost<=0 や不能は null。= costExTax / (r/100) */
export function recommendedSellExTax(costExTax: number, targetRatePercent: number): number | null
/** 新売価での原価率(0..1)。売価<=0 は null */
export function simulatedRate(costExTax: number, newSellExTax: number): number | null
```
- 適用フロー: `recommendedSellExTax` → `ceilToUnit(v, simRoundingUnit)`（税抜・¥10 単位切り上げ＝安全側）→ 税込併記＋丸め後の実効原価率を `simulatedRate` で再表示。

### 5.4 丸め（PRD 0.5・制約 C4）

| 対象 | 規則 |
| --- | --- |
| 金額（円・原価/売価/粗利） | 四捨五入で整数（round half up、非負） |
| 原価率（%） | 小数第1位（round half up）。**色判定もこの丸め済み値で行う**（表示と一致） |
| 有効単価 | 小数第2位（round half up） |
| シミュ推奨売価 | 丸め単位（既定¥10）で**切り上げ**（実効原価率が目標以下＝安全側） |

```ts
// src/lib/domain/rounding.ts
export function roundYen(value: number): number         // 非負 half-up: Math.floor(value + 0.5)
export function ratioToPercent1(ratio: number): number  // 0..1 → 0..100 小数第1位: Math.floor(ratio*1000 + 0.5)/10（FP は +ε で補正）
export function roundUnitPrice2(value: number): number  // 小数第2位
export function ceilToUnit(value: number, unit: number): number // 切り上げ: Math.ceil(value/unit)*unit
```

### 5.5 信号色とセレクタ（PRD 0.6 / 4.e）

```ts
// src/lib/domain/alert.ts
export type AlertStatus = 'good' | 'caution' | 'danger' | 'attention' // attention=要確認
/** 丸め済み原価率%(小数第1位) と閾値から判定。null → 'attention'。良好:<warn / 注意:warn..danger / 危険:>danger */
export function alertStatus(ratePercent1: number | null, warn: number, danger: number): AlertStatus

// src/lib/domain/selectors.ts（状態×ドメインの派生。use-* フックが useMemo で呼ぶ）
export interface MenuSummary {
  menu: Menu
  costExTax: number | null; costYen: number | null      // フル精度 / roundYen 済み
  sellExTax: number | null; sellIncTax: number | null
  rate: number | null; ratePercent1: number | null      // 0..1 / 小数第1位（色判定に使用）
  marginExTax: number | null
  status: AlertStatus; issues: LineIssue[]; needsAttention: boolean // 売価0/未設定 or 材料費不明
}
export function selectIngredientsById(state: CanonicalState): Map<string, Ingredient>
export function selectMenuSummary(menu: Menu, byId: Map<string, Ingredient>, settings: Settings): MenuSummary
/** ダッシュボード順: 要確認を先頭 → 原価率降順（悪い順） → 名前昇順（PRD 4.e） */
export function selectDashboardMenus(state: CanonicalState): MenuSummary[]
export function selectMenusUsingIngredient(state: CanonicalState, ingredientId: string): Menu[]
export interface DashboardKpi { avgRatePercent1: number | null; dangerCount: number; menuCount: number; avgMarginYen: number | null }
export function selectDashboardKpi(state: CanonicalState): DashboardKpi
```

### 5.6 エッジケース（テスト設計の起点・PRD 第8章）
- **売価0/未設定** → `costRate` null → 「—」＋`attention`、ダッシュボード要確認グループ最上部。ゼロ除算なし。
- **歩留まり0 or >100** → スキーマで拒否（`min(1).max(100)`）。UI インラインエラー。`effectiveUnitPrice` も防御的に null ガード。
- **購入量0** → スキーマ拒否（`positive()`）。
- **食材削除で行が孤児化** → `menuCost` が `missing-ingredient` を記録し原価に誤算入しない。削除時は使用メニュー数を返し確認（`removeIngredient`）。
- **次元不一致 / count 別単位** → `convertQuantity` null → `unit-mismatch`。
- **丸め境界** → 33.24%→33.2 / 33.25%→33.3、¥0.5→¥1、閾値 35.0%=黄/35.1%=赤（丸め済み値で判定）。
- **使用量0の行** → 材料費0で許容。**価格0の食材** → 材料費0＋注意表示（未入力検知）。
- **巨大値/FP** → フル精度合計→表示時丸め、負値禁止。

---

## 6. ライセンスキー設計 + mint スクリプト仕様

### 6.1 キー形式（制約 C5 / PRD 5.3）
- 形式: **`GENKA-{base64url(payload)}-{base64url(signature)}`**。
- payload（署名対象・`licensePayloadSchema`）: `{ plan, iss, iat, exp, ref? }`。`exp` は **monthly=iat+38日 / annual=iat+373日**（30/365日＋約8日バッファ、裁定1）。
- 署名対象メッセージ = **`payloadB64` 文字列の UTF-8 バイト**（payload JSON ではなく base64url 文字列そのものに署名）。
- **base64url は `-` を含む**ため単純な `-` 分割は不可。Ed25519 署名は常に 64 バイト＝**base64url(無パディング) 86 文字**で固定長。これを利用し末尾から確定的に分解する:

```ts
// src/lib/license/keys.ts
export const LICENSE_PREFIX = 'GENKA-'
export const LICENSE_SIG_B64_LEN = 86 // Ed25519 64byte → base64url(unpadded)
export const LICENSE_PUBLIC_KEY_RAW_BASE64 = '<32-byte Ed25519 公開鍵の base64>' // ★埋め込み・公開して安全

// src/lib/license/codec.ts
export function base64urlEncode(bytes: Uint8Array): string
export function base64urlDecode(s: string): Uint8Array
export function parseLicenseKey(key: string): { payloadB64: string; sigB64: string } | null
//  実装: PREFIX 除去 → body 末尾 86 文字を sig、その直前が '-' であることを確認、前半を payloadB64。
```

### 6.2 クライアント検証（Web Crypto Ed25519）

> **裏取り（MDN / caniuse）**: `crypto.subtle` の Ed25519 は **Chrome 137（2025-08 安定）/ Firefox 129（2024-08）/ Safari 17.0** で対応。2026年時点で主要ブラウザは対応済みだが Chrome は比較的最近のため、**feature-detect ＋ グレースフルデグレード**を設ける（新依存を足さない）。

```ts
// src/lib/license/verify.ts
export interface LicenseStatus {
  status: 'none' | 'active' | 'grace' | 'expired' | 'invalid' | 'unsupported'
  plan: 'monthly' | 'annual' | null
  issuedAt: string | null
  expiresAt: string | null
  isPro: boolean           // status === 'active' || 'grace'
  inGrace: boolean         // 期限まで残り GRACE_DAYS 以内（更新バナー表示）
  daysRemaining: number | null
}
export function isEd25519Supported(): Promise<boolean> // importKey を試行し可否判定
/** 署名検証＋失効判定。now は注入可（テスト用）。詳細は 6.3 */
export async function verifyLicenseKey(key: string | null, nowMs?: number): Promise<LicenseStatus>
```
- 検証: `parseLicenseKey` → `importKey('raw', pubBytes, {name:'Ed25519'}, false, ['verify'])` → `verify({name:'Ed25519'}, pub, sigBytes, utf8(payloadB64))` → OK なら payload を `licensePayloadSchema.safeParse` → 失効判定。
- **公開鍵はソース埋め込み**（公開して安全）。**秘密鍵はリポジトリに絶対に置かない**（`.secrets/`＝gitignore、または env から git 外で読む）。
- **非対応ブラウザ**: `isEd25519Supported()` false → `status:'unsupported'`＝Free 相当で動作させつつ「ブラウザを更新すると Pro を解錠できます」を表示。**入力キーは保持**し、更新後の再検証で解錠。新依存（純JS Ed25519）は入れない（必要性がデータで確認できた場合のみ vendored 実装を supply-chain-auditor レビュー付きで検討）。

### 6.3 失効・猶予（裁定1・PRD 5.4）
`verifyLicenseKey` の状態遷移（`GRACE_DAYS=7`）:
- `now < exp - 7d` → **active**（Pro、バナー無し）
- `exp - 7d ≤ now < exp` → **grace**（Pro 継続、**更新バナー**「まもなく有効期限です／更新してください」）
- `now ≥ exp` → **expired**（**Free 降格**。CSV/PDF・一括適用を再ロック、新規メニュー追加は3件制限。**データは常に保持**・既存4件以上も閲覧編集可）
- 実効 Pro 期間: monthly 38日 / annual 373日（末尾7日が更新バナー期間）。
- **時計巻き戻し**: `license.lastSeenDate` を毎起動更新。大きな逆行を検知したら注意表示のみ（強制ロックしない・善意運用、裁定2）。

### 6.4 mint スクリプト（`scripts/mint-license-key.mts`・Node 22・追加依存ゼロ）

> **裏取り（Node.js 公式）**: `--experimental-strip-types` は Node **22.6.0** で追加、**22.18.0** 以降は type stripping が既定で無効フラグ不要。`.mts` は常に ESM 実行。**erasable な TS 構文のみ**（enum/parameter-property/namespace 不使用）で書けば追加依存（tsx 等）なしで実行できる。`engines: node>=22` の全域をカバーするため実行コマンドに `--experimental-strip-types` を付ける（22.18+ では no-op）。

- **モード1 `keygen`**: `node:crypto` の `generateKeyPairSync('ed25519')` で鍵ペアを一度だけ生成。**公開鍵**は raw 32 バイト（JWK の `x` を decode）を base64 で stdout に出力→`src/lib/license/keys.ts` の `LICENSE_PUBLIC_KEY_RAW_BASE64` へ埋め込む。**秘密鍵**は PKCS8 PEM を `.secrets/genka-ed25519.key`（gitignore 対象）へ書き出す（または env へ）。
- **モード2 `mint`**: 秘密鍵（env `GENKA_SIGNING_KEY_PATH` または `.secrets/...`）を読み、`--plan monthly|annual`（＋任意 `--ref <orderId>`）から `payload` を構築し `exp` を裁定1どおり設定→`payloadB64`→`crypto.sign(null, Buffer.from(payloadB64), privKey)`（Ed25519 は algorithm=null）で 64 バイト署名→`GENKA-...` を stdout。
- **実行**: `pnpm mint-key -- keygen` / `pnpm mint-key -- mint --plan annual --ref cs_123`。`package.json`:
  ```json
  "scripts": { "mint-key": "node --experimental-strip-types scripts/mint-license-key.mts" }
  ```
- **.gitignore に追記**: `/.secrets/`（`.env*`/`*.pem` は手本で既に無視）。

### 6.5 フルフィルメント（裁定1）

```
【手動（MVP）】
  購入者 ── Stripe Payment Link で購入（年額 主CTA） ──▶ Stripe が領収書メール
     │
     └─ 購入者が領収書/注文IDを Hiro へ連絡
                     │
   Hiro ── pnpm mint-key -- mint --plan annual --ref <orderId> ──▶ GENKA-...キー
                     │
     └─ Hiro が Gmail(MCP) でキーを購入者へ送付 ──▶ 購入者が /pricing でキー入力 → Pro 解錠
   （月額は請求サイクルごとに新キーを送付）

【自動（MVP後）】
  Stripe checkout.session.completed ─webhook▶ Cloudflare Worker（署名鍵は Worker Secret）
     └─ Worker が mint → Resend 等でキー自動送付（クライアントは静的のまま・アプリ改修不要）
```
- **グレース**: 期限切れ→Pro 機能再ロック、**データは保持**（消さない）。

---

## 7. Free/Pro ゲーティング設計

### 7.1 単一の真実源
`useLicense()` に集約。`verifyLicenseKey` の結果（`AppStateProvider` がマウント時に非同期検証し Context へ）から派生を返す。

```ts
// src/lib/hooks/use-license.ts
export function useLicense(): LicenseStatus & {
  canAddMenu: (currentMenuCount: number) => boolean  // isPro || count < FREE_MAX_MENUS
  gate: (feature: 'export-csv' | 'export-pdf' | 'bulk-simulation') => boolean // isPro
}
```

### 7.2 機能マトリクス（PRD 5.1 ＋ 裁定・**原価率アラートは Free**）

| 機能 | Free | Pro |
| --- | --- | --- |
| 食材マスタ登録 | ○ 無制限 | ○ 無制限 |
| メニュー登録 | △ **最大3件**（サンプル含む＝裁定5） | ○ 無制限 |
| 原価/原価率/粗利 自動計算 | ○ | ○ |
| THE WEDGE（即時再計算） | ○ | ○ |
| **原価率アラート（信号色＋悪い順＋集約バナー）** | ○（**裁定で Free 確定**） | ○ |
| 閾値カスタム | ○ | ○ |
| 値上げシミュ（単品プレビュー＋適用） | ○ | ○ |
| 値上げシミュ（**全メニュー一括適用**） | ✕ | ○ |
| JSON バックアップ/復元 | ○（Free の要／裁定4でライセンス同梱） | ○ |
| **CSV エクスポート** | ✕ | ○ |
| **PDF 印刷** | ✕ | ○ |

- **Free 制限**: メニュー3件＋CSV/PDF 不可＋一括シミュ不可。それ以外（計算・wedge・アラート・単品シミュ・JSON）は全て動く（SERP ベイトとして「本当に有用」に保つ）。
- **強制点**: `addMenu`/`duplicateMenu` が `{ok:false, reason:'free-limit'}` を返す（3件超）。CSV/PDF/一括は `useLicense().gate(...)` で UI をロック＋`UpgradeGateBanner`/`UpgradePrompt`。**既存データは常に保持**、期限切れ降格後も4件以上は閲覧編集可・新規追加のみ制限（裁定1）。

### 7.3 トレードオフ（明示）
**クライアントサイド検証はバイパス可能**（localStorage/devtools 改変）。それでも本設計を採るのは: (1) バックエンドレスで固定費 ≈¥0・プライバシー（データが端末外に出ない）という**製品価値がバイパスリスクを上回る**、(2) 個人店の善意ユーザーモデル（払う層はツールを壊したいのではなく使いたい）、(3) 価値は時短・利便であり秘匿コンテンツではない。`plan/exp/status` を**永続せず毎起動で署名検証**するため、単純な localStorage 手編集では Pro を維持できない（耐タンパーの下限は確保）。この割り切りを設計として受け入れる。

---

## 8. ページマップ + SEO プラン

### 8.1 ルート（全て静的・制約 C7）

| ルート | 種別 | 内容 | robots |
| --- | --- | --- | --- |
| `/` | Server（SEO） | ランディング。H1・wedge デモ・機能・トラスト・CTA | index |
| `/app` | Server 薄皮→**client island** | ツール SPA（内部タブ: ダッシュボード/食材/設定＋レシピエディタ） | **noindex** |
| `/pricing` | Server + 小 island | Free/Pro 比較・価格・Stripe リンク・ライセンス入力 | index |
| `/faq` | Server（SEO） | よくある質問（PRD 11.5） | index |
| `/legal/tokushoho` | Server | 特定商取引法表記（有料販売に必須） | index |
| `/legal/privacy` | Server | プライバシーポリシー（ローカル完結強調） | index |

- **ランディング H1（原文固定）**: 「**仕入れ値を1つ直すだけで、全メニューの原価率が即再計算。**」
- `metadata` API で各ページ title/description/canonical/OGP。OG は `opengraph-image.tsx`（ImageResponse・全ルート既定）。`/app` は `metadata.robots = { index:false }`（SPA でSEO内容なし）。

### 8.2 メタデータ規約（静的エクスポート版・手本と同じ書き方）
- `sitemap.ts`/`robots.ts`/`manifest.ts` は**同期関数**（手本の `async`＋`getRepository()` と違いデータ取得不要）。`baseUrl` は **`NEXT_PUBLIC_SITE_URL`** を優先し末尾スラッシュ除去、未設定時は本番ドメインにフォールバック（手本と同じ書式）。
- `sitemap.ts` の対象は上表の index ルート全部（`/legal/*` は **priority 0.2 の低優先で掲載** — index 指定との整合を取る。CTOレビュー指摘5）。`/app` のみ除外（noindex）。
- `layout.tsx` は `metadataBase = new URL(siteUrl)`、`title.template`、`viewport.themeColor`（design-spec のネイビー `#1E3A5F`）を設定。**webフォントの `next/font` は使わない**（§1.2）。

### 8.3 SEO キーワード割付（strategy ブリーフのクラスタ → ページ）

| キーワードクラスタ | 主ページ | 補助 |
| --- | --- | --- |
| 飲食店 原価計算 / メニュー 原価計算 / 原価率 計算 ツール / 原価計算 無料 | `/` | `/faq` |
| メニュー 値上げ 計算 / 値付け / 適正価格 | `/`（値上げシミュ節） | `/faq` |
| 原価計算 エクセル テンプレート / 原価計算表 無料 / レシピ 原価 計算 | `/`（Excel 乗り換え節） | `/faq` |
| 歩留まり 計算 / ロス率 / 原価率 30% | `/faq`（Q&A） | `/`（用語補足） |
| 原価計算 アプリ 料金 / 有料 | `/pricing` | `/` |

- ランディングは wedge のビフォーアフター図＋主要機能3〜4点＋プライバシー約束＋FAQ 抜粋＋料金導線（PRD 11.1）。構造化データ（`SoftwareApplication`/`FAQPage` JSON-LD）を `<script type="application/ld+json">` でインライン（seo-specialist が中身確定、枠は本設計で用意）。

---

## 9. Atomic Design コンポーネント設計

CLAUDE.md ＆ design-spec §8 に厳密準拠。`src/components/{atoms|molecules|organisms|templates}/{PascalCase}/` に `X.tsx`/`X.test.tsx`/`index.ts`。**依存方向 atoms ← molecules ← organisms ← templates（逆依存禁止）**。ページ（`app/`）は templates を用い organisms/molecules で構成、ページ自体は階層外。

### 9.1 階層マッピング（抜粋・全量は §2 ツリー）

| 階層 | コンポーネント | Server/Client |
| --- | --- | --- |
| **atoms** | Button, IconButton, Icon, TextInput, NumberInput, UnitSelect, Select, SegmentedControl, Toggle, Slider, Checkbox, Badge, StatusDot, Label, HelperText, Spinner, Skeleton, Divider, Chip | 入力系は Client、表示系（Icon/Badge/StatusDot/Divider/Skeleton）は Server 可 |
| **molecules** | FormField, NumberStepper, TaxToggle, ComputedReadout, IngredientPicker, RecipeLineRow, CostRatePill, CostRateMeter, KpiCard, MenuRow, SimulationSlider, BeforeAfterStat, PlanFeatureRow, PlanToggle, SearchBar, SortControl, EmptyState, TrustBadge, UpgradePrompt, LicenseKeyField, ThresholdSetting, SampleDataBanner, Toast, IngredientForm | CostRatePill/Pill/Row 等は表示＝Server 可、対話系は Client |
| **organisms** | AppHeader, BottomNav, KpiSummary, DashboardMenuList, IngredientListPanel, IngredientFormSheet, RecipeEditor, LiveCostSummary, SimulationPanel, PricingTable, UpgradeGateBanner, OnboardingSheet, SemaphoreLegend, SettingsPanel, RecalcIndicator, MarketingHero, FaqAccordion, LegalPageLayout, **DataRecoveryDialog, BackupPanel, PrintableMenuReport, PrintableCostSheet** | ツール系は Client、Marketing/FAQ/Legal は Server |
| **templates** | AppShell, MarketingTemplate | AppShell=Client 枠、MarketingTemplate=Server |

- design-spec §8 目録に対する追加: **DataRecoveryDialog**（破損/未来版復旧・§4.3）、**BackupPanel**（JSON エクスポート/インポート・Free）、**PrintableMenuReport / PrintableCostSheet**（PDF 印刷・Pro）。いずれも既存意匠トークンに従う。
- **Server/Client 境界（C10）**: ランディング/料金/FAQ/法務は Server Component（静的 HTML・SEO）。`/app` は `AppShell` を含む**クライアントアイランド**（`AppStateProvider` 配下）。料金の `PlanToggle`/`LicenseKeyField` は Server ページ内の小 client island。localStorage アクセスは Client のみ、`mounted` まで Skeleton。

### 9.2 依存方向の保証
- atoms は他階層を import しない。molecules は atoms のみ。organisms は molecules/atoms のみ。templates は organisms/molecules/atoms のみ。`lib/domain`（純関数）・`lib/hooks`・`lib/state` は UI 非依存で全階層から利用可（レイヤ跨ぎではなく縦の依存）。逆方向（例: atom が organism を import）は禁止。ESLint の `import/no-restricted-paths` 相当ルールで機械的に守ることを推奨（設定は devops/CTO 判断、必須ではない）。

---

## 10. テスト戦略

設定は worldcup-kickoff をミラー。`vitest.config.ts`（`environment:'jsdom'`, `globals:true`, `setupFiles:['./tests/setup.ts']`, `alias {'@/': new URL('./src/', import.meta.url).pathname}`）、`tests/setup.ts`（`@testing-library/jest-dom/vitest`）、`playwright.config.ts`（`testDir:'./tests/e2e'`, `webServer: pnpm dev :3000`）。

### 10.1 Vitest（`src/lib/domain` を網羅的に・制約 C9）
- **units**: `convertQuantity`（kg↔g・L↔ml・count 同一単位のみ・次元不一致 null・count 別単位 null）、`dimensionOf`。
- **tax**: `toExTax`（税込8%/10%・税抜そのまま）、`toIncTax`。
- **cost**: `effectiveUnitPrice`（歩留まり100/境界・ゼロ除算 null）、`lineCost`（正常・欠落・不一致）、`menuCost`（フル精度合計・孤児スキップ・issues）、`costRate`（売価0 null）、`grossMargin`。**PRD の検証例（キャベツ ¥0.25/g、唐揚げ定食 原価¥203・原価率≈24.8%・粗利≈¥615、鶏もも ¥900→¥1200 で ≈30.9%）を回帰テストに固定**。
- **simulation**: `recommendedSellExTax`（¥203/30%→676.67）、`ceilToUnit`（¥10→680・¥50→700）、`simulatedRate`。
- **rounding**: 円 half-up・％ 小数第1位・単価 小数第2位・閾値境界（35.0=黄/35.1=赤）。
- **alert**: `alertStatus`（null→attention・境界）。
- **selectors**: `selectDashboardMenus`（要確認先頭→原価率降順→名前昇順）、`selectDashboardKpi`。
- **license**: `verifyLicenseKey`（正当キー active / 猶予 grace / 失効 expired / 改ざん署名 invalid / 形式不正 / prefix 不正 / payload 不正）、`parseLicenseKey`（固定長分解）、`isEd25519Supported`。**署名検証テストは Node webcrypto（Ed25519 対応）を使うため、当該ファイル冒頭に `// @vitest-environment node` を付ける**（jsdom の crypto.subtle は Ed25519 非対応の場合がある）。テスト用キーは mint スクリプトの keygen/mint でフィクスチャ生成。
- **storage/backup**: `migrateToLatest`（旧版→現行）、`loadCanonicalState`（empty/ok/future/corrupt 分類・SSR 安全）、`import-json`（app 不一致拒否・未来版拒否・部分復元）、`csv`（BOM `\uFEFF` 先頭・CRLF・クォートエスケープ）。
- **components（Testing Library）**: NumberInput（inputMode/バリデーション）、RecipeLineRow（互換単位のみ提示・行原価表示）、CostRatePill/CostRateMeter（色＋アイコン＋ラベル併記）、UpgradeGateBanner（3件でゲート）、LicenseKeyField（成功/失敗）。
- **hooks**: `use-canonical-store`（hydration・cross-tab）、`use-license`（canAddMenu/gate）。

### 10.2 Playwright E2E（制約 C9）
- **wedge ハッピーパス** (`wedge.spec.ts`): 食材追加→メニュー追加→原価率表示→**食材の仕入値を変更→再計算ボタン/再読込なしで原価率が即更新**されるのを assert（対象メニューのみ変化）。
- **エクスポートのゲーティング** (`export-gating.spec.ts`): Free で CSV/PDF ロック（`UpgradePrompt`）→ 有効な Pro キー入力で解錠→エクスポート可、を assert。
- **注記**: 静的エクスポートのため E2E は `pnpm dev`（手本どおり）でも、`pnpm build && 任意の静的サーバで out/ 配信`でも可。`ImageResponse`・Ed25519 は dev/本番で同一挙動。webServer は手本どおり `pnpm dev :3000` を既定とし、必要に応じ本番忠実度のため `out/` 配信に切替可（新規ツール追加は避ける）。

---

## 11. ビルド・デプロイ設定

### 11.1 `next.config.ts`（制約 C1・静的エクスポート）
```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export', // 純静的（HTML/CSS/JS を out/ に生成）。server actions/api/middleware/ISR は使わない
  // next/image は不採用のため images.unoptimized は不要。
  // ラスタ画像を使う場合のみ次を有効化: images: { unoptimized: true },
}

export default nextConfig
```

### 11.2 Cloudflare Pages（第一・CFO 確定 ¥0）
- **Build command**: `pnpm build` / **Output directory**: `out` / **Node**: 22（環境変数 `NODE_VERSION=22`）。
- `packageManager: pnpm@10.29.2` を Corepack が検出。Framework preset は Next.js (Static HTML Export) または None。
- **環境変数**: `NEXT_PUBLIC_SITE_URL=https://<本番ドメイン>`（layout/sitemap/robots が参照）。
- 生成物は各ルートの静的 HTML＋ハッシュ済みアセット。CDN が全世界配信。

### 11.3 Vercel（次点フォールバック）
- **決済リンク設置＝商用**のため Vercel なら **Pro（¥3,240/月）必須**（Hobby 不可・CFO 文書）。Framework Next.js、`output:'export'` のまま Build `pnpm build`。機能差は無く CF Pages が第一。

### 11.4 `NEXT_PUBLIC_SITE_URL` 運用
- ローカル/プレビュー未設定時は本番ドメインをコード内フォールバック（手本どおり）。canonical/OGP/sitemap の絶対 URL 解決に使用。CF Pages と（使うなら）Vercel の双方で同一値を設定。

---

## 12. 依存リストと justification

### 12.1 runtime dependencies（新規ゼロ・すべて手本ミラー）

| パッケージ | 版 | 役割 | 新規? |
| --- | --- | --- | --- |
| next | 16.2.6 | フレームワーク（static export） | 手本 |
| react / react-dom | 19.2.6 | UI / hydration 安全な store 購読 | 手本 |
| clsx | ^2.1.1 | クラス条件結合（`cn`） | 手本 |
| tailwind-merge | ^3.6.0 | Tailwind クラス衝突解決（`cn`） | 手本 |
| lucide-react | ^1.17.0 | アイコン | 手本 |
| zod | ^4.4.3 | 実行時検証＋型推論 | 手本 |

- **date-fns は入れない**（手本にはあるが除外）。**新規 runtime 依存＝0**。

### 12.2 devDependencies（手本ミラー）
`vitest ^4.1.7`, `@testing-library/{react,jest-dom,user-event}`, `jsdom`, `@playwright/test`, `@tailwindcss/postcss ^4`, `tailwindcss ^4`, `typescript ^5`, `@types/{node,react,react-dom}`, `eslint ^9`, `eslint-config-next 16.2.6`, `only-allow`（preinstall）。`@types/node` は **`^22` を採用**（CTOレビュー指摘4: mint スクリプトが Node 22 依存 — crypto Ed25519・type stripping — のため型精度を優先。dev 限定で安全。carskiida も `^25` を採用済みで手本からの引き上げに前例あり）。

### 12.3 「新依存ゼロ」の証明（要求機能 × 実現手段）

| 機能 | 実現手段（ゼロ依存） |
| --- | --- |
| PDF 出力 | `@media print` CSS ＋ `window.print()`（PrintableMenuReport/PrintableCostSheet） |
| CSV 出力 | `Blob(['\uFEFF' + csv], {type:'text/csv;charset=utf-8'})` ＋ CRLF ＋ RFC4180 クォート → `URL.createObjectURL` ＋ `<a download>`。**BOM で Excel-JP 文字化け回避** |
| 暗号（ライセンス） | ブラウザ **Web Crypto Ed25519**（検証）／Node `node:crypto`（mint・dev のみ） |
| 日付表示・残日数 | `Intl.DateTimeFormat` ＋ 素の算術（date-fns 不要） |
| 一意 ID | `crypto.randomUUID()`（`src/lib/utils/id.ts`） |
| 状態管理 | `useLocalStorage` ＋ Context ＋ `useMemo`（外部ストア不要） |
| フォント | システムフォントスタックのみ（webフォント 0・§1.2） |

### 12.4 サプライチェーン設定（制約 C2・手本どおり）
- `pnpm-workspace.yaml`: `minimumReleaseAge: 10080`（7日 cooldown）, `minimumReleaseAgeStrict: false`, `ignoredBuiltDependencies: [sharp, unrs-resolver]`。
- `package.json`: `"preinstall": "npx only-allow pnpm"`, `packageManager: "pnpm@10.29.2"`, `engines: { node: ">=22.0.0", pnpm: ">=10.16.0" }`。
- ルート `.npmrc` の `engine-strict=true` を継承。

---

## 13. 実装順序（TDD）

feature 単位で Red→Green→Refactor が回る依存順。**土台→ドメイン→永続化→UI原子→ツール→ライセンス→エクスポート→SEO→E2E**。

1. **足場**: package.json / tsconfig（`**/*.mts` include）/ `next.config`（`output:'export'`）/ postcss / eslint / vitest / playwright / pnpm-workspace / .gitignore（`/.secrets/`）/ `layout.tsx`（webフォント無し）/ `globals.css`（design-spec §2 の `@theme`）/ constants。*Green*: `pnpm build` が out/ を生成、ダミー1テスト通過。
2. **zod スキーマ（型契約を先行）**: `schema.ts`（`z.infer` 型）。検証・境界（歩留まり0/購入量0/閾値逆転）テスト。※純関数は `Ingredient`/`Menu`/`Unit` 等の型を schema.ts から import するため、型定義を先に置く（CTOレビュー指摘: 依存順序の是正）。
3. **ドメイン純関数（TDD）**: `units`→`tax`→`rounding`→`cost`→`simulation`→`alert`→`selectors`。PRD の検証例を先に失敗テスト化してから実装。zod 実行時検証テストも本ステップと並走。
4. **永続化**: `safe-storage`（手本ミラー）→`migrations`→`canonical-store`（load 分類/quarantine/save/quota）→`use-local-storage`（手本）→`use-canonical-store`→`AppStateProvider`＋actions。破損/未来版/cross-tab テスト。
5. **ライセンス**: `keys`（埋め込み公開鍵）→`codec`（base64url/固定長分解）→`verify`（Ed25519・active/grace/expired/invalid/unsupported）→`use-license`→`scripts/mint-license-key.mts`（keygen/mint、フィクスチャ生成）。
6. **atoms（TDD 各個）**: Button→入力系（TextInput/NumberInput/UnitSelect/Select/SegmentedControl/Toggle/Slider/Checkbox）→表示系（Icon/Badge/StatusDot/Label/HelperText/Spinner/Skeleton/Divider/Chip）。
7. **molecules**: FormField/NumberStepper/TaxToggle/ComputedReadout/IngredientPicker/RecipeLineRow/CostRatePill/CostRateMeter/KpiCard/MenuRow/SimulationSlider/BeforeAfterStat/SearchBar/SortControl/EmptyState/TrustBadge/UpgradePrompt/LicenseKeyField/ThresholdSetting/SampleDataBanner/Toast/IngredientForm。
8. **organisms＋ツール結線**: AppHeader/BottomNav/KpiSummary/DashboardMenuList/IngredientListPanel/IngredientFormSheet/RecipeEditor/LiveCostSummary/SimulationPanel/OnboardingSheet/SemaphoreLegend/SettingsPanel/RecalcIndicator/UpgradeGateBanner/DataRecoveryDialog。`sample-data` 投入。
9. **templates＋`/app`**: `AppShell`＋`app/app/page.tsx`（client island、`mounted` まで Skeleton）。wedge がブラウザで動くのを確認。
10. **エクスポート/バックアップ**: `backup/export-json`・`import-json`（Free）→`export/csv`・`export/print`＋Printable*（Pro、`useLicense().gate` で制御）→BackupPanel。
11. **マーケ/法務/SEO**: `/`（MarketingHero・PricingTable の静的部）/`/pricing`（PlanToggle/LicenseKeyField island）/`/faq`/`/legal/*`＋`metadata`＋`sitemap/robots/manifest`（同期）＋`icon/apple-icon/opengraph-image`（ImageResponse）。
12. **E2E**: `wedge.spec.ts`・`export-gating.spec.ts`。
13. **ビルド検証・デプロイ**: `pnpm build`→`out/` 確認→CF Pages 設定（build/output/Node/`NEXT_PUBLIC_SITE_URL`）。

---

## 14. リスクとトレードオフ

| リスク | 内容 | 緩和策 |
| --- | --- | --- |
| クライアントゲーティング回避 | localStorage/devtools でバイパス可能 | 善意ユーザーモデルで許容（第7.3）。`plan/exp` を永続せず毎起動署名検証で耐タンパー下限を確保。バックエンドレスの ¥0・プライバシー価値が上回る |
| Ed25519 ブラウザ対応 | Chrome 137 は比較的最近（2025-08） | `isEd25519Supported()` で feature-detect →非対応は Free 相当＋更新案内＋キー保持。新依存（純JS 実装）は入れず、必要性がデータで出た場合のみ vendored 実装を supply-chain-auditor レビュー付き検討 |
| localStorage 容量/消失 | quota 超過・履歴削除・破損 | `saveCanonicalState` が QuotaExceededError 捕捉＋整理案内（PRD 8.7）。**JSON バックアップ/復元（Free）**でユーザー自衛。破損は `DataRecoveryDialog`（退避→ダウンロード→復元/リセット）。CanonicalState はテキストで軽量 |
| 静的エクスポート制約 | server actions/api/middleware/ISR 不可、`revalidate` 誤用 | 設計から排除（第1.3）。`next.config output:'export'` がビルドで違反を検出。ホーム時刻依存ロジックはクライアント側で処理（ISR を使わない） |
| サブスクとオフライン鍵 | 月額の再発行 UX が重い | **年額主 CTA**（発行を 1/12 に圧縮）＋内蔵猶予（monthly 38d/annual 373d）＋7日猶予バナー。MVP後に Worker 自動化（裁定1） |
| 時計巻き戻し・キー共有 | 完全防止不可 | ソフト検知（`lastSeenDate`）＋購入者参照埋め込み＋低価格で許容（裁定2） |
| 税抜正規化のドリフト | inputPrice と ExTax の不整合 | 正規化は単一純関数 `toExTax` を write パスでのみ実行＋インポート/移行時に再正規化 |
| FP 丸め誤差 | 浮動小数の境界 | 丸めを `rounding.ts` に集約＋ε 補正＋境界回帰テスト（PRD 検証例を固定） |
| SEO 複利の不確実性 | 306件到達は獲得スループット依存 | アーキ範囲外だが、無料クライアントツールを SERP ベイト化＋FAQ/構造化データ枠＋高速静的配信（webフォント0）で技術的下支え |
| 手動フルフィルメントのスケール | 件数増で運用負荷 | 年額中心で件数圧縮、MVP後に Cloudflare Worker＋Stripe webhook で自動 mint（クライアント改修不要） |

---

以上が genka-dentaku 技術アーキテクチャ設計書の全文である。
