# carskiida アーキテクチャ設計書（code-architect）

> 作成: 2026-06-07 / 担当: code-architect（CTO委譲）
> 前提: PRD ドラフト / 市場分析（条件付きGO「小さく深く」）を継承。在庫・価格は恒久スコープ外。read-heavy リファレンス。全フィールドに source(出典) 保持。

## 0. 設計判断のサマリー

| 論点 | 結論 | 理由 |
| --- | --- | --- |
| 描画戦略 | **SSG＋ ISR/`'use cache'`、検索のみ動的** | read-heavy・SEO最重要・更新低頻度。配信コストを0に寄せる |
| DB | **Supabase Postgres、anon public-read RLS** | 公開リファレンス。書き込みは ETL(service role)と将来UGCのみ |
| source保持 | **`field_source` 別テーブル主軸 + ホットな列に `primary_source` 非正規化キャッシュ** | フィールド単位の出典を厳密に持ちつつ表示性能確保 |
| breadth/depth | **同一スキーマ。`is_showcase`+`completeness` で表現。テーブル分けない** | 広い自動取込と深い手厚いデータを同構造で扱い後から深掘り可 |
| 検索 | **PGroonga（日本語FTS、Supabaseプリインストール）＋ファセットは通常クエリ** | 標準FTSは日本語非対応。pgvectorは現時点不要 |
| ETL | **`scripts/etl/` のNode/TSをローカル/CIで実行→冪等upsert** | 無料枠運用。Edge Functionは将来温存 |
| Auth | **MVPはAuth無し。お気に入りはlocalStorage** | スコープ最小。UGC段階で導入 |

## 1. 技術スタック確定

| 領域 | 採用 | 理由 |
| --- | --- | --- |
| フレームワーク | Next.js App Router 16.2.x（budget-app同系） | SSG/ISR/PPR/`'use cache'` が read-heavy に最適 |
| UI | React 19.2.x | Server Components 標準 |
| 言語 | TypeScript 6.x | budget-app準拠 |
| スタイル | Tailwind CSS 4 + clsx + tailwind-merge | budget-app の `cn()` 踏襲 |
| DB/Auth/Storage | Supabase（@supabase/ssr, supabase-js） | budget-app と同じSSR連携 |
| 全文検索 | PGroonga（Supabaseプリインストール） | 日本語形態素検索 |
| バリデーション | zod 4 | ETL入力・Server Action入力 |
| テスト | Vitest 4 + Testing Library + Playwright | 単体/コンポーネント+E2E |
| デプロイ | Vercel | 無料枠 |
| パッケージマネージャ | pnpm 10 + minimumReleaseAge cooldown | サプライチェーン防御継承 |

**新規依存は最小化**: Wikidata は依存ゼロで fetch+SPARQL 実装を推奨。地図(P2)は導入時に maplibre-gl 検討。実行時依存は budget-app とほぼ同一に保つ。

### 1.2 描画戦略

| ページ種別 | 描画方式 | 理由 |
| --- | --- | --- |
| トップ/メーカー一覧/用語集 | SSG（フル静的）＋`'use cache'` | 変化が遅い。最速最安 |
| 車種詳細 `/cars/[manufacturer]/[model]` | SSG + generateStaticParams + ISR（depth事前生成、breadthはon-demand） | 数百〜数千ページ。深い車種は事前、広い車種は初回アクセス時生成しCDN常駐 |
| 世代/グレード/パーツ/工場 | 詳細ページ内 Server Components（`'use cache'`+`cacheTag('car-{id}')`） | ETL更新時 `revalidateTag` でピンポイント無効化 |
| 検索 `/search` | 動的（Suspense内Server Component、PPR） | 入力が無限。静的化不可 |
| 比較 `/compare?ids=` | 動的（PPR、外枠静的・結果ストリーム） | 組合せ無限。各車データは `'use cache'` 再利用 |

`generateStaticParams` は depth(is_showcase=true) のみ返す。検索・比較は `<Suspense>` で PPR。お気に入りは Client Component + localStorage に隔離し静的シェルを汚さない。

## 2. データモデル / DBスキーマ

