# carskiida 🚗📖

> 車種を「**世代史 × パーツ構造 × 生産地**」で立体的に引ける、日本語の自動車百科事典。

carskiida（カースキーダ）は、在庫や価格を扱う中古車サイトではありません。**車そのものの中身**——どんなエンジン・サスペンション・安全装備を積み、どこの工場で作られ、これまでの世代でどう変わってきたのか——を深く・横断的に知るための「図鑑」です。

## コンセプト

既存の車情報サービスは「在庫・価格（カーセンサー）」「口コミ（みんカラ）」「スペック比較（価格.com）」で出揃っていますが、**「パーツ構造 × 生産工場/国 × モデル世代史」を横断する百科事典**は空白でした。carskiida はそこに賭けます。

- **世代史ビュー** — 初代から現行まで、各世代の型式・パワートレイン・サス形式・安全装備・生産工場の変遷を時系列で
- **パーツ構造ビュー** — 「この車に何が載るか」をグレード別・カテゴリ別に構造化
- **生産地ビュー** — 「どこの工場で作られているか」を一級情報として可視化
- **出典必須** — 全データフィールドに出典（source）バッジ。データの欠損も正直に明示する

## 二層構造（広さ × 深さ）

| 層 | 内容 | 収録手段 |
| --- | --- | --- |
| **breadth（広さ）** | 車種を広く収録（輸入車含む）。最小情報＋出典 | NHTSA vPIC / Wikidata の自動 ETL |
| **depth（ショーケース）** | 世代史・パーツ構造・工場・諸元を手厚く作り込み | メーカー公式諸元の事実値転記＋エディトリアル |

検索・一覧・比較は両者を透過的に扱い、ショーケースには `◆ Showcase` バッジが付きます。

## ビジュアル

アートディレクションは **「テクニカル・ブループリント × 活版エディトリアル」**。車両写真やメーカーロゴに頼らず、製図方眼・明朝×等幅フォント・寸法線・出典バッジという「車のドキュメント文化」そのものを高級感の素材にしています。ライトテーマは「生成りの製図用紙」、ダークテーマは「青写真（サイアノタイプ）」。

## 技術スタック

- **フロントエンド**: Next.js 16 (App Router) + React 19 + TypeScript
- **スタイル**: Tailwind CSS 4（`ck-` セマンティックトークンで自動テーマ切替）
- **データ**: Supabase (Postgres / RLS public-read) + PGroonga（日本語全文検索）
- **テスト**: Vitest + Testing Library（+ Playwright E2E）
- **デプロイ**: Vercel / **パッケージマネージャー**: pnpm
- **描画戦略**: depth=SSG（事前生成）/ breadth=ISR（オンデマンド）/ 検索・比較=動的(PPR)

## ディレクトリ構成（Atomic Design）

```
src/
├── app/
│   ├── page.tsx                          # トップ（車種一覧）
│   └── cars/[manufacturer]/[model]/      # 車種詳細（SSG + generateStaticParams）
├── components/
│   ├── atoms/      SourceBadge, Spec, SectionHeading
│   ├── molecules/  SpecRow, CompletenessMeter, CarCard
│   ├── organisms/  CarModelHeader, GenerationTimeline, GenerationExplorer,
│   │               GradeSpecPanel, PartStructureAccordion, PlantMap, LightDetail
│   └── templates/  CarDetailTemplate
├── features/cars/  data.ts               # データアクセス層（現状シード / 将来 Supabase）
├── lib/
│   ├── seed/       roadster.ts, breadth.ts   # Sprint 1 縦切り用シード
│   ├── constants/  specs.ts               # 諸元・パーツ・ボディ ラベル
│   └── supabase/   server / client / admin
└── types/car.ts                          # ドメインモデル（Source 付き）
supabase/migrations/                       # スキーマ・RLS・keep-alive
docs/                                      # 市場分析・PRD・アーキ・デザイン仕様・コスト
```

依存方向は **atoms ← molecules ← organisms ← templates ← app/features**（逆方向禁止）。

## 開発

```bash
cd apps/carskiida
pnpm install
pnpm dev          # 開発サーバ
pnpm test         # Vitest（単体・コンポーネント）
pnpm build        # 本番ビルド
pnpm start        # 本番サーバ
```

> パッケージマネージャーは pnpm に統一（npm/yarn は PreToolUse フックがブロック）。
> 依存は `minimumReleaseAge`（7日 cooldown）でサプライチェーンを多層防御。

## ロードマップ

- [x] **Sprint 0** — 基盤（スキャフォールド・デザイントークン・スキーマ・RLS）
- [x] **Sprint 1** — 縦切り MVP：1車種（マツダ・ロードスター ND/NC）を端から端まで（詳細ページ・世代切替・諸元・パーツ・生産地・出典）
- [x] **Sprint 2** — 比較表（2〜4台・差分ハイライト・色＋記号でA11y）＋ 用語インライン解説（ツールチップ・用語集ページ）
- [x] **Sprint 3** — 検索（メーカー/ボディ/キーワード/ショーケースのみ・ファセット）＋ breadth ETL スクリプト（vPIC + Wikidata）＋ PGroonga マイグレーション＋ keep-alive Action
- [x] **Sprint 4** — SEO（sitemap.xml / robots.txt / OGP画像）・関連車回遊・お気に入り（localStorage）
- [x] **仕組み図解（第1弾）** — 駆動方式パワーフローの自作SVGアニメ（エンジン→駆動輪へ動力が流れ、駆動輪が回転）。**型ごとに1つ作れば全車種に再利用**・写真不使用・著作権ゼロ・$0。`prefers-reduced-motion` 対応・色でも駆動輪を判別
- [ ] **仕組み図解（次段）** — サスペンションの動き / エンジンレイアウトの図解
- [ ] **次段** — データを Supabase + ETL 実投入へ移行（現状はインメモリシード）／ Vercel 本番デプロイ

### スクリーンショット
`docs/screenshots/` に home / detail-roadster / detail-drivetrain / drivetrain-fr-closeup / compare / search を収録。

## データソースと法務

- 数値諸元はメーカー公式諸元・各種一次資料の**事実値**を転記し、各フィールドに出典を付与
- vPIC（public domain）/ Wikidata・Wikipedia（CC-BY-SA、帰属継承）を ETL の骨格に
- **競合サイトのスクレイピング転載・車両画像・メーカーロゴの取り込みは行わない**（著作権・利用規約）

## ライセンス

Private / ポートフォリオ。