### 2.1 エンティティ関係（論理）
```
manufacturer ─1:N─ car_model ─1:N─ generation ─1:N─ grade
                                     │                │
                                     │                ├─N:N─ engine  (grade_engine)
                                     │                └─N:N─ part    (grade_part)
                                     └─N:N─ plant ─N:1─ production_country  (generation_plant: 世代ごとの生産地変遷)
term(用語集) ── 独立、本文からslug参照
field_source ── 全エンティティの「フィールド単位の出典」を横断保持(polymorphic)
```
生産地は generation 単位 N:N（`generation_plant`）で工場移管史を表現＝差別化点を構造で担保。part/engine は grade に N:N（同一パーツの横断を表現）。

### 2.2 source の持たせ方（ハイブリッド）
1. **正規テーブル `field_source`（厳密・主軸）**:
```
field_source(
  id bigint PK,
  entity_type text,   -- 'grade'|'generation'|'generation_plant'...
  entity_id bigint,
  field_name text,    -- 'horsepower'|'plant'|'displacement'...
  source_type source_type_enum,  -- 'vpic'|'wikidata'|'wikipedia'|'manufacturer_spec'|'ugc'|'editorial'
  source_url text,
  source_ref text,    -- vPIC variableId / Wikidata Qid・Pid
  license text,       -- 'CC-BY-SA-4.0'|'public-domain'|'fair-use-fact'
  confidence smallint, -- 0-100
  retrieved_at timestamptz,
  created_at timestamptz default now(),
  UNIQUE(entity_type, entity_id, field_name)
)
```
2. **各テーブルの `primary_source` 列（非正規化キャッシュ・表示用）**: 一覧の出典バッジを JOIN せず即描画。詳細ページのフィールド別バッジは `field_source` を引く。

理由: 「全フィールドに source」を列追加方式で満たすと列爆発。`field_source` 1本に集約し、ホットパスのみ非正規化。ETLの冪等upsertとも相性良。

### 2.3 breadth/depth はテーブルを分けない
```
car_model(
  id, manufacturer_id, name_ja, name_en, slug, body_type,
  is_showcase boolean default false,
  completeness smallint default 0,   -- ETLが算出（埋まったフィールド率）
  primary_source source_type_enum, ...
)
```
breadth: 自動取込で is_showcase=false, completeness=低 が大量に入る。depth: 厳選車種を is_showcase=true、completeness を上げる。後から深掘りでテーブル移動不要。`generateStaticParams` は is_showcase=true を返す。

### 2.4 主要テーブル定義（DDL方針）
```
manufacturer(id, name_ja, name_en, slug UNIQUE, country_id FK, logo_attribution, primary_source, ...)
car_model(id, manufacturer_id FK, name_ja, name_en, slug, body_type body_type_enum, is_showcase, completeness, primary_source, ...)
  UNIQUE(manufacturer_id, slug)
generation(id, car_model_id FK, ordinal, code_name, year_from, year_to, slug, primary_source, ...)
  UNIQUE(car_model_id, ordinal)
grade(id, generation_id FK, name, drivetrain, transmission, weight_kg, primary_source, ...)
engine(id, code, displacement_cc, cylinders, aspiration, fuel_type, max_power_ps, max_torque_nm, primary_source, ...)
part(id, category part_category_enum, name_ja, name_en, spec_json jsonb, primary_source, ...)
plant(id, name, country_id FK, location_geo?, wmi?, primary_source, ...)
production_country(id, name_ja, name_en, iso_code)
grade_engine(grade_id, engine_id, is_standard, PK(grade_id,engine_id))
grade_part(grade_id, part_id, fitment_note, PK(grade_id,part_id))
generation_plant(generation_id, plant_id, year_from, year_to, PK(generation_id,plant_id))
field_source(...上記...)
term(id, slug UNIQUE, term_ja, reading, definition_md, primary_source, ...)
car_search_index(...マテビュー...)
```

### 2.5 検索・ファセット
- 日本語FTS = PGroonga（Supabaseプリインストール、標準 to_tsvector は日本語非対応）。pgvector は現時点不要。
- マテビュー `car_search_index`（manufacturer名+model名(ja/en)+別名+body_type+代表型式+年代）に PGroongaインデックス。ETL後に `REFRESH MATERIALIZED VIEW CONCURRENTLY`。
- 検索は RPC `search_cars(query, body_type, manufacturer_id, year_from, year_to)`。アプリは `supabase.rpc('search_cars', {...})`。
- ファセット（メーカー/ボディタイプ）は通常クエリ+GROUP BY、`'use cache'` 化。

### 2.6 RLS / 書き込み権限
- 全公開テーブルに anon SELECT 許可。書き込みは無効。ETLは service_role（RLSバイパス）。将来UGCは別テーブルで authenticated INSERT（モデレーション前提ステータス列）。MVPでは作らない。

## 3. ETL パイプライン

### 3.1 実行場所
`apps/carskiida/scripts/etl/` の Node/TS スクリプト。ローカル実行＋GitHub Actions（手動dispatch/定期）。Edge Function は使わない（長時間・大量バッチに不向き、無料枠運用）。

### 3.2 構成
```
scripts/etl/
├── sources/ vpic.ts wikidata.ts wikipedia.ts
├── transform/ normalize.ts(zod検証) reconcile.ts(名寄せ)
├── load/ upsert.ts record-source.ts
├── seed/showcase/ (depth車種の手入力JSON)
└── run.ts (CLIエントリ)
```

### 3.3 設計原則
1. **冪等性**: 全ロードUPSERT（ON CONFLICT(natural_key) DO UPDATE）。自然キー= manufacturer.slug / (manufacturer_id, model slug) / (car_model_id, ordinal)。
2. **source記録は必須・原子的**: 値の upsert と同一トランザクションで `field_source` を upsert。値だけで出典無しを作らない。
3. **欠損ハンドリング**: ソースに無いフィールドはNULLのまま（既存値を上書きしない）。completeness 再計算。
4. **信頼度の優先順位**: 衝突時は confidence 高い source 採用（manufacturer_spec > editorial > wikidata > wikipedia > vpic(米国仕様) > ugc）。決定根拠を field_source に残す。
5. **法務ガード（厳守）**: 競合サイトのスクレイピング転載は実装しない。ソースは vPIC(public domain) / Wikidata・Wikipedia(CC-BY-SA、帰属継承) / メーカー諸元の事実数値のみ転記。車両画像・ロゴは取り込まない。
6. **レート制限・再試行**: 指数バックオフ。
7. **ETL後フック**: (a) マテビューREFRESH (b) `revalidateTag` Webhook で影響ページのみ再生成。

## 4. ディレクトリ構成（apps/carskiida）
```
apps/carskiida/
├── package.json / pnpm-workspace.yaml（サプライチェーン設定コピー）
├── next.config.ts / tsconfig.json(paths @/*) / vitest.config.ts / playwright.config.ts
├── supabase/migrations/   # 宣言的スキーマ・RLS・RPC・PGroongaインデックス
├── scripts/etl/           # 第3章
└── src/
    ├── app/                # App Router（ページはAtomic Design階層に含めない）
    │   ├── layout.tsx page.tsx
    │   ├── manufacturers/ [manufacturer]/page.tsx
    │   ├── cars/[manufacturer]/[model]/ page.tsx + generateMetadata + opengraph-image.tsx
    │   ├── search/page.tsx  compare/page.tsx
    │   ├── glossary/ [slug]/page.tsx
    │   ├── sitemap.ts robots.ts not-found.tsx error.tsx
    ├── components/         # Atomic Design（逆方向依存禁止）
    │   ├── atoms/ Button Badge SourceBadge Tag Spec Tooltip Skeleton Icon
    │   ├── molecules/ SpecRow TermTooltip SearchBar FacetFilter GenerationTab PlantBadge CompletenessMeter CarCard
    │   ├── organisms/ GenerationTimeline PartStructureAccordion PlantMap SpecComparisonTable GradeSpecPanel SearchResults FilterSidebar SiteHeader SiteFooter
    │   └── templates/ CarDetailTemplate ListingTemplate SearchTemplate CompareTemplate ArticleTemplate
    ├── features/           # ドメインロジック（UIでない）
    │   ├── cars/data.ts(’use cache’+cacheTag) search/data.ts compare/data.ts glossary/data.ts favorites/use-favorites.ts
    ├── lib/
    │   ├── supabase/ server.ts admin.ts(service_role, server-only) types.ts
    │   ├── utils/cn.ts validations/ constants/
    └── types/database.types.ts
```
依存方向: atoms ← molecules ← organisms ← templates ← app/features（逆方向禁止）。データ取得は features に置き、templates/organisms は props で受け取る純粋コンポーネント。

## 5. 主要機能の実装方針
- **車種詳細**: `getCarDetail(slug)` に `'use cache'`+`cacheTag('car-{id}')`。1回（or Promise.all）で model→generations→grades→engines/parts→plants 取得（ウォーターフォール回避）。世代切替は薄いClient Componentに隔離し全世代データをServer側で渡す。
- **検索**: 外枠静的、SearchResults を Suspense で PPR。`search_cars` RPC。searchParams を zod 検証。
- **比較**: ids を zod 検証（最大4・重複排除）。各IDに getCarDetail を Promise.all（同キャッシュ再利用）。差分ハイライトは純関数 `computeSpecDiff(cars)` でテスト可能に。
- **用語**: glossary テーブル。本文の用語slugを Server側で検出し TermTooltip でラップ。専用ページ glossary/[slug]（SSG）。

## 6. 段階的実装計画（TDD）

> 最大リスクはデータ。「1車種を端から端まで貫く縦切り」を最初に作る。

- **Sprint 0 — 基盤**: budget-app からブートストラップ。Supabaseプロジェクト作成、PGroonga有効化、enum+コアテーブル+anon RLS マイグレーション。受入: `pnpm build` 通過、型生成成功。
- **Sprint 1 — 縦切りMVP（1車種を端から端まで）★最重要**: depth車種1台（人気国産1車種×直近2世代）を手入力JSON＋vPIC補完で投入（field_source全記録）。TDD順: getCarDetail→atoms(SourceBadge,Spec)→molecules→organisms→CarDetailTemplate→詳細ページ。受入: 1車種が出典バッジ付きで表示、Playwright E2E green。
- **Sprint 2 — 比較+用語**: computeSpecDiff(純関数TDD)→SpecComparisonTable→compare。glossary シード→TermTooltip→用語ページ。
- **Sprint 3 — breadth ETL+検索**: vPIC+Wikidata取込（冪等・source記録・名寄せ）。car_search_index+PGroonga+search_cars RPC。search(PPR)+FilterSidebar+ファセット。
- **Sprint 4 — SEO/回遊/仕上げ**: sitemap/robots/OG画像/関連車回遊/お気に入り(localStorage)/出典ポリシーフッター。Vercelデプロイ。

## 7. 非機能要件
- **パフォーマンス/キャッシュ**: ほぼ全ページ静的(SSG/ISR)→CDN配信でTTFB最小。`'use cache'`+cacheTag でDBヒット最小化、更新時のみ revalidateTag。画像は法務上扱わず軽量。詳細は Promise.all、検索/比較は Suspense ストリーム。
- **無料枠運用**: Vercel Hobby + Supabase Free。静的配信中心でサーバ実行・帯域が読みやすい。ETLは GitHub Actions。service_role は server-only（クライアントバンドルに入れない）。
- **テスト戦略**: 単体(純関数: computeSpecDiff/completeness/source優先順位/zod検証)、コンポーネント(atoms/molecules/organisms、1ディレクトリに.test.tsx同居)、E2E(詳細描画/世代タブ/検索/比較)、ETLテスト(transform/normalize 冪等・欠損・source記録)、データ品質テスト(「値があるのにfield_source無し」をCIで検出)。

## 8. CTO確認事項（承認ゲート）
1. 描画戦略（depth=SSG / breadth=on-demand ISR / 検索・比較のみ動的PPR）で合意可能か。
2. source保持（field_source 別テーブル主軸 + primary_source 非正規化）で合意可能か。
3. breadth/depth をテーブル分けず is_showcase+completeness で表現、で合意可能か。
4. 検索 PGroonga 採用・pgvector MVP不要、で合意可能か。
5. Auth: MVPはAuth無し（お気に入りlocalStorage）、UGC段階で導入、で合意可能か。

参考: budget-app の package.json / lib/supabase/server.ts / tsconfig.json / pnpm-workspace.yaml をスタック・SSR連携・paths・サプライチェーン設定の流用元とする。
