# 公道レビュー（road-review）アーキテクチャ設計書

- ステータス: 設計確定案 v1.1（CTOレビュー済み・CEO承認待ち）
- 作成: code-architect（CTO配下）／レビュー・修正: CTO（PDCA 1イテレーション。修正点は17章）
- 保存先: `apps/road-review/docs/product/road-review-architecture.md`
- 前提資料: `apps/road-review/docs/product/road-review-prd-draft.md`（US-01〜US-09、評価軸 8章）、`apps/road-review/docs/strategy/road-review-market-analysis.md`
- CEO決定（変更しない）: MVPは非公開の個人記録だけ／ログインはメールのマジックリンクだけ／道の種別は 峠・スカイライン・海岸線・林道・その他／道マスタはユーザーごと／HEICは扱わない／写真は JPEG・PNG・WebP、1記録5枚まで、元ファイル20MBまで、長辺2048pxに縮小してEXIFを消す／GPS・位置情報APIは一切使わない／速度・タイム・ランキングは保存しない

---

## 0. このアプリの中身（要約）

自分が走った道を「道（road）」として登録し、その道に「走行記録（drive）」を日付ごとにためていくアプリです。走行記録には「道の情報（road_info）」（その日に確認した冬季閉鎖・料金・施設など）と写真（photos、最大5枚）が付きます。データはすべて本人だけが読み書きでき、Postgres の RLS（行ごとのアクセス制御）と、Storage（画像置き場）のフォルダ単位のアクセス制御で守ります。

```
roads (道) 1 ──< drives (走行記録) 1 ──1 road_info (道の情報・確認日付き)
                                   1 ──< photos (写真・最大5枚) ──> Storage: road-photos/{user}/{road}/{drive}/{photo}.jpg
user_settings (安全注意を確認した日時)     storage_deletion_queue (消し損ねた画像ファイルの再削除待ち)
```

---

## 1. 技術スタックとバージョン

### 1.1 既存アプリと同じにするもの

`apps/carskiida/package.json` と `apps/budget-app/package.json` を読んで確認し、同じものを使います。

| 区分 | パッケージ | バージョン | 同じにした元 |
|---|---|---|---|
| フレームワーク | next | `16.3.6`（固定。Sprint 0 監査で GHSA-vcvr-r3jv-pc5j 対応のため 16.3.3 から更新） | 両アプリ（commit fc87366 の RCE 修正後の版） |
| | react / react-dom | `19.2.6`（固定） | 両アプリ |
| Supabase | @supabase/ssr | `^0.10.3` | 両アプリ |
| | @supabase/supabase-js | `^2.106.2` | 両アプリ |
| 入力チェック | zod | `^4.4.3` | 両アプリ |
| UIユーティリティ | clsx `^2.1.1` / tailwind-merge `^3.6.0` / lucide-react `^1.17.0` | | 両アプリ |
| サーバー専用ガード | server-only | `^0.0.1` | carskiida |
| CSS | tailwindcss `^4` / @tailwindcss/postcss `^4` | | 両アプリ |
| テスト | vitest `^4.1.8` / jsdom `^29.1.1` / @testing-library/react `^16.3.2` / @testing-library/jest-dom `^6.9.1` / @testing-library/user-event `^14.6.1` | | budget-app |
| E2E | @playwright/test | `^1.60.0` | 両アプリ |
| 型 | typescript `^6` / @types/node `^25` / @types/react `^19` / @types/react-dom `^19` | | 両アプリ |
| Lint | eslint `^9` / eslint-config-next `16.3.3` | | 両アプリ |
| ビルド補助 | vite | `^8.0.16`（devDependency。overrides と同じ指定にする） | 両アプリ（commit af06719 で、frozen-lockfile のために揃えたもの） |
| DB CLI | supabase | `^2.106.0` | budget-app |
| 実行環境 | `packageManager: "pnpm@10.29.2"`、`engines: { node: ">=22.0.0", pnpm: ">=10.16.0" }`、`.node-version: 22.22.0`、`preinstall: "npx only-allow pnpm"` | | 両アプリ |

**pnpm.overrides**: 2つのアプリで `postcss` の書き方だけ違います（carskiida は `"postcss": "^8.5.18"` で全体を上書き、budget-app は `"postcss@<8.5.18": "^8.5.18"` で古い版だけを上書き）。古い版だけに絞って上書きする budget-app の書き方の方が影響範囲が小さいので、**budget-app の内容をそのままコピー**します。

```json
"pnpm": {
  "overrides": {
    "vite": "^8.0.16",
    "brace-expansion@<1.1.18": "^1.1.18",
    "brace-expansion@>=5.0.0 <5.0.9": "^5.0.9",
    "browserslist@<4.28.7": "^4.28.7",
    "js-yaml@>=4.0.0 <4.3.2": "^4.3.2",
    "nanoid@<3.3.18": "^3.3.18",
    "postcss@<8.5.18": "^8.5.18",
    "undici@>=7.0.0 <7.29.0": "^7.29.0"
  }
}
```

**pnpm-workspace.yaml**: `apps/carskiida/pnpm-workspace.yaml` をコメントごとそのままコピーします（`minimumReleaseAge: 10080`、`minimumReleaseAgeStrict: false`、`ignoredBuiltDependencies: [sharp, unrs-resolver]`）。

### 1.2 新しく足す依存（2つだけ）

| パッケージ | 種別 | 足す理由 | 検討して採用しなかった案 |
|---|---|---|---|
| `leaflet` `^1.9.4` | dependencies | 地図を表示し、ピンを置くため。npm の `latest` は 1.9.4（2.0 は `alpha` タグなので使わない）。過去の版を含めて install / postinstall スクリプトは見当たらない（npm registry で確認）。 | Google Maps / Mapbox: APIキーと料金がかかり、外部への通信も増える |
| `@types/leaflet` `^1.9` | devDependencies | 型定義 | — |

**react-leaflet は使いません。** react-leaflet 5.0.0 は peerDependencies が `react ^19.0.0`、`leaflet ^1.9.0` で React 19 自体には対応しています（npm registry で確認）。それでも使わない理由は次の3つです。

1. このアプリの地図は「ピンを表示する」「クリックでピンを置く」の2種類だけなので、ラッパー（包んで使いやすくする部品）がなくても `useEffect` 1つで書けます。
2. react-leaflet を入れると `react-leaflet` と `@react-leaflet/core` の2つが依存に増えます。サプライチェーンの監査対象が増え、React が新しくなったときに対応待ちになる心配も増えます。
3. Next.js の SSR（サーバー側での描画）では、`leaflet` を `useEffect` の中で `await import('leaflet')` すれば `window` 未定義エラーを避けられます。`next/dynamic` を使う必要もなくなります（9章）。

**フォームライブラリ（react-hook-form）は使いません。** React 19 の Server Action（サーバーで動く関数）と zod の共通スキーマで足ります。budget-app は react-hook-form を使っていますが、依存を減らす方針を優先します。**date-fns も使いません**（日付は `YYYY-MM-DD` 文字列の比較と `Intl.DateTimeFormat` で済むため）。

**新しい依存を入れたら supply-chain-auditor の監査を必ず通します**（`.claude/rules/dependencies.md`）。Sprint 0 の完了条件に含めます。

---

## 2. ディレクトリ構成

```
apps/road-review/
├── package.json / pnpm-lock.yaml / pnpm-workspace.yaml   # 1章
├── .node-version                     # 22.22.0（budget-app からコピー）
├── .npmrc                            # engine-strict=true（rules/dependencies.md の指定。既存2アプリには無いので新しく作る）
├── .gitignore                        # carskiida からコピーし、"!.env.example" を追加（元の ".env*" だと .env.example まで無視されるため）
├── .env.example
├── AGENTS.md / CLAUDE.md             # budget-app からコピー（「Next 16 は学習データと違う」という注意書き）
├── README.md
├── next.config.ts                    # セキュリティヘッダー・CSP（12章）
├── eslint.config.mjs                 # carskiida のものに Atomic Design の import 制限を追加（2.2）
├── postcss.config.mjs / tsconfig.json   # budget-app からコピー
├── vitest.config.ts                  # 単体テスト・コンポーネントテスト（jsdom）
├── vitest.rls.config.ts              # RLS テスト（node 環境・ローカルの Supabase が必要）
├── playwright.config.ts
├── supabase/
│   ├── config.toml                   # `supabase init` で作り、auth と email テンプレートを設定（13章）
│   ├── templates/
│   │   ├── magic_link.html
│   │   └── confirmation.html
│   └── migrations/                   # スプリントごとに1ファイル（3.5）
│       ├── 00001_base_and_user_settings.sql   # Sprint 1
│       ├── 00002_keep_alive.sql               # Sprint 1
│       ├── 00003_roads.sql                    # Sprint 2
│       ├── 00004_drives_road_info.sql         # Sprint 3（road_summaries ビューを含む）
│       └── 00005_photos_storage.sql           # Sprint 4（photos・削除キュー・バケット）
├── docs/{product,strategy}/
├── tests/
│   ├── setup.ts                      # budget-app からコピー（jest-dom を登録）
│   ├── fixtures/
│   │   ├── build-gps-jpeg.ts         # GPS 入り EXIF を含む JPEG をバイト列で組み立てる（追加の依存なし）
│   │   └── images/                   # 上のスクリプトで作った画像ファイル
│   ├── helpers/
│   │   └── supabase-test-users.ts    # admin.generateLink → verifyOtp でユーザーA/Bのセッションを作る
│   ├── rls/
│   │   ├── roads.rls.test.ts
│   │   ├── drives.rls.test.ts
│   │   ├── road-info.rls.test.ts
│   │   ├── photos.rls.test.ts
│   │   ├── storage.rls.test.ts
│   │   └── constraints.db.test.ts    # 未来日付・写真6枚目・パス不一致などの DB 制約
│   └── e2e/
│       ├── global-setup.ts
│       ├── auth.spec.ts
│       ├── roads.spec.ts
│       ├── drives.spec.ts
│       ├── photos.spec.ts
│       ├── delete-cascade.spec.ts
│       └── safety.spec.ts
└── src/
    ├── proxy.ts                      # Next 16 の proxy（旧 middleware）
    ├── types/
    │   └── database.types.ts         # `supabase gen types` で自動生成
    ├── app/
    │   ├── layout.tsx                # <html lang="ja">、globals.css
    │   ├── globals.css
    │   ├── page.tsx                  # redirect('/roads')
    │   ├── not-found.tsx
    │   ├── auth/
    │   │   ├── confirm/page.tsx      # GET: 確認画面のみ → 「ログインする」で confirmMagicLink（18.1 S-6）
    │   │   └── error/page.tsx
    │   ├── (auth)/
    │   │   ├── layout.tsx            # AuthTemplate
    │   │   └── login/page.tsx
    │   └── (app)/
    │       ├── layout.tsx            # ログイン確認 + AppShellTemplate + SafetyNoticeDialog
    │       ├── error.tsx
    │       └── roads/
    │           ├── page.tsx          # 一覧（地図 + リスト）US-06
    │           ├── loading.tsx
    │           ├── new/page.tsx      # 道の登録 US-02
    │           └── [roadId]/
    │               ├── page.tsx      # 道の詳細 US-07
    │               ├── not-found.tsx
    │               ├── edit/page.tsx # 道の編集 US-09
    │               └── drives/
    │                   ├── new/page.tsx              # 走行記録の登録 US-03/04/05
    │                   └── [driveId]/edit/page.tsx   # 走行記録の編集 US-09
    ├── components/
    │   ├── atoms/        Button, Input, Textarea, Select, Checkbox, Radio, Label, FieldError,
    │   │                 Badge, Spinner, Alert, RatingStars, PhotoThumbnail
    │   ├── molecules/    FormField, RatingInput, ChoiceGroup, LatLngInputs, SafetyNoticeBanner,
    │   │                 ConfirmDialog, EmptyState, RoadListItem, RoadInfoSummary, DriveCard,
    │   │                 PhotoPickerItem, PrefectureSelect
    │   ├── organisms/    AppHeader, LoginForm, SafetyNoticeDialog, RoadForm, PinPicker, RoadsMap,
    │   │                 RoadList, DriveList, DriveForm, RoadInfoFieldset, PhotoUploader,
    │   │                 DeleteConfirmButton
    │   └── templates/    AuthTemplate, AppShellTemplate, RoadsIndexTemplate, RoadDetailTemplate,
    │                     FormPageTemplate
    │   （どのコンポーネントも 1ディレクトリに Name.tsx / Name.test.tsx / index.ts の3ファイル）
    ├── features/                     # carskiida の src/features/* と同じ置き方
    │   ├── auth/actions.ts           # requestMagicLink, signOut
    │   ├── settings/{actions.ts,queries.ts}    # acknowledgeSafetyNotice / getUserSettings
    │   ├── roads/{actions.ts,queries.ts}       # createRoad, updateRoad, deleteRoad / listRoadSummaries, getRoad, getRoadDeletionSummary
    │   ├── drives/{actions.ts,queries.ts}      # createDrive, updateDrive, deleteDrive / listDrivesWithDetails, getDrive, getLatestRoadInfo
    │   ├── photos/{actions.ts,queries.ts}      # attachPhoto, deletePhoto / signPhotoUrls
    │   └── storage/cleanup.ts        # removeObjectsWithQueue, flushStorageDeletionQueue（server-only）
    └── lib/
        ├── supabase/
        │   ├── client.ts             # createBrowserClient（budget-app と同じ形）
        │   ├── server.ts             # createServerClient + cookies()（budget-app と同じ形）
        │   └── proxy.ts              # updateSession（budget-app の middleware.ts を元に getClaims 版へ）
        ├── auth/
        │   └── get-user-id.ts        # getClaims() から sub を取る（server-only）
        ├── actions/
        │   └── result.ts             # ActionResult 型と、成功・失敗を作る関数
        ├── validation/
        │   ├── common.ts / auth.ts / road.ts / drive.ts / road-info.ts / photo.ts（それぞれ *.test.ts を同じ場所に置く）
        ├── image/
        │   ├── compute-target-size.ts
        │   ├── has-exif-segment.ts
        │   ├── process-image.ts      # 縮小と EXIF 除去（resizeAndStripExif）
        │   ├── photo-paths.ts        # Storage のパスを組み立てる（クライアントとサーバーで共用）
        │   └── run-with-concurrency.ts
        ├── map/
        │   ├── gsi-tiles.ts          # タイルURL・出典表示・ズーム範囲
        │   └── japan-bounds.ts
        ├── constants/
        │   ├── prefectures.ts        # JIS X 0401 の 1〜47
        │   └── labels.ts             # 道の種別・天候・車両・交通量などの表示名
        └── utils/
            ├── cn.ts                 # carskiida / budget-app と同じ
            ├── safe-next-path.ts
            └── date.ts               # todayInTokyo()
```

**テストの置き場所**: `.claude/rules/tests.md` に「テスト対象と同じディレクトリに置く」とあるので、それに従います（既存2アプリは `tests/unit/` に置いていますが、ルール側を優先）。DB/RLS/E2E は対象が1ファイルに対応しないので `tests/` に置きます。

### 2.1 Atomic Design の対応表

| コンポーネント | 階層 | Server/Client | 説明 |
|---|---|---|---|
| Button | atoms | どちらでも | variant: primary / secondary / danger / ghost。`aria-busy` に対応 |
| Input / Textarea / Select / Checkbox / Radio | atoms | どちらでも | フォーム部品。`aria-invalid` と `aria-describedby` を受け取る |
| Label / FieldError | atoms | どちらでも | FieldError は `role="alert"` ではなく `aria-live="polite"` の id 付き段落 |
| Badge | atoms | どちらでも | 道の種別などを表示。色だけでなく文字でも伝える |
| Spinner | atoms | どちらでも | 読み込み中。`role="status"` と visually-hidden の文言付き |
| Alert | atoms | どちらでも | info / warning / error。アイコンと文言で伝える（色だけにしない） |
| RatingStars | atoms | どちらでも | 評価の表示だけ。「総合 4/5」を文字でも出す |
| PhotoThumbnail | atoms | どちらでも | 署名付きURLの画像（`next/image` の `unoptimized`、width/height を指定） |
| FormField | molecules | どちらでも | Label + 入力欄（children）+ FieldError |
| RatingInput | molecules | Client（ネイティブ要素だけなら不要） | fieldset + Radio×5 で 1〜5 を選ぶ。矢印キーで操作できる |
| ChoiceGroup | molecules | どちらでも | fieldset + Radio。あり/なし/不明・天候・車両・交通量で共用 |
| LatLngInputs | molecules | Client | 緯度・経度の数値入力2つ（地図が使えない人向けの代わり） |
| PrefectureSelect | molecules | どちらでも | Label + Select（47都道府県） |
| SafetyNoticeBanner | molecules | Server | 記録フォームの上に常に出す注意（Alert + 定型文） |
| ConfirmDialog | molecules | Client | ネイティブの `<dialog>` で showModal する。確定ボタン + キャンセルボタン |
| EmptyState | molecules | Server | 「最初の道を登録しましょう」+ 登録ボタン |
| RoadListItem | molecules | Server | 名称・都道府県・最終走行日・総合評価（Badge + RatingStars） |
| RoadInfoSummary | molecules | Server | 最新の道の情報 +「確認日 YYYY-MM-DD・ユーザー記録」+ 公式情報を確認するよう促す注記 |
| DriveCard | molecules | Server | 1件の走行記録（評価・メモ・サムネイル） |
| PhotoPickerItem | molecules | Client | 選んだ写真1枚のプレビュー・状態・再試行/削除ボタン |
| AppHeader | organisms | Server | ロゴ・「道を登録」リンク・ログアウト（formのaction=signOut） |
| LoginForm | organisms | Client | useActionState(requestMagicLink) |
| SafetyNoticeDialog | organisms | Client | 初回だけ表示。「確認しました」で acknowledgeSafetyNotice |
| RoadForm | organisms | Client | PrefectureSelect、ChoiceGroup（種別）、PinPicker を組み合わせる |
| PinPicker | organisms | Client | Leaflet で開始/終了ピンを置く + LatLngInputs + 「地図の中心に置く」ボタン |
| RoadsMap | organisms | Client | 全部の道のピン（表示だけ）。リスト側と同じ情報を持つ |
| RoadList | organisms | Server | RoadListItem の並び、0件なら EmptyState |
| DriveList | organisms | Server | DriveCard を走行日の新しい順に並べる |
| RoadInfoFieldset | organisms | Client | 道の情報の入力欄（ChoiceGroup・Checkbox・Textarea・確認日） |
| PhotoUploader | organisms | Client | 写真選択・縮小・アップロードの状態管理（PhotoPickerItem の並び） |
| DriveForm | organisms | Client | 走行記録の入力 + RoadInfoFieldset + PhotoUploader + SafetyNoticeBanner |
| DeleteConfirmButton | organisms | Client | Button + ConfirmDialog + 削除用 Server Action（道/記録で共用） |
| AuthTemplate | templates | Server | 中央寄せのカード型レイアウト |
| AppShellTemplate | templates | Server | header スロット + main（幅 360px〜） |
| RoadsIndexTemplate | templates | Server | map スロット + list スロット + actions スロット |
| RoadDetailTemplate | templates | Server | header / roadInfo / drives / dangerZone の各スロット |
| FormPageTemplate | templates | Server | title / notice / form の各スロット |

### 2.2 依存の向き（逆向きの import を禁止する仕組み）

- 基本は atoms ← molecules ← organisms ← templates の一方向です。**molecules どうしの import は禁止**します。
- **organisms が別の organism を子に持つのは許可**します（DriveForm が RoadInfoFieldset と PhotoUploader を、RoadForm が PinPicker を含む）。Atomic Design の原典（Brad Frost）でも「organisms は molecules・atoms・他の organisms から成る」と定義されています。逆向き（organism → template）は禁止です。
- **データ取得とServer Action の import**: 呼び出せるのは organisms だけです（フォーム送信のため）。atoms / molecules / templates は `@/features/**` と `@/lib/supabase/**` を import しません（templates は「データを持たない」という規約に合わせる）。
- ESLint の `no-restricted-imports` で機械的に止めます（依存を増やさずに済む）。`eslint.config.mjs` に追加する内容:

```js
const layerRule = (forbidden, extra = []) => ({
  'no-restricted-imports': ['error', {
    patterns: [
      ...forbidden.map((layer) => ({
        group: [`@/components/${layer}/*`],
        message: `Atomic Design: this layer must not import from ${layer}.`,
      })),
      ...extra,
    ],
  }],
})
const noData = [{ group: ['@/features/*', '@/lib/supabase/*'], message: 'Only organisms (and app/) may touch data/actions.' }]

// add inside defineConfig([...])
{ files: ['src/components/atoms/**/*.{ts,tsx}'],     rules: layerRule(['molecules', 'organisms', 'templates'], noData) },
{ files: ['src/components/molecules/**/*.{ts,tsx}'], rules: layerRule(['molecules', 'organisms', 'templates'], noData) },
{ files: ['src/components/organisms/**/*.{ts,tsx}'], rules: layerRule(['templates']) },
{ files: ['src/components/templates/**/*.{ts,tsx}'], rules: layerRule([], noData) },
```

（molecules どうしの禁止は、`@/components/molecules/*` を molecules 自身の禁止リストに入れることで実現しています。ディレクトリ内の相対 import（`./RatingInput`）は対象外です。）

---

## 3. DB スキーマ

### 3.1 設計方針

- **種別などの選択肢は Postgres の enum ではなく `text` + `check` にします。** 選択肢を足すときは `alter table ... drop constraint / add constraint` だけで済みます（enum の `ALTER TYPE ... ADD VALUE` はトランザクション内での扱いに制約があるため避けます）。TypeScript 側の型は `lib/constants/labels.ts` の `as const` 配列と zod の `z.enum` で作ります。
- **すべてのテーブルに `user_id uuid not null default auth.uid()` を持たせます。** Server Action からは `user_id` を**渡しません**。DB の初期値（`auth.uid()` = ログイン中のユーザーID）が入り、RLS の `with check` で本人であることを確認します。クライアントから来た user_id は使いません。
- **`visibility` 列を roads と drives に持たせ、MVPでは `check (visibility in ('private'))` に固定**します。公開共有を始めるときに制約を広げるマイグレーションを足し、同時に公開用の RLS ポリシーも足します。今の段階で `'public'` を許すと、ポリシーが無いまま値だけ入り、将来ポリシーを足した瞬間に意図しない公開が起きる心配があるためです。
- **速度・時刻・タイム・ランキングの列は作りません**（走行日は `date` 型で、時刻は持ちません）。`created_at` / `updated_at` は記録を管理するための時刻で、走行の時刻ではありません。
- **緯度経度は日本の範囲で制限します**: 緯度20〜46、経度122〜154。沖ノ鳥島（北緯約20.4度）・南鳥島（東経約154.0度）・与那国島（東経約122.9度）・択捉島（北緯約45.5度）が入る、ゆるめの長方形です。都道府県を1〜47に限っているので、日本国外の点は入力ミスとして扱います。型は `double precision` にし、zod で小数6桁（約0.1m）に丸めます。
- **未来日付の禁止**: `check (driven_on <= current_date)` は**使いません**。Postgres は CHECK 制約の式が「常に同じ結果を返す（immutable）」ことを前提にしており、`current_date` のように日によって結果が変わる式を入れると、ダンプ/リストア（バックアップからの戻し）で失敗する原因になります。代わりに **BEFORE INSERT/UPDATE トリガー**で、日本時間の「今日」（`(now() at time zone 'Asia/Tokyo')::date`）と比べます。サーバーは UTC で動くので、日本時間で判定しないと 0時〜9時に「今日」が未来扱いになるズレが起きます。zod 側も同じく日本時間で判定します（8章）。
- **road_info の確認日は、指定がなければ走行日にします**: 列の DEFAULT では別テーブルの値を参照できないので、BEFORE INSERT トリガーで `coalesce(new.confirmed_on, drives.driven_on)` を入れます。
- **写真は1記録5枚まで**: BEFORE INSERT トリガーで親の drives 行を `for update` でロックしてから数えます（同時に2枚ずつ追加されても6枚目以降が入らないように）。
- **drives.road_id は後から変えられないようにします**（Storage のパスに road_id が入っているため）。

### 3.2 スキーマ本体（テーブル定義・トリガー）

以下はスキーマ全体を1か所で読めるようにまとめたものです。実際のマイグレーションファイルへの分け方は 3.5 のとおりです。

```sql
-- =========================================================
-- road-review: core schema
-- No speed / time-of-day / lap / ranking columns by design.
-- =========================================================

-- ---------- shared functions ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.today_in_tokyo()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Tokyo')::date;
$$;

-- ---------- roads ----------
create table if not exists public.roads (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid()
                     references auth.users (id) on delete cascade,
  name             text not null,
  prefecture_code  smallint not null,
  road_type        text not null default 'other',
  start_lat        double precision not null,
  start_lng        double precision not null,
  end_lat          double precision,
  end_lng          double precision,
  visibility       text not null default 'private',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint roads_name_length      check (char_length(name) between 1 and 50 and name = btrim(name)),
  constraint roads_prefecture_range check (prefecture_code between 1 and 47),
  constraint roads_road_type_values check (road_type in ('pass', 'skyline', 'coastal', 'forest', 'other')),
  constraint roads_visibility_values check (visibility in ('private')),
  constraint roads_start_in_japan   check (start_lat between 20 and 46 and start_lng between 122 and 154),
  constraint roads_end_pair         check ((end_lat is null) = (end_lng is null)),
  constraint roads_end_in_japan     check (end_lat is null or (end_lat between 20 and 46 and end_lng between 122 and 154))
);

create index if not exists roads_user_created_idx on public.roads (user_id, created_at desc);

create or replace trigger roads_set_updated_at
  before update on public.roads
  for each row execute function public.set_updated_at();

-- ---------- drives ----------
create table if not exists public.drives (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null default auth.uid()
                            references auth.users (id) on delete cascade,
  road_id                 uuid not null references public.roads (id) on delete cascade,
  driven_on               date not null,
  vehicle_type            text,
  weather                 text,
  rating_overall          smallint not null,
  rating_scenery          smallint,
  rating_road_surface     smallint,
  rating_ease_of_driving  smallint,
  traffic                 text,
  memo                    text not null default '',
  visibility              text not null default 'private',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint drives_vehicle_type_values check (vehicle_type is null or vehicle_type in ('car', 'motorcycle')),
  constraint drives_weather_values      check (weather is null or weather in ('sunny', 'cloudy', 'rain', 'snow', 'other')),
  constraint drives_rating_overall      check (rating_overall between 1 and 5),
  constraint drives_rating_scenery      check (rating_scenery is null or rating_scenery between 1 and 5),
  constraint drives_rating_road_surface check (rating_road_surface is null or rating_road_surface between 1 and 5),
  constraint drives_rating_ease         check (rating_ease_of_driving is null or rating_ease_of_driving between 1 and 5),
  constraint drives_traffic_values      check (traffic is null or traffic in ('few', 'normal', 'many')),
  constraint drives_memo_length         check (char_length(memo) <= 2000),
  constraint drives_visibility_values   check (visibility in ('private'))
);

create index if not exists drives_road_driven_idx on public.drives (road_id, driven_on desc, created_at desc);
create index if not exists drives_user_idx        on public.drives (user_id);

create or replace function public.drives_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.driven_on > public.today_in_tokyo() then
    raise exception 'driven_on_in_future' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and new.road_id is distinct from old.road_id then
    raise exception 'road_id_is_immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace trigger drives_guard_before_write
  before insert or update on public.drives
  for each row execute function public.drives_guard();

create or replace trigger drives_set_updated_at
  before update on public.drives
  for each row execute function public.set_updated_at();

-- ---------- road_info (1:1 snapshot per drive) ----------
create table if not exists public.road_info (
  drive_id             uuid primary key references public.drives (id) on delete cascade,
  user_id              uuid not null default auth.uid()
                         references auth.users (id) on delete cascade,
  confirmed_on         date not null,
  winter_closure       text not null default 'unknown',
  winter_closure_memo  text not null default '',
  toll                 text not null default 'unknown',
  toll_memo            text not null default '',
  regulation_memo      text not null default '',
  has_parking          boolean not null default false,
  has_toilet           boolean not null default false,
  has_michi_no_eki     boolean not null default false,
  has_observatory      boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint road_info_winter_values  check (winter_closure in ('yes', 'no', 'unknown')),
  constraint road_info_toll_values    check (toll in ('paid', 'free', 'unknown')),
  constraint road_info_winter_memo    check (char_length(winter_closure_memo) <= 200),
  constraint road_info_toll_memo      check (char_length(toll_memo) <= 200),
  constraint road_info_regulation     check (char_length(regulation_memo) <= 500)
);

create index if not exists road_info_user_idx on public.road_info (user_id);

create or replace function public.road_info_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.confirmed_on is null then
    select d.driven_on into new.confirmed_on
    from public.drives d
    where d.id = new.drive_id;
  end if;
  if new.confirmed_on is not null and new.confirmed_on > public.today_in_tokyo() then
    raise exception 'confirmed_on_in_future' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and new.drive_id is distinct from old.drive_id then
    raise exception 'drive_id_is_immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace trigger road_info_guard_before_write
  before insert or update on public.road_info
  for each row execute function public.road_info_guard();

create or replace trigger road_info_set_updated_at
  before update on public.road_info
  for each row execute function public.set_updated_at();

-- ---------- photos ----------
create table if not exists public.photos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid()
                  references auth.users (id) on delete cascade,
  drive_id      uuid not null references public.drives (id) on delete cascade,
  storage_path  text not null,
  thumb_path    text not null,
  width         integer not null,
  height        integer not null,
  byte_size     integer not null,
  mime_type     text not null default 'image/jpeg',
  sort_order    smallint not null default 0,
  created_at    timestamptz not null default now(),
  constraint photos_storage_path_unique unique (storage_path),
  constraint photos_thumb_path_unique   unique (thumb_path),
  constraint photos_width_range   check (width between 1 and 2048),
  constraint photos_height_range  check (height between 1 and 2048),
  constraint photos_byte_size     check (byte_size between 1 and 5242880),
  constraint photos_mime_values   check (mime_type = 'image/jpeg'),
  constraint photos_sort_order    check (sort_order between 0 and 4)
);

create index if not exists photos_drive_sort_idx on public.photos (drive_id, sort_order);
create index if not exists photos_user_idx       on public.photos (user_id);

create or replace function public.photos_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_road_id   uuid;
  v_owner_id  uuid;
  v_prefix    text;
  v_count     integer;
begin
  -- Lock parent drive so concurrent inserts cannot exceed the limit.
  select d.road_id, d.user_id into v_road_id, v_owner_id
  from public.drives d
  where d.id = new.drive_id
  for update;

  if v_road_id is null or v_owner_id <> new.user_id then
    raise exception 'drive_not_found' using errcode = '23503';
  end if;

  select count(*) into v_count from public.photos p where p.drive_id = new.drive_id;
  if v_count >= 5 then
    raise exception 'photo_limit_exceeded' using errcode = '23514';
  end if;

  v_prefix := new.user_id::text || '/' || v_road_id::text || '/' || new.drive_id::text || '/';
  if left(new.storage_path, length(v_prefix)) <> v_prefix
     or substr(new.storage_path, length(v_prefix) + 1) !~ '^[0-9a-f-]{36}\.jpg$'
     or left(new.thumb_path, length(v_prefix)) <> v_prefix
     or substr(new.thumb_path, length(v_prefix) + 1) !~ '^[0-9a-f-]{36}_thumb\.jpg$' then
    raise exception 'invalid_storage_path' using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace trigger photos_guard_before_insert
  before insert on public.photos
  for each row execute function public.photos_guard();

-- ---------- storage deletion queue ----------
-- Supabase does not delete Storage objects when DB rows are deleted.
-- Every deleted photo row enqueues its object paths in the same transaction;
-- server actions then call the Storage API and clear the queue.
-- No FK to auth.users on purpose: rows must survive account deletion so an
-- admin sweep can remove the files later.
create table if not exists public.storage_deletion_queue (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid(),
  object_path  text not null,
  attempts     integer not null default 0,
  enqueued_at  timestamptz not null default now(),
  constraint storage_deletion_queue_unique unique (user_id, object_path)
);

create index if not exists storage_deletion_queue_user_idx on public.storage_deletion_queue (user_id, enqueued_at);

create or replace function public.photos_enqueue_storage_deletion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.storage_deletion_queue (user_id, object_path)
  values (old.user_id, old.storage_path), (old.user_id, old.thumb_path)
  on conflict (user_id, object_path) do nothing;
  return old;
end;
$$;

create or replace trigger photos_enqueue_after_delete
  after delete on public.photos
  for each row execute function public.photos_enqueue_storage_deletion();

-- ---------- user_settings ----------
create table if not exists public.user_settings (
  user_id                         uuid primary key default auth.uid()
                                    references auth.users (id) on delete cascade,
  safety_notice_acknowledged_at   timestamptz,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

create or replace trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();
```

補足:
- `user_settings` は auth.users への INSERT トリガーで作るのではなく、**「確認しました」を押したときに upsert（無ければ作り、あれば更新）**します。auth.users のトリガーが失敗すると新規登録そのものが失敗するので、それを避けるためです。行が無いことを「まだ確認していない」とみなします。
- 道の情報のメモの上限（200/200/500文字）はPRDに書かれていないので、この設計で決めた値です（CPOの確認待ち。16章）。
- 施設は boolean（チェックした＝確認できた）です。「無いことを確認した」と「未確認」の区別は持ちません（PRD の「チェック」形式どおり）。
- **最新の道の情報（US-04）の取り方**: `getLatestRoadInfo(roadId)` は `supabase.from('road_info').select('*, drives!inner(road_id)').eq('drives.road_id', roadId).order('confirmed_on', { ascending: false }).limit(1).maybeSingle()` で取ります。1本の道あたりの記録数は少ないので、`drives_road_driven_idx` で足ります（confirmed_on 単独のインデックスは効かないので作りません）。

### 3.3 一覧用ビュー `road_summaries`

```sql
-- security_invoker = true so the caller's RLS applies (Postgres 15+).
create or replace view public.road_summaries
with (security_invoker = true)
as
select
  r.id,
  r.user_id,
  r.name,
  r.prefecture_code,
  r.road_type,
  r.start_lat,
  r.start_lng,
  r.end_lat,
  r.end_lng,
  r.created_at,
  r.updated_at,
  latest.driven_on      as last_driven_on,
  latest.rating_overall as last_rating_overall,
  coalesce(stats.drive_count, 0) as drive_count
from public.roads r
left join lateral (
  select d.driven_on, d.rating_overall
  from public.drives d
  where d.road_id = r.id
  order by d.driven_on desc, d.created_at desc
  limit 1
) latest on true
left join lateral (
  select count(*)::integer as drive_count
  from public.drives d
  where d.road_id = r.id
) stats on true;

revoke all on public.road_summaries from anon;
grant select on public.road_summaries to authenticated;
```

一覧の「総合評価」は**いちばん新しい走行記録の総合評価**にしました（「最終走行日」と同じ記録の値なので、並べて見たときに意味が揃うため）。平均を出す案は 16章の未決事項にしています。

### 3.4 keep-alive 関数

budget-app の `00006_create_keep_alive.sql` をそのまま使い、`.github/workflows/supabase-keep-alive.yml` の matrix に road-review を足します（作業は devops-engineer）。

```sql
create or replace function public.keep_alive()
returns json
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return json_build_object('status', 'alive', 'pinged_at', now());
end;
$$;

grant execute on function public.keep_alive() to anon;
```

### 3.5 マイグレーションファイルの分け方（CTOレビューで追加）

TDD でスプリントごとに機能を足していくので、**1スプリント = 1マイグレーションファイル**にします。各ファイルには、そのテーブルの定義・トリガー・RLS（4章）・権限設定をまとめて入れます（あとから別ファイルで RLS を足すと、RLS が無い状態のテーブルが一瞬でも存在するため）。

| ファイル | スプリント | 中身 |
|---|---|---|
| `00001_base_and_user_settings.sql` | Sprint 1 | `set_updated_at`、`today_in_tokyo`、user_settings テーブル + RLS + 権限 |
| `00002_keep_alive.sql` | Sprint 1 | 3.4 |
| `00003_roads.sql` | Sprint 2 | roads テーブル + インデックス + トリガー + RLS + 権限 |
| `00004_drives_road_info.sql` | Sprint 3 | drives・road_info テーブル + トリガー + RLS + 権限、road_summaries ビュー（3.3。drives を参照するのでここで作る） |
| `00005_photos_storage.sql` | Sprint 4 | photos テーブル + `photos_guard`、storage_deletion_queue + 削除時トリガー（photos の削除トリガーがキューを参照するので同じファイル）、両テーブルの RLS + 権限、Storage バケットと storage.objects のポリシー（5章） |

- Sprint 2 では road_summaries ビューがまだ無いので、`listRoadSummaries` は roads テーブルを直接読みます（最終走行日・総合評価は空）。Sprint 3 でビューに切り替え、最終走行日と総合評価のテストを Sprint 3 の Red に入れます。
- Sprint 5 では新しいマイグレーションは作りません（削除の連鎖はアプリ側の処理だけ）。

---

## 4. RLS ポリシー

（各テーブルと同じマイグレーションファイルに入れます。3.5）

方針:
- 全テーブルで RLS を有効にし、**`to authenticated` だけ**を対象にします。`anon`（ログインしていない利用者）からは権限そのものを取り上げます（`revoke`）。
- `auth.uid()` は `(select auth.uid())` と書きます（budget-app と同じ書き方。行ごとではなく1回だけ評価され、速くなる）。
- 子テーブル（drives / road_info / photos）は、**親の行も本人のものであること**を `with check` の `exists` で確かめます（他人の road_id を指定した insert を防ぐ）。
- update ポリシーには `using`（変更前の行の条件）と `with check`（変更後の行の条件）の両方を付け、user_id を他人に書き換えることも防ぎます。

以下は全テーブル分をまとめて書いたものです。ファイルを分けるときは、`enable row level security` / `revoke` / `grant` もそのファイルのテーブル分だけを書きます。

```sql
-- ---------- enable RLS ----------
alter table public.roads                  enable row level security;
alter table public.drives                 enable row level security;
alter table public.road_info              enable row level security;
alter table public.photos                 enable row level security;
alter table public.user_settings          enable row level security;
alter table public.storage_deletion_queue enable row level security;

-- ---------- privileges ----------
revoke all on table
  public.roads, public.drives, public.road_info, public.photos,
  public.user_settings, public.storage_deletion_queue
from anon;

grant select, insert, update, delete on table
  public.roads, public.drives, public.road_info, public.photos,
  public.user_settings, public.storage_deletion_queue
to authenticated;

-- Functions are executable by PUBLIC by default; restrict to authenticated.
revoke execute on function public.today_in_tokyo() from public, anon;
grant execute on function public.today_in_tokyo() to authenticated;

-- ---------- roads ----------
drop policy if exists "roads_select_own" on public.roads;
create policy "roads_select_own" on public.roads
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "roads_insert_own" on public.roads;
create policy "roads_insert_own" on public.roads
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "roads_update_own" on public.roads;
create policy "roads_update_own" on public.roads
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "roads_delete_own" on public.roads;
create policy "roads_delete_own" on public.roads
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------- drives ----------
drop policy if exists "drives_select_own" on public.drives;
create policy "drives_select_own" on public.drives
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "drives_insert_own" on public.drives;
create policy "drives_insert_own" on public.drives
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.roads r
      where r.id = drives.road_id
        and r.user_id = (select auth.uid())
    )
  );

drop policy if exists "drives_update_own" on public.drives;
create policy "drives_update_own" on public.drives
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.roads r
      where r.id = drives.road_id
        and r.user_id = (select auth.uid())
    )
  );

drop policy if exists "drives_delete_own" on public.drives;
create policy "drives_delete_own" on public.drives
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------- road_info ----------
drop policy if exists "road_info_select_own" on public.road_info;
create policy "road_info_select_own" on public.road_info
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "road_info_insert_own" on public.road_info;
create policy "road_info_insert_own" on public.road_info
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.drives d
      where d.id = road_info.drive_id
        and d.user_id = (select auth.uid())
    )
  );

drop policy if exists "road_info_update_own" on public.road_info;
create policy "road_info_update_own" on public.road_info
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.drives d
      where d.id = road_info.drive_id
        and d.user_id = (select auth.uid())
    )
  );

drop policy if exists "road_info_delete_own" on public.road_info;
create policy "road_info_delete_own" on public.road_info
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------- photos (no UPDATE policy: rows are immutable) ----------
drop policy if exists "photos_select_own" on public.photos;
create policy "photos_select_own" on public.photos
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "photos_insert_own" on public.photos;
create policy "photos_insert_own" on public.photos
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.drives d
      where d.id = photos.drive_id
        and d.user_id = (select auth.uid())
    )
  );

drop policy if exists "photos_delete_own" on public.photos;
create policy "photos_delete_own" on public.photos
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------- user_settings (no DELETE: removed by auth.users cascade) ----------
drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own" on public.user_settings
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own" on public.user_settings
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own" on public.user_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------- storage_deletion_queue ----------
drop policy if exists "sdq_select_own" on public.storage_deletion_queue;
create policy "sdq_select_own" on public.storage_deletion_queue
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "sdq_insert_own" on public.storage_deletion_queue;
create policy "sdq_insert_own" on public.storage_deletion_queue
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and left(object_path, 37) = (select auth.uid())::text || '/'
  );

drop policy if exists "sdq_update_own" on public.storage_deletion_queue;
create policy "sdq_update_own" on public.storage_deletion_queue
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "sdq_delete_own" on public.storage_deletion_queue;
create policy "sdq_delete_own" on public.storage_deletion_queue
  for delete to authenticated
  using ((select auth.uid()) = user_id);
```

補足:
- 他人の道の URL を開いても、RLS のせいで「行が見つからない」状態になります。ページ側ではそれを `notFound()` に変えて 404 を返します（US-01 の2つ目の受入条件）。
- トリガー関数はすべて `security invoker`（呼び出した本人の権限で動く。初期値）です。ログインユーザーとして動くので RLS もかかります。`photos_guard` の `select ... for update` は、drives の update ポリシーで本人の行だけが対象になります。
- アカウント削除（将来）は service role で実行します。service role は RLS を通らないので、キューへの insert も通ります（6.5）。

---

## 5. Storage

（`00005_photos_storage.sql` に入れます。3.5）

### 5.1 バケットとパスの決まり

- バケット名 `road-photos`、**非公開**（`public = false`）
- `file_size_limit = 5242880`（5MB）。元ファイルの20MB上限は**クライアント側で縮小する前**に確認する値です。サーバーに届くのは縮小後の JPEG（長辺2048pxで品質0.85なら、目安は数百KB〜2MB程度）だけなので、バケットの上限はそれより厳しくしています。
- `allowed_mime_types = ['image/jpeg']`。クライアント側の変換結果は必ず JPEG なので、JPEG 以外は受け付けません（10章で、出力形式を JPEG に固定した理由を説明）。**注意**: この MIME の確認はアップロード時の Content-Type ヘッダーで判定されるので、ファイルの中身（先頭のバイト列）の確認ではありません。悪意のある本人が自分のバケットにEXIF付きのファイルを置くことは理論上できますが、MVPは非公開なので影響は本人のプライバシーだけです。
- パス: `{user_id}/{road_id}/{drive_id}/{photo_id}.jpg` と `{user_id}/{road_id}/{drive_id}/{photo_id}_thumb.jpg`（`photo_id` はクライアントで作る UUID）

**サムネイル（長辺512px）も作る理由**: 道詳細では記録×最大5枚の画像が並びます。2048px の画像を一覧に並べると、4G回線で LCP（主要な表示が終わるまでの時間）2.5秒の目標を守りにくくなります。Supabase の画像変換機能（Image Transformations）は有料プランの機能なので、クライアントで2サイズ作ります。

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('road-photos', 'road-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- SELECT: own folder only (needed for createSignedUrls / list)
drop policy if exists "road_photos_select_own" on storage.objects;
create policy "road_photos_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'road-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- INSERT: own folder AND the {road_id}/{drive_id} pair must be an own drive
drop policy if exists "road_photos_insert_own_drive" on storage.objects;
create policy "road_photos_insert_own_drive" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'road-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 3
    and exists (
      select 1 from public.drives d
      where d.id::text      = (storage.foldername(name))[3]
        and d.road_id::text = (storage.foldername(name))[2]
        and d.user_id       = (select auth.uid())
    )
  );

-- DELETE: own folder only
drop policy if exists "road_photos_delete_own" on storage.objects;
create policy "road_photos_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'road-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- No UPDATE policy: overwrite (upsert) is intentionally impossible.
```

確認済みの事項（context7 / Supabase docs）: `storage.foldername(name)` がフォルダの区切りを配列で返すこと、`storage.objects` に `bucket_id` と `(storage.foldername(name))[1]` を使ったポリシーを書く形、`storage.buckets` への SQL insert、`file_size_limit` / `allowed_mime_types` の指定。

### 5.2 アップロード方式: ログイン中のブラウザから直接アップロードする

**採用**: ブラウザの Supabase クライアント（ログイン中のユーザーのセッション付き）で `storage.from('road-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false })` を呼びます。

理由:
1. **Server Action を経由させない**: Next.js の Server Action は受け取れるデータの上限が初期値で 1MB、Vercel の関数もリクエスト本文に上限があります。画像をサーバー経由にすると、この上限に引っかかります。
2. **署名付きアップロードURL（createSignedUploadUrl）と比べて、往復が1回少ない**: 署名付きURLは「サーバーでURLを作る → ブラウザがアップロードする」の2段階になります。直接アップロードでも、上の insert ポリシーが「自分のフォルダか」「road_id と drive_id の組み合わせが自分の記録か」まで DB 側で確かめるので、安全性は同じです。
3. ファイルを上書きできないので、他の記録の写真を差し替える攻撃は起きません。

### 5.3 画像を表示するための署名付きURL

- Server Component の中で、`supabase.storage.from('road-photos').createSignedUrls(paths, 3600)` を**1回にまとめて**呼びます（ページ内の全サムネイル + 元画像）。有効期限は1時間です。
- ページはクッキーを使うので毎回動的に描画され、表示のたびに新しい URL が作られます。
- `next/image` は `unoptimized` で使います。署名付きURLは毎回変わるので Next の画像最適化のキャッシュが効かず、Vercel の画像最適化の利用量だけが増えるためです。width と height は photos テーブルの値を渡し、レイアウトのずれ（CLS）を防ぎます。
- 返り値は1件ずつ `error` を持つことがあります。失敗した写真は「画像を読み込めませんでした」という代わりの表示にします。

---

## 6. 連鎖削除（DB + Storage）

### 6.1 前提

- DB の行は外部キーの `on delete cascade` で自動的に消えます（roads → drives → road_info / photos）。
- **Storage のファイルは、DB の行を消しても消えません**。Supabase の公式ドキュメントでも「オブジェクトは Storage API で消すこと。SQL で消すとファイルだけが残る（孤立する）」とされています。さらに 2026年3月の Supabase の告知によると、`storage` スキーマのテーブルに対する SQL の DELETE は、初期設定ではトリガーで拒否されるようになっています（context7 で確認）。→ **ファイルの削除は必ず `storage.remove()` で行います**（1回で最大1000件）。

### 6.2 順番: DB を先に消し、ファイルを後で消す

| 順番 | 途中で失敗したときに起きること | 判断 |
|---|---|---|
| ファイル → DB | ファイルが消えたのに DB の行が残り、画面に壊れた画像が出る。利用者に見える不具合 | 採用しない |
| **DB → ファイル** | DB は消えたがファイルが残る。非公開なので誰にも見えず、残るのはストレージ代だけ。**キューに積んでおけば後で消し直せる** | **採用** |

そのため、photos の AFTER DELETE トリガーが、**DB を削除するのと同じトランザクションの中で** `storage_deletion_queue`（削除待ちの一覧）にパスを積みます（3.2）。道の削除で連鎖して消えた写真も、自動で積まれます。

### 6.3 deleteRoad の処理の流れ

```
deleteRoad(roadId)
 1. getUserId() → 無ければ unauthorized を返す
 2. z.uuid().safeParse(roadId) → 不正なら not_found を返す
 3. roads から id を select（RLS で本人の行だけ）→ 無ければ not_found
 4. 孤立ファイルも集める: storage.list(`${uid}/${roadId}`) で記録ごとのフォルダを取り、
    各フォルダを list → ファイルのパスを集める
    （アップロード後に attachPhoto が失敗した、DB の行が無いファイルも拾うため）
 5. delete from roads where id = roadId
    → cascade で drives / road_info / photos が消え、トリガーがキューに積む
 6. removeObjectsWithQueue(supabase, uid, listedPaths)
    = (キューの本人分 ∪ 4で集めたパス) を1000件ずつ storage.remove
    → 成功したらキューの行を消す。失敗したら attempts を +1 し、4で集めたパスをキューへ insert
 7. revalidatePath('/roads') → redirect('/roads')
    Storage の削除に失敗しても DB は消えているので、ok: true で返し、
    warning: 'storage_cleanup_pending' を付ける（画面表示は、トースト用のクエリ ?notice=cleanup_pending）
```

- deleteDrive も同じ流れで、対象フォルダが `${uid}/${roadId}/${driveId}` になるだけです。deletePhoto はフォルダの list をせず、行を消してキューを処理するだけです。
- `flushStorageDeletionQueue()` は**削除系の Server Action の最初でも毎回呼び**、前回消し損ねたファイルを再び消そうとします（Server Component の描画中には変更処理をしないため、ここに置いています）。

### 6.4 確認ダイアログに出す件数（US-09）

道詳細ページ（Server Component）で、件数だけを取る問い合わせを2つ並べて実行し、DeleteConfirmButton に渡します。

```ts
const [drivesResult, photosResult] = await Promise.all([
  supabase.from('drives').select('id', { count: 'exact', head: true }).eq('road_id', roadId),
  supabase.from('photos').select('id, drives!inner(road_id)', { count: 'exact', head: true }).eq('drives.road_id', roadId),
])
// → 「この道の記録{drivesResult.count}件と写真{photosResult.count}枚も削除されます」
```

ページは変更のたびに revalidatePath されるので、件数が古くなることは基本的にありません。ダイアログには `<dialog>` を使い、キャンセルしたときはサーバーを一切呼びません（「キャンセル時は何も削除されない」の条件）。

### 6.5 アカウント削除（MVPの範囲外・将来）

`auth.users` を削除すると全テーブルの行が cascade で消えます。ただしこのときはログイン中のユーザーとしてではなく service role で動くので、キューの行は残ります（キューは auth.users に外部キーを張っていないため）。将来アカウント削除機能を作るときは、service role で `${uid}/` 以下を list して remove する処理と、キューを掃除する処理を一緒に作ります。

---

## 7. Server Actions / Route Handlers / Server Components の使い分け

| 用途 | 方式 | 例 |
|---|---|---|
| データを読む | **Server Component** から `features/*/queries.ts`（`import 'server-only'`）を呼ぶ | 一覧・詳細・編集フォームの初期値 |
| データを変える | **Server Action**（`'use server'`、zod で確認 + ログイン確認） | create/update/delete、attachPhoto、acknowledgeSafetyNotice、requestMagicLink、signOut |
| 認証メールのリンクを受ける | **Server Component の確認画面**（`src/app/auth/confirm/page.tsx`）＋ Server Action `confirmMagicLink` | GET では verifyOtp しない。ボタンの POST で verifyOtp（18.1 S-6） |
| 画像のアップロード | **ブラウザから Storage へ直接**（5.2） | |

Route Handler は使いません。メールのリンク（GET）は確認画面を表示するだけにし、「ログインする」ボタンの Server Action で verifyOtp します（ログインCSRFと、リンク検査によるトークン消費を防ぐため。18.1 S-6）。

### 7.1 戻り値の型の決まり（`src/lib/actions/result.ts`）

```ts
export type ActionErrorCode =
  | 'unauthorized'
  | 'validation'
  | 'not_found'
  | 'photo_limit_exceeded'
  | 'rate_limited'
  | 'conflict'
  | 'unexpected'

export type FieldErrors = Partial<Record<string, string[]>>

export type ActionResult<TData = undefined> =
  | { ok: true; data: TData; warning?: 'storage_cleanup_pending' }
  | { ok: false; error: { code: ActionErrorCode; message: string; fieldErrors?: FieldErrors } }

export const actionOk = <TData>(data: TData, warning?: 'storage_cleanup_pending'): ActionResult<TData> =>
  ({ ok: true, data, ...(warning ? { warning } : {}) })

export const actionError = (code: ActionErrorCode, message: string, fieldErrors?: FieldErrors): ActionResult<never> =>
  ({ ok: false, error: { code, message, fieldErrors } })
```

- Postgres のエラーを利用者向けのエラーに変える関数を `features/*/actions.ts` に置きます: `23514` + `photo_limit_exceeded` → `photo_limit_exceeded`、`driven_on_in_future` → validation（フィールド `drivenOn`）、`42501`（RLS 違反）→ `not_found`。
- `redirect()` は例外を投げて画面を移動させる仕組みなので、**try ブロックの外で**呼びます（Next.js docs で確認）。
- revalidatePath（ページのキャッシュを捨てて作り直させる）:

| Action | 対象のパス |
|---|---|
| createRoad / updateRoad | `/roads`、`/roads/${roadId}` |
| deleteRoad | `/roads` |
| createDrive / updateDrive / deleteDrive / attachPhoto / deletePhoto | `/roads`（最終走行日が変わる）、`/roads/${roadId}` |
| acknowledgeSafetyNotice | `revalidatePath('/', 'layout')`（layout 単位） |

### 7.2 フォームの送り方（React 19）

- **LoginForm**: `<form action={formAction}>` に `useActionState(requestMagicLink, initialState)` をつなぎます（Next.js docs と React docs で確認した標準的な形）。メールアドレス欄が1つだけなので、送信後に入力が消えても問題ありません。
- **RoadForm / DriveForm**: **入力値は React の state で持ち（controlled）、`onSubmit` で zod の確認 → `startTransition(async () => { const result = await createRoad(input) })` のように Server Action を関数として呼びます。** 理由:
  1. React 19 では「`<form action>` の処理が成功すると、state で管理していない（uncontrolled）入力欄が自動でリセットされる」仕様です（react.dev で確認）。Server Action が「エラー」を返しても、処理としては成功扱いなので入力が消えます。US-05 の「入力済みの記録本文は失われない」を確実に守るため、この方式にします。
  2. ピンの位置や写真の一覧は、もともとクライアントの state にしかないデータです。
  3. 地図には JavaScript が必須なので、JavaScript なしでも動く作り（プログレッシブエンハンスメント）にこだわる意味が薄いです。
- Server Action には FormData ではなく**普通のオブジェクト**を渡します（シリアライズできる値なら渡せる）。サーバー側でも**同じ zod スキーマで必ず確認し直します**（クライアントの確認は信用しない）。

### 7.3 ログイン確認

```ts
// src/lib/auth/get-user-id.ts
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function getUserId(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) return null
  return data.claims.sub
}
```

- **getClaims() を使います**。Supabase の公式資料では「getClaims() はトークンの署名と期限を確かめ、リクエストを許可する判断にはこれで十分。サーバー側でセッションが取り消されたことまで見たいときだけ getUser() を使う」とされています（context7 の advanced-guide で確認）。公式の proxy/middleware の例も getClaims() を使っています。
- **全部の Server Action と全部のデータ取得関数の最初で getUserId を呼びます。** proxy や layout の確認だけに頼りません（layout は画面遷移のたびに必ず再実行されるとは限らないため）。
- ただしデータを守る本当の砦は RLS です。アプリ側の確認は、分かりやすいエラーを返すための前段です。

---

## 8. バリデーション（zod v4 / クライアントとサーバーで共用）

確認した zod v4 の書き方（context7 の colinhacks/zod v4.3.6）: `z.iso.date()`、`z.uuid()`、`z.enum()`、エラー文の `{ error: '...' }` 指定、`z.flattenError(error).fieldErrors`、`z.file().max().mime()`。

```ts
// src/lib/utils/date.ts
export function todayInTokyo(now: Date = new Date()): string {
  // 'en-CA' formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(now)
}
```

```ts
// src/lib/validation/common.ts
import * as z from 'zod'
import { todayInTokyo } from '@/lib/utils/date'

export const isoDateSchema = z.iso.date({ error: '日付の形式が正しくありません' })

export const notFutureDateSchema = isoDateSchema.refine(
  (value) => value <= todayInTokyo(),
  { error: '未来の日付は選べません' },
)

export const ratingSchema = z
  .number({ error: '1〜5で選んでください' })
  .int({ error: '1〜5で選んでください' })
  .min(1, { error: '1〜5で選んでください' })
  .max(5, { error: '1〜5で選んでください' })

export const optionalRatingSchema = ratingSchema.nullable()

const roundTo6 = (value: number) => Math.round(value * 1e6) / 1e6

export const latLngSchema = z.object({
  lat: z.number().min(20, { error: '日本国内の位置を指定してください' }).max(46, { error: '日本国内の位置を指定してください' }).transform(roundTo6),
  lng: z.number().min(122, { error: '日本国内の位置を指定してください' }).max(154, { error: '日本国内の位置を指定してください' }).transform(roundTo6),
})

export const uuidSchema = z.uuid()
```

```ts
// src/lib/validation/road.ts
import * as z from 'zod'
import { latLngSchema } from './common'

export const ROAD_TYPES = ['pass', 'skyline', 'coastal', 'forest', 'other'] as const

export const roadInputSchema = z.object({
  name: z.string().trim()
    .min(1, { error: '名称を入力してください' })
    .max(50, { error: '名称は50文字以内で入力してください' }),
  prefectureCode: z.number({ error: '都道府県を選択してください' }).int().min(1).max(47),
  roadType: z.enum(ROAD_TYPES).default('other'),
  // UI state starts as null; output type is non-null so the action never sees a missing start pin.
  start: latLngSchema.nullable().transform((value, context) => {
    if (value === null) {
      context.addIssue({ code: 'custom', message: '開始ピンを置いてください' })
      return z.NEVER
    }
    return value
  }),
  end: latLngSchema.nullable(),
})
export type RoadInput = z.input<typeof roadInputSchema>
export type RoadValues = z.output<typeof roadInputSchema>
```

```ts
// src/lib/validation/road-info.ts
import * as z from 'zod'
import { notFutureDateSchema } from './common'

export const roadInfoInputSchema = z.object({
  confirmedOn: notFutureDateSchema.nullable(),        // null → DB trigger uses driven_on
  winterClosure: z.enum(['yes', 'no', 'unknown']).default('unknown'),
  winterClosureMemo: z.string().trim().max(200, { error: '200文字以内で入力してください' }).default(''),
  toll: z.enum(['paid', 'free', 'unknown']).default('unknown'),
  tollMemo: z.string().trim().max(200, { error: '200文字以内で入力してください' }).default(''),
  regulationMemo: z.string().trim().max(500, { error: '500文字以内で入力してください' }).default(''),
  facilities: z.object({
    parking: z.boolean().default(false),
    toilet: z.boolean().default(false),
    michiNoEki: z.boolean().default(false),
    observatory: z.boolean().default(false),
  }),
})
```

```ts
// src/lib/validation/drive.ts
import * as z from 'zod'
import { notFutureDateSchema, optionalRatingSchema, ratingSchema, uuidSchema } from './common'
import { roadInfoInputSchema } from './road-info'

export const VEHICLE_TYPES = ['car', 'motorcycle'] as const
export const WEATHERS = ['sunny', 'cloudy', 'rain', 'snow', 'other'] as const
export const TRAFFIC_LEVELS = ['few', 'normal', 'many'] as const

// Note: confirmedOn may be later than drivenOn (info checked afterwards). Only future dates are rejected.
export const driveInputSchema = z.object({
  roadId: uuidSchema,
  drivenOn: notFutureDateSchema,
  vehicleType: z.enum(VEHICLE_TYPES).nullable(),
  weather: z.enum(WEATHERS).nullable(),
  ratingOverall: ratingSchema,
  ratingScenery: optionalRatingSchema,
  ratingRoadSurface: optionalRatingSchema,
  ratingEaseOfDriving: optionalRatingSchema,
  traffic: z.enum(TRAFFIC_LEVELS).nullable(),
  memo: z.string().max(2000, { error: 'メモは2000文字以内で入力してください' }).default(''),
  roadInfo: roadInfoInputSchema.nullable(),           // null → no road_info row
})
export type DriveInput = z.input<typeof driveInputSchema>
```

```ts
// src/lib/validation/photo.ts
import * as z from 'zod'
import { uuidSchema } from './common'

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024
export const MAX_PHOTOS_PER_DRIVE = 5
export const MAX_LONG_EDGE = 2048
export const THUMB_LONG_EDGE = 512
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

// Client-side: validate the original file BEFORE processing
export const originalImageFileSchema = z
  .file({ error: 'ファイルを選んでください' })
  .mime([...ACCEPTED_IMAGE_TYPES], { error: 'JPEG・PNG・WebPの画像を選んでください' })
  .max(MAX_ORIGINAL_BYTES, { error: '1枚20MBまでの画像を選んでください' })

// Server-side: metadata recorded after upload (path is rebuilt on the server)
export const attachPhotoInputSchema = z.object({
  driveId: uuidSchema,
  photoId: uuidSchema,
  width: z.number().int().min(1).max(MAX_LONG_EDGE),
  height: z.number().int().min(1).max(MAX_LONG_EDGE),
  byteSize: z.number().int().min(1).max(MAX_UPLOAD_BYTES),
  sortOrder: z.number().int().min(0).max(MAX_PHOTOS_PER_DRIVE - 1),
})

export function canAddPhotos(currentCount: number, adding: number): boolean {
  return currentCount + adding <= MAX_PHOTOS_PER_DRIVE
}
```

```ts
// src/lib/validation/auth.ts
import * as z from 'zod'
export const magicLinkSchema = z.object({
  email: z.email({ error: 'メールアドレスの形式が正しくありません' }).trim(),
  next: z.string().optional(),
})
```

- フィールドごとのエラーは `z.flattenError(result.error).fieldErrors` で作ります（v3 の `error.flatten()` ではない書き方）。
- 写真が6枚目のとき: UI は `canAddPhotos` で「1記録につき5枚まで」と表示して追加しません。サーバーでも photos_guard トリガーが最後の砦になります（US-05）。
- 評価: UI は RatingInput（ラジオボタン5つ）なので1〜5しか選べません。それでもサーバーの zod と DB の check で、範囲外の値は二重に弾きます（US-03）。
- `z.file().mime()` に配列を渡せること、`transform` 内の `context.addIssue` と `z.NEVER` の書き方は、Sprint 2/4 の Red テストで実際に動くことを確かめます（16章）。

---

## 9. 地図

### 9.1 タイルと出典表示（`src/lib/map/gsi-tiles.ts`）

国土地理院の「地理院タイル一覧」ページ（https://maps.gsi.go.jp/development/ichiran.html ）で確認した内容:
- 標準地図の URL: `https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png`
- 日本全国のズームレベル（拡大段階）は 5〜18（18 は 1/2,500 相当）
- 出典は「国土地理院」または「地理院タイル」と書き、一覧ページへのリンクを付ける。ウェブサイトやアプリでリアルタイムに表示するだけなら申請は不要

```ts
export const GSI_STD_TILE_URL = 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'
export const GSI_ATTRIBUTION =
  '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener noreferrer">国土地理院</a>'
export const GSI_MIN_ZOOM = 5
export const GSI_MAX_ZOOM = 18
export const JAPAN_CENTER: [number, number] = [36.2, 138.25]
export const JAPAN_DEFAULT_ZOOM = 5
```

### 9.2 SSR への対策と、地図をどう組み込むか

- Leaflet は読み込んだ瞬間に `window` を参照するので、サーバー側の描画（SSR）では動きません。
- **採用**: `'use client'` のコンポーネントの `useEffect` の中で `const leaflet = (await import('leaflet')).default` のように後から読み込みます。型だけは `import type * as Leaflet from 'leaflet'` で取ります（型の import はビルド後に消えます）。
- **代わりの案**: `next/dynamic(..., { ssr: false })`。Next.js docs では `ssr: false` を **Client Component の中でだけ**使う例になっており、Server Component では使えません（v16.2.9 の lazy-loading docs で確認）。今回は useEffect 内での読み込みで足り、この制約を気にしなくてよいので採用しません。
- CSS は `import 'leaflet/dist/leaflet.css'` を地図コンポーネント（Client Component）で読み込みます。App Router では node_modules の CSS をコンポーネントから import できます。
- StrictMode（開発時は effect が2回動く）でも「Map container is already initialized」エラーが出ないよう、effect の後片付け（cleanup）で必ず `map.remove()` を呼び、ref で二重に初期化しないようにします。

### 9.3 マーカーのアイコン

Leaflet の初期アイコンは画像のパスを CSS から推測する仕組みのため、バンドラ（Next.js/Turbopack など）を通すとパスが壊れることがよく知られています。**`L.divIcon` を使い、HTML/CSS でマーカーを描きます**（画像アセット不要）。開始は「始」、終了は「終」の文字を入れ、色以外でも区別できるようにします。マーカーにはそれぞれ `title` と `alt` に道の名前を設定し、`keyboard: true` にしてキーボードでも選べるようにします。

### 9.4 PinPicker（organisms、Client）

- 「開始」「終了」のどちらを置くかを ChoiceGroup で選び、地図をクリックするとその種類のピンが置かれます。
- **キーボードでも操作できる代わりの手段**:
  1. LatLngInputs（緯度・経度の数値入力）。地図と入力欄は常に同じ値になるよう連動します
  2. 「地図の中心に置く」ボタン。Leaflet の地図は矢印キーで動かせて、+/− で拡大縮小できるので、キーボードで中心を合わせてからボタンを押せばピンが置けます
- 「終了ピンを消す」ボタンも付けます。
- **現在地ボタンは付けません。** `navigator.geolocation` と Leaflet の `map.locate()` は使いません（CEO決定）。さらにヘッダーの `Permissions-Policy: geolocation=()` で、ブラウザ側でも位置情報の利用を禁止します（12章）。

### 9.5 RoadsMap（organisms、Client）

- `road_summaries` を props で受け取り、開始地点にピンを立てます。ピンをクリックすると道の名前と詳細へのリンクが出ます。
- 全部のピンが入るよう `fitBounds` で表示範囲を合わせます（0件のときは日本全体を表示）。
- **リストでも同じ情報を必ず出します**（WCAG 2.1 AA と PRD 9章）: RoadsIndexTemplate は map スロットと list スロットを両方持ち、RoadList が地図と同じ件数・同じ名前を出します。地図の領域には `aria-label="道の地図（同じ内容は下のリストにあります）"` を付けます。

### 9.6 CSP との関係

`img-src` に `https://cyberjapandata.gsi.go.jp` を許可します。Leaflet は要素に直接スタイル（inline style）を書くので、`style-src 'unsafe-inline'` が必要です（12章の CSP に含めています）。

---

## 10. 画像の処理（縮小と EXIF 除去）

### 10.1 手順（ゴールから逆算した流れ）

ゴールは「位置情報を含まない、軽い JPEG だけを Storage に置く」ことです。そのために、Canvas に描き直して JPEG にし直します（描き直すと、元のファイルにあった EXIF などの付加情報は新しいファイルに引き継がれないため）。さらにそのために、描く前に向き（EXIF の回転情報）を反映して、写真が横倒しにならないようにします。

1. **選んだ時点で確認する**: 枚数（`canAddPhotos`）→ `originalImageFileSchema`（形式・20MB）。HEIC は `File.type` が `image/heic` になるか空になるので、ここで弾かれます。
2. **読み込む**: `createImageBitmap(file, { imageOrientation: 'from-image' })`。`'from-image'` は EXIF の向き情報に従って画像を回転させる指定で、仕様上の初期値です（MDN で確認）。初期値ですが、意図をはっきりさせるために明示します。
3. **サイズを計算する**: `computeTargetSize(width, height, 2048)`（長辺が2048を超えるときだけ縮小し、拡大はしない）。
4. **描き直す**: `<canvas>` に白で塗りつぶしてから `drawImage` します（PNG の透明部分が JPEG で黒くならないように）。`imageSmoothingQuality = 'high'` にします。
5. **JPEG にする**: `canvas.toBlob(callback, 'image/jpeg', 0.85)`。MDN によると、ブラウザが対応していない形式を指定すると PNG で返ってきます。そのため `blob.type === 'image/jpeg'` を必ず確認します。必ず対応しているのは PNG だけで、JPEG と WebP は「多くのブラウザが対応」という扱いです。WebP の書き出しは環境によって差があるので、**出力は JPEG に固定**します。
6. **念のため確認する**: 出力した blob の先頭を `hasExifSegment()` で調べ、APP1 Exif が残っていたら失敗にします。
7. サムネイル（長辺512px）も、同じ ImageBitmap から作ります。終わったら `bitmap.close()` でメモリを解放します。
8. **アップロードする**: `buildPhotoPaths()` で作ったパスへ `upload(..., { contentType: 'image/jpeg', upsert: false })`（元画像 → サムネイルの順）。
9. **記録する**: `attachPhoto({ driveId, photoId, width, height, byteSize, sortOrder })`。サーバー側でパスを組み立て直し、photos に insert します。

### 10.2 コードの骨組み

```ts
// src/lib/image/compute-target-size.ts
export function computeTargetSize(width: number, height: number, maxLongEdge: number) {
  const longEdge = Math.max(width, height)
  if (longEdge <= maxLongEdge) return { width, height }
  const scale = maxLongEdge / longEdge
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}
```

```ts
// src/lib/image/has-exif-segment.ts
// Walks JPEG markers until SOS; returns true if an APP1 "Exif\0\0" segment exists.
export function hasExifSegment(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return false
  let offset = 2
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return false
    const marker = bytes[offset + 1]
    if (marker === 0xda || marker === 0xd9) return false // SOS / EOI: metadata area ended
    const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3]
    if (marker === 0xe1 && offset + 10 <= bytes.length) {
      const signature = String.fromCharCode(...bytes.slice(offset + 4, offset + 10))
      if (signature === 'Exif\u0000\u0000') return true
    }
    offset += 2 + segmentLength
  }
  return false
}
```

```ts
// src/lib/image/process-image.ts
import { computeTargetSize } from './compute-target-size'
import { hasExifSegment } from './has-exif-segment'
import { MAX_LONG_EDGE, THUMB_LONG_EDGE } from '@/lib/validation/photo'

export class ImageProcessingError extends Error {
  constructor(public readonly reason: 'decode_failed' | 'canvas_unavailable' | 'encode_failed' | 'exif_remaining') {
    super(reason)
  }
}

export type EncodedImage = { blob: Blob; width: number; height: number }

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob && blob.type === 'image/jpeg' ? resolve(blob) : reject(new ImageProcessingError('encode_failed'))),
      'image/jpeg',
      quality,
    )
  })
}

async function encode(bitmap: ImageBitmap, maxLongEdge: number, quality: number): Promise<EncodedImage> {
  const { width, height } = computeTargetSize(bitmap.width, bitmap.height, maxLongEdge)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new ImageProcessingError('canvas_unavailable')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, width, height)
  const blob = await canvasToJpeg(canvas, quality)
  const head = new Uint8Array(await blob.slice(0, 65536).arrayBuffer())
  if (hasExifSegment(head)) throw new ImageProcessingError('exif_remaining')
  canvas.width = 0 // release backing store early (helps iOS Safari)
  canvas.height = 0
  return { blob, width, height }
}

/** Resize (long edge 2048px) and strip all metadata (EXIF/GPS) by re-encoding. */
export async function resizeAndStripExif(file: File): Promise<{ main: EncodedImage; thumb: EncodedImage }> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new ImageProcessingError('decode_failed')
  }
  try {
    const main = await encode(bitmap, MAX_LONG_EDGE, 0.85)
    const thumb = await encode(bitmap, THUMB_LONG_EDGE, 0.8)
    return { main, thumb }
  } finally {
    bitmap.close()
  }
}
```

```ts
// src/lib/image/photo-paths.ts (shared by client upload and server attachPhoto)
export function buildPhotoPaths(params: { userId: string; roadId: string; driveId: string; photoId: string }) {
  const prefix = `${params.userId}/${params.roadId}/${params.driveId}`
  return { storagePath: `${prefix}/${params.photoId}.jpg`, thumbPath: `${prefix}/${params.photoId}_thumb.jpg` }
}
```

クライアントは自分の userId を Server Component から props で受け取ります（本人のIDなので秘密情報ではありません。サーバーは受け取った値を信用せず、getClaims の sub でパスを作り直します）。

### 10.3 同時に処理する数

- **縮小処理は1枚ずつ順番に**行います。20MB の JPEG を展開すると数千万画素になり、iOS Safari はメモリと canvas の上限が厳しいので、同時に処理すると落ちる心配があります。
- **アップロードは同時に2本まで**にします（`run-with-concurrency.ts`、約20行の自作関数。依存は追加しません）。

### 10.4 失敗したときの再試行で、入力を消さない仕組み（US-05）

PhotoUploader は写真ごとに状態を持ちます。

```
selected → processing → ready → uploading → uploaded → attached
                 └→ failed(reason)          └→ failed(reason)
```

DriveForm で保存を押したときの流れ:
1. `driveId` がまだ無ければ `createDrive(input)` を呼んで driveId を受け取り、**state に保存**します。既にあれば、入力が変わっている場合だけ `updateDrive(driveId, input)` を呼びます。
2. 状態が `ready` か `failed` の写真だけをアップロードし、`attachPhoto` まで進めます。
3. 全部 `attached` になったら `router.push('/roads/' + roadId)` で道詳細へ移動します。
4. 1枚でも失敗したら、Alert（「写真のアップロードに失敗しました」）と「再試行」ボタンを出します。**フォームの入力値はすべて state に残っています**。記録の本文は手順1で既にDBに保存されているので、ページを離れても本文は消えません。再試行では、失敗した写真だけをもう一度処理します。
5. アップロードは成功したのに attachPhoto が失敗した場合は、同じ photoId のまま attach だけをやり直します（ファイルは上書き禁止なので、アップロードし直さない）。利用者が写真を外したときは、アップロード済みのファイルを `storage.remove` で消そうとします。消せなかった分は、道/記録を削除するときのフォルダ list で回収されます（6.3）。

---

## 11. テスト戦略

### 11.1 テストの種類と動かし方

| 種類 | 設定ファイル / コマンド | 環境 | CI で動かすか |
|---|---|---|---|
| 単体テスト（zod・純粋関数）とコンポーネントテスト | `vitest.config.ts` / `pnpm test` | jsdom（既存2アプリと同じ） | 動かす |
| DB/RLS テスト | `vitest.rls.config.ts` / `pnpm test:rls` | node + ローカルの Supabase（`pnpm db:start`） | 初めは手動。後で Supabase CLI 付きの CI ジョブを追加（16章） |
| E2E テスト | `playwright.config.ts` / `pnpm test:e2e` | Chromium（PC）+ Pixel 7（スマホ）+ ローカルの Supabase | 同上 |

`vitest.config.ts` は budget-app のものを元にして、**`exclude` を追加**します（既存アプリの include は `tests/**/*.test.*` なので、そのままだと RLS テストまで拾ってしまうため）。

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    alias: { '@/': new URL('./src/', import.meta.url).pathname },
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['tests/rls/**', 'tests/e2e/**', 'node_modules/**'],
  },
})
```

```ts
// vitest.rls.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rls/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    alias: { '@/': new URL('./src/', import.meta.url).pathname },
  },
})
```

package.json に足す scripts:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:rls": "vitest run --config vitest.rls.config.ts",
"test:e2e": "playwright test",
"db:start": "supabase start",
"db:reset": "supabase db reset",
"db:types": "supabase gen types typescript --local > src/types/database.types.ts"
```

### 11.2 画像処理のテストのしかた

- jsdom には `createImageBitmap` も canvas の描画機能もありません。**Vitest Browser Mode は依存（`@vitest/browser` など）が増えるので使いません。**
- jsdom で確かめるもの: `computeTargetSize`、`hasExifSegment`（手で組み立てたバイト列で、Exif あり/なし/JFIF だけ/壊れたデータ）、`originalImageFileSchema`、`canAddPhotos`、`buildPhotoPaths`、`resizeAndStripExif` の分岐（`createImageBitmap` と `HTMLCanvasElement.prototype.toBlob` を vi で差し替え、PNG にされてしまったときに `encode_failed` になるか、Exif が残ったら `exif_remaining` になるか）。
- **本物のブラウザでの確認は Playwright で行います**: GPS 入りの JPEG を実際にアップロード → Storage からファイルを取り出す（テストでは service role で `download`）→ `hasExifSegment` が false であること、長辺が2048以下であることを確かめます（US-05 の受入条件）。
- テスト用の画像は `tests/fixtures/build-gps-jpeg.ts` で作ります。小さな JPEG に、GPS IFD（GPSLatitude などの位置タグ）を含む APP1 Exif セグメントをバイト列で差し込み、ファイルとして保存します（exiftool などの外部ツールも依存も不要）。そのファイルが `hasExifSegment === true` になることもテストに含め、テスト用画像そのものが正しいことも確かめます。

### 11.3 RLS テスト（ユーザー A と B）

`tests/helpers/supabase-test-users.ts`:
- `supabase status -o env` で得た `API_URL` / `ANON_KEY`（または PUBLISHABLE_KEY）/ `SERVICE_ROLE_KEY` を環境変数で受け取ります。**service role キーはテストのコードだけで使います。**
- `admin.generateLink({ type: 'magiclink', email })` → `data.properties.hashed_token` → anon キーのクライアントで `auth.verifyOtp({ type: 'email', token_hash })` を呼び、A と B のセッションを作ります（アプリと同じマジックリンクの仕組みを通るので、パスワードを使うログインを追加しなくて済みます）。

確かめること（すべて「B のセッションで A のデータに対して」）:
- roads / drives / road_info / photos / road_summaries: select すると0件。update と delete は「影響した行が0件」になり、A のデータは変わらない
- insert: B が A の road_id を指定して drives を insert → RLS 違反。A の drive_id を指定して road_info / photos を insert → RLS 違反
- update: B が自分の drive の road_id を A の道に付け替える → 拒否
- Storage: B が `A/...` を list・download・createSignedUrl → 失敗または0件。`A/...` への upload → 失敗。自分のフォルダでも、存在しない drive_id や他人の drive_id のフォルダへの upload → 失敗。`A/...` の remove → A のファイルは残る
- anon（ログインなし）: どのテーブルも select すると権限エラー
- DB 制約（`constraints.db.test.ts`）: 未来の走行日 → `driven_on_in_future`。6枚目の写真 → `photo_limit_exceeded`（2つ並べて同時に insert しても5枚を超えない）。パスの形式が違う → `invalid_storage_path`。評価が0や6 → check 違反。名前が51文字 → check 違反。写真の行を削除 → `storage_deletion_queue` にパスが2件積まれる。道を削除 → drives / road_info / photos が0件になる

### 11.4 E2E（Playwright）

- `global-setup.ts`: ローカルの Supabase に、generateLink で E2E 用ユーザーのログインリンクを作ります → ブラウザで `/auth/confirm?token_hash=...&type=email` を開いて「ログインする」を押す（18.1 S-6） → `storageState`（ログイン状態）を保存します。**メールの受信箱（Mailpit/Inbucket）は読みに行きません**（ポートや HTML の変化に左右されず安定するため）。ただし `auth.spec.ts` の1件だけは、ログインフォームから送信して「メールを送りました」と表示されるところまでを確かめます。
- 地図タイルは `page.route('https://cyberjapandata.gsi.go.jp/**', route => route.abort())` で通信を止めます（外部サーバーに負荷をかけず、結果も安定させるため）。地図の確認は「マーカーの数と名前がリストと同じであること」で行います（地図の画像そのものは比べない）。
- `webServer`: `pnpm build && pnpm start`（本番と同じ動き）。`baseURL: http://127.0.0.1:3000`。

### 11.5 受入条件とテストの対応

| 受入条件 | 単体/コンポーネント | RLS/DB | E2E |
|---|---|---|---|
| US-01 未ログインならログイン画面へ | `safe-next-path.test.ts` | — | `auth.spec`: /roads → /login |
| US-01 他人の URL は 404 | — | 全テーブル・Storage で A/B を確認 | `auth.spec`: B のセッションで A の /roads/{id} → 404 |
| US-02 必須項目・文字数・ピン | `road.test.ts`、`RoadForm.test.tsx`（エラー表示）、`PinPicker.test.tsx`（数値入力 ↔ 状態） | 名前の長さ・座標の check | `roads.spec`: 登録 → 詳細へ移動 → 一覧に出る |
| US-03 未来の日付・評価1〜5 | `common.test.ts`（JSTの日付の境目を `vi.setSystemTime` で確認）、`drive.test.ts`、`RatingInput.test.tsx`（キーボード操作） | `driven_on_in_future`、評価の check | `drives.spec`: 未来日 → 「未来の日付は選べません」 |
| US-04 確認日が最新の情報＋注記 | `road-info.test.ts`、`RoadInfoSummary.test.tsx` | 確認日の初期値トリガー | `drives.spec`: 確認日の違う記録を2件作り、新しい方が「確認日 YYYY-MM-DD・ユーザー記録」で出る |
| US-05 形式・枚数・EXIF・再試行 | `photo.test.ts`、`has-exif-segment.test.ts`、`process-image.test.ts`、`PhotoUploader.test.tsx`（6枚目で表示が出る、失敗→再試行ボタン、本文が残る） | 6枚目のトリガー、Storage の MIME/サイズ | `photos.spec`: GPS 入り JPEG → 保存後のファイルに EXIF が無い。`route.abort` でアップロードを失敗させる → 再試行ボタンが出て本文が残る |
| US-06 0件の表示・ピンとリスト | `RoadList.test.tsx`、`EmptyState.test.tsx` | `road_summaries` の RLS | `roads.spec`: 0件の表示 → 登録 → マーカーとリストの件数が同じ |
| US-07 新しい順 | `DriveList.test.tsx` | — | `drives.spec`: 3件を日付順にばらばらに作り、表示順を確認 |
| US-08 初回の注意・フォームでの常時表示・GPS 機能が無い | `SafetyNoticeDialog.test.tsx`、`SafetyNoticeBanner.test.tsx` | user_settings の RLS | `safety.spec`: 初回は表示 →「確認しました」→ 再読み込みしても出ない。フォームに注意文がある。`navigator.geolocation` が一度も呼ばれない（`addInitScript` で監視）。レスポンスヘッダーに `Permissions-Policy: geolocation=()` がある |
| US-09 編集・削除の件数・キャンセル | `DeleteConfirmButton.test.tsx`、`ConfirmDialog.test.tsx` | cascade とキュー | `delete-cascade.spec`: 記録2件・写真3枚 →「記録2件と写真3枚」→ キャンセルすると何も消えない → 確定すると DB と Storage が空になる（service role で list して確認） |

---

## 12. セキュリティ

1. **すべての Server Action でログインを確認します**（7.3）。user_id はクライアントから受け取らず、DB の初期値 `auth.uid()` と RLS に任せます。Storage のパスもサーバーで getClaims の sub から作り直します。
2. **service role キーはアプリの実行時に使いません。** `src/` には admin クライアントを置きません（carskiida の `admin.ts` に当たるものは作らない）。テストだけで使い、Vercel にも登録しません。
3. **署名付きURLの有効期限は1時間**です。サーバーで作り、ログに出しません。
4. **オープンリダイレクト（任意の外部サイトへ飛ばされる穴）を防ぎます**（`safe-next-path.ts`）:

```ts
function isProtocolRelativeLike(path: string): boolean {
  return !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')
}

export function safeNextPath(raw: string | null | undefined, fallback = '/roads'): string {
  if (!raw || isProtocolRelativeLike(raw)) return fallback
  try {
    const base = 'http://internal.invalid'
    const url = new URL(raw, base)
    if (url.origin !== base) return fallback
    // "/.//evil.example.com" normalizes to "//evil.example.com" — check the normalized path too
    if (isProtocolRelativeLike(url.pathname)) return fallback
    return `${url.pathname}${url.search}`
  } catch {
    return fallback
  }
}
```

（Sprint 0 のセキュリティレビューで修正: 入力だけでなく、URL として整えた後の pathname も確かめる。実装は `src/lib/utils/safe-next-path.ts`）

5. **認証の流れ（`token_hash` + `verifyOtp` を採用）**:
   - **`/auth/confirm` で token_hash を verifyOtp する方式にした理由**: PKCE（`?code=` を `exchangeCodeForSession` で交換する方式。budget-app の `/auth/callback`）は、リンクを要求したのと**同じブラウザ**に code_verifier というクッキーが残っていないと失敗します。マジックリンクは「パソコンで要求して、スマホのメールで開く」ことがよくあるので、ブラウザに依存しない token_hash 方式にします。Supabase の Next.js 公式チュートリアルも `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` の形を示しています（context7 で確認）。
   - メールテンプレート（**Magic Link** と **Confirm signup** の両方。`signInWithOtp` は初めてのアドレスには Confirm signup のメールを送るため）:
     `{{ .RedirectTo }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
   - `signInWithOtp({ email, options: { emailRedirectTo: siteOrigin, shouldCreateUser: false } })`。`siteOrigin` は `NEXT_PUBLIC_SITE_URL`。無ければ Vercel の Preview で `https://${VERCEL_URL}` を使います。Supabase の Redirect URLs の許可リストに無い URL を指定すると、Site URL に置き換えられます。（15.1 により false。未登録アドレスのエラーも成功と同じ表示にする）
   - ログイン後に戻る先（`next`）は、ログイン用 Server Action が `safeNextPath` で確かめてから、10分有効の httpOnly クッキー `rr_next` に保存します。`/auth/confirm` でもう一度 `safeNextPath` を通してから移動します（クエリに入れないので、許可リストとクエリ文字列の照合の問題も起きません）。
   - `/auth/confirm` は `type === 'email'` だけを受け付けます。

```ts
// (superseded by 18.1 S-6: page.tsx + confirmMagicLink action) src/app/auth/confirm/route.ts
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath } from '@/lib/utils/safe-next-path'

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type')
  const cookieStore = await cookies()
  const nextPath = safeNextPath(cookieStore.get('rr_next')?.value)

  if (tokenHash && type === 'email') {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type: 'email', token_hash: tokenHash })
    if (!error) {
      cookieStore.delete('rr_next')
      redirect(nextPath)
    }
  }
  redirect('/login?error=link_invalid')
}
```

6. **proxy（Next 16）**: `src/proxy.ts` に `export async function proxy(request)` を置きます。`middleware` という名前は非推奨になり、`proxy` に変わりました。proxy は Node.js ランタイムで動き、Edge にはできません（Next.js の v16 アップグレードガイドで確認）。budget-app はまだ `middleware.ts` を使っていますが、road-review は新しい決まりに合わせます。`src/lib/supabase/proxy.ts` の `updateSession` は budget-app の `src/lib/supabase/middleware.ts` を元にして、**`getUser()` を `getClaims()` に変えます**（Supabase 公式の例と同じ）。ログイン不要なパスは `/login` と `/auth/` だけです。ログインしていなければ `/login?next=<元のパス>` へ、ログイン済みで `/login` を開いたら `/roads` へ移動させます。移動させるときは、Supabase docs の指示どおり、作り直したレスポンスにクッキーとキャッシュ関連のヘッダー（cache-control / expires / pragma）をコピーします。matcher は budget-app と同じものを使います。
7. **セキュリティヘッダーと CSP（`next.config.ts`）**。nonce（リクエストごとの使い捨ての値）は使いません。nonce を使うと全ページが動的な描画になるうえ、このアプリでは得られる効果が小さいためです。Next.js の「Without Nonces」の例（v16.2.9 docs）を元にします。

```ts
import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'
const supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321').origin
const gsiOrigin = 'https://cyberjapandata.gsi.go.jp'

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${gsiOrigin} ${supabaseOrigin}`,
  "font-src 'self'",
  `connect-src 'self' ${supabaseOrigin}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'geolocation=(), camera=(), microphone=(), payment=()' },
        ],
      },
    ]
  },
}

export default nextConfig
```

   - Realtime（WebSocket）は使わないので、`connect-src` に `wss:` は入れません。
   - 開発中のローカル Supabase は `http://127.0.0.1:54321` なので、`upgrade-insecure-requests`（http を https に置き換える指定）は本番だけで付けます。
   - Preview 環境で Vercel Toolbar を使う場合は、それに必要な許可が CSP に要ります。**どのドメインが必要かは今回確かめていない**ので、devops-engineer が Vercel の公式ドキュメントで確認してから足します（16章）。
   - `camera=()` を指定しても、`<input type="file">` でカメラアプリを開いて撮影すること自体には影響しないと考えています（ブラウザの API でカメラを直接使うことだけを止める指定のため）。E2E と実機で確かめ、影響があれば `camera=()` を外します（16章）。
8. **EXIF の除去**: 10章のとおり、描き直し + `hasExifSegment` での確認 + E2E での確認の三重です。
9. **アクセス回数の制限（Rate limit）**（Supabase docs で確認）: マジックリンクは同じアドレスに60秒あけないと再送できません（初期値）。OTP は合計で1時間360回まで（初期値）。**Supabase 組み込みのメール送信機能は1時間あたりの送信数がとても少なく、届くことも保証されません**（「本番では独自の SMTP を設定すること」と書かれている）。MVP（自分だけで使う）なら組み込みで足りますが、他の人に使ってもらう前に独自の SMTP を設定します（16章）。ログイン用の Server Action は、429 や `over_email_send_rate_limit` を `rate_limited` に変え、「少し時間をおいてからもう一度お試しください」と表示します。メールアドレスが登録済みかどうかで表示を変えません（15.1 により `shouldCreateUser: false`。未登録アドレスのエラー（`otp_disabled` など）も成功と同じ「送信しました」を表示し、登録の有無を探られないようにする）。
10. **依存関係**: 1章の pnpm の設定（cooldown・ビルドスクリプトの許可制・overrides）と、CI の `supply-chain-security.yml`（`apps/*/pnpm-lock.yaml` をすべて自動で検査するので、アプリを追加しても設定変更は不要）。

---

## 13. デプロイ（Vercel）と Supabase の設定

### 13.1 Vercel

- Root Directory: `apps/road-review`。Framework: Next.js。Install Command: `pnpm install --frozen-lockfile`（pnpm のバージョンは `packageManager` に書いたものが使われる前提。実際にビルドログで確認する）。Node は 22 系。
- git 連携の自動デプロイは budget-app と同じにします。モノレポなので、変更が無いアプリまで再ビルドされるのを避けたい場合は「Ignored Build Step」に `git diff --quiet HEAD^ HEAD -- .` を設定します（devops-engineer の判断）。
- **環境変数は Production / Preview / Development の3つすべてに設定します**（過去の教訓: budget-app は Development に Supabase の変数が無く、`vercel env pull` で困った）。

| 変数 | Production | Preview | Development |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 本番プロジェクトの値 | 本番と同じ（16章） | 本番と同じ、または空（ローカルは .env.local でローカル Supabase を指す） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 同上 | 同上 | 同上 |
| `NEXT_PUBLIC_SITE_URL` | `https://<本番ドメイン>` | **設定しない**（`VERCEL_URL` で代わりにする） | `http://localhost:3000` |
| `SUPABASE_SERVICE_ROLE_KEY` | **設定しない** | **設定しない** | **設定しない** |

### 13.2 Supabase Auth（本番プロジェクトのダッシュボード）

- Site URL: `https://<本番ドメイン>`
- Redirect URLs:
  - `https://<本番ドメイン>/**`
  - `https://road-review-*-<team-or-account-slug>.vercel.app/**`（Preview。Supabase docs が示す `https://*-<slug>.vercel.app/**` の形を、このプロジェクト名に絞ったもの）
  - `http://localhost:3000/**`
  - `http://127.0.0.1:3000/**`
- Email Templates: **Magic Link** と **Confirm signup** のリンクを `{{ .RedirectTo }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` に変えます。
- Providers: Email だけを有効にします（パスワードでのログインは画面に出しません）。
- マイグレーションの適用: `supabase link` → `supabase db push`（devops-engineer。Supabase MCP も使える）。

### 13.3 ローカル（`supabase/config.toml`）

```toml
[auth]
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["http://127.0.0.1:3000/**", "http://localhost:3000/**"]

[auth.email]
enable_signup = true

[auth.email.template.magic_link]
subject = "公道レビュー ログインリンク"
content_path = "./supabase/templates/magic_link.html"

[auth.email.template.confirmation]
subject = "公道レビュー ログインリンク"
content_path = "./supabase/templates/confirmation.html"
```

（テンプレートの設定方法は context7 の Supabase local-development docs で確認しました。それ以外の項目は `supabase init` で作られる初期値のままにします。手動で動作を確かめるときは、ローカルのメール確認画面 Mailpit で受信メールを見ます。）

---

## 14. 環境変数と `.env.example`

**変数名は既存2アプリに合わせて `NEXT_PUBLIC_SUPABASE_ANON_KEY` にします。** Supabase の最新の docs は `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`（`sb_publishable_...` 形式の新しいキー）を勧めていますが、`createServerClient` / `createBrowserClient` に渡すのはどちらも「公開してよいキーの文字列」なので、**変数名は既存アプリと揃え、中身には新しい publishable key を入れても構いません**。名前を揃えておくと、keep-alive の workflow や Vercel の設定を同じ手順で扱えます。

```dotenv
# apps/road-review/.env.example
# Supabase（公開キー: ブラウザ/サーバー共用。anon key または publishable key のどちらを入れてもよい）
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key

# マジックリンクの戻り先（本番/開発で設定。Preview では空にして VERCEL_URL を使う）
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# ---- テスト専用（RLS / E2E のみ。Vercel やアプリの実行環境には絶対に設定しない）----
# `supabase status -o env` の値を使う
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
```

---

## 15. TDD スプリントの実装順

どのスプリントも **Red（test-writer が先にテストを書く）→ Green（frontend/backend-developer がテストを通す）→ Refactor（code-reviewer のレビュー）** の順で進めます。

### Sprint 0: 土台づくり（担当: devops-engineer、確認: supply-chain-auditor）
- 作業: 1章・2章のとおりに設定ファイルを既存アプリからコピーする（package.json、pnpm-workspace.yaml、.node-version、.npmrc、tsconfig、eslint（Atomic Design の制限を追加）、postcss、vitest の2つの設定、playwright、tests/setup.ts、.gitignore に `!.env.example`）。`pnpm add leaflet` と `pnpm add -D @types/leaflet`。`supabase init`。`src/lib/supabase/{client,server,proxy}.ts`、`src/proxy.ts`、`lib/utils/cn.ts`、`next.config.ts`（ヘッダー）を作る。
- Red: `safe-next-path.test.ts`、`date.test.ts`（JST の日付の境目）、eslint の import 制限が働くことの確認（違反する仮のファイルで lint が失敗すること）
- 完了条件: `pnpm install --frozen-lockfile`、`pnpm lint`、`pnpm test`、`pnpm build` がすべて通る。**新しい依存について supply-chain-auditor の監査を通過**し、lockfile に予定外の依存が増えていない。CI の supply-chain-security で road-review が検査されている。
- 対応する US: 土台（全体）

### Sprint 1: ログイン + 安全注意（US-01・US-08）
- Red: `auth.test.ts`（zod）、`LoginForm.test.tsx`（送信中の表示・rate_limited の表示）、`SafetyNoticeDialog.test.tsx`、`SafetyNoticeBanner.test.tsx`、RLS（user_settings）、E2E `auth.spec` / `safety.spec`（Permissions-Policy・geolocation が呼ばれないこと）、`generateLink` の hashed_token を `verifyOtp({ type: 'email' })` で受け付けられることの確認
- Green: マイグレーション `00001_base_and_user_settings.sql`・`00002_keep_alive.sql`、`features/auth/actions.ts`、`features/settings`、`/auth/confirm`、`(auth)/login`、`(app)/layout.tsx`、AppHeader、AuthTemplate、AppShellTemplate、atoms の Button / Input / Label / FieldError / Alert / Spinner、メールテンプレート
- 完了条件: ログインしていなければ /login へ移動する。マジックリンク（generateLink）でログインできる。初回だけ注意が出て、以後は出ない。ログアウトできる。

### Sprint 2: 道の登録・編集 + 地図（US-02・US-06・US-09の道の編集）
- Red: `road.test.ts`（開始ピンが null のときのエラーを含む）、`RoadForm.test.tsx`（必須エラー・51文字）、`PinPicker.test.tsx`（数値入力で開始/終了が決まる・終了を消せる。Leaflet の部分は vi.mock で差し替え）、`LatLngInputs.test.tsx`、`RoadList.test.tsx` / `EmptyState.test.tsx` / `RoadListItem.test.tsx`、RLS（roads）、E2E `roads.spec`
- Green: `00003_roads.sql`、`features/roads`（createRoad / updateRoad / listRoadSummaries（この時点では roads テーブルを直接読む）/ getRoad）、ページ `/roads`・`/roads/new`・`/roads/[roadId]`（最小限）・`/roads/[roadId]/edit`、RoadsMap、PinPicker、RoadsIndexTemplate、FormPageTemplate、molecules（FormField / ChoiceGroup / PrefectureSelect / LatLngInputs / EmptyState / RoadListItem）、`lib/map/*`、`lib/constants/*`
- 完了条件: 登録すると詳細へ移動し、一覧に出る。地図のマーカーとリストの件数・名前が同じ。他人の道は 404。

### Sprint 3: 走行記録 + 道の情報（US-03・US-04・US-07・US-09の記録の編集）
- Red: `common.test.ts`（未来日付・評価）、`drive.test.ts`、`road-info.test.ts`、`RatingInput.test.tsx`（矢印キー・必須）、`RoadInfoFieldset.test.tsx`、`DriveForm.test.tsx`（エラーが出ても入力が残る）、`RoadInfoSummary.test.tsx`（「確認日 YYYY-MM-DD・ユーザー記録」と注記）、`DriveList.test.tsx`（新しい順）、`RoadListItem` の最終走行日・総合評価、DB（driven_on_in_future・road_id は変えられない・確認日の初期値）、RLS（drives・road_info の親チェック・road_summaries）、E2E `drives.spec`
- Green: `00004_drives_road_info.sql`（road_summaries ビューを含む）、`features/drives`、listRoadSummaries をビューに切り替え、ページ `drives/new`・`drives/[driveId]/edit`、道詳細を完成させる（RoadDetailTemplate、DriveCard、RatingStars、Badge）
- 完了条件: 受入条件の US-03・US-04・US-07 がすべて緑。一覧に最終走行日と総合評価が出る。

### Sprint 4: 写真（US-05）
- Red: `photo.test.ts`、`compute-target-size.test.ts`、`has-exif-segment.test.ts`（テスト用画像の正しさも含む）、`process-image.test.ts`（差し替えたブラウザ API で）、`run-with-concurrency.test.ts`、`PhotoUploader.test.tsx`（6枚目で表示が出る・失敗 → 再試行・本文が残る）、`PhotoPickerItem.test.tsx`、`PhotoThumbnail.test.tsx`、DB（6枚目・同時に insert・パスの形式・写真削除でキューに積まれる）、RLS（photos・storage_deletion_queue・storage.objects）、E2E `photos.spec`（EXIF が残っていないこと・失敗して再試行）
- Green: `00005_photos_storage.sql`、`lib/image/*`、`features/photos`（attachPhoto / deletePhoto / signPhotoUrls）、PhotoUploader を DriveForm に組み込む
- 完了条件: GPS 入り JPEG を保存しても EXIF が残らない。6枚目は追加できない。失敗しても本文が消えない。道詳細でサムネイルが見える。

### Sprint 5: 削除の連鎖 + E2E の強化 + セキュリティ監査（US-09・全体）
- Red: `ConfirmDialog.test.tsx`（Esc とキャンセルでサーバーを呼ばない）、`DeleteConfirmButton.test.tsx`（件数の文言）、`cleanup.test.ts`（storage.remove の失敗 → キューに残る・attempts が増える。Supabase クライアントは差し替え）、DB（cascade）、E2E `delete-cascade.spec`（DB と Storage が空になる・キャンセルすると残る）
- Green: `features/storage/cleanup.ts`、deleteRoad / deleteDrive、DeleteConfirmButton を道詳細と記録の編集画面に置く（新しいマイグレーションは無し）
- そのほか: security-auditor（RLS・CSP・オープンリダイレクト・service role キーが紛れ込んでいないか）と supply-chain-auditor（`/supply-chain road-review`）の監査。qa-engineer が 360px 幅と a11y（キーボードだけで登録から削除まで操作できるか）を確かめる。Lighthouse で LCP を測る。devops-engineer が Vercel と Supabase の本番設定（13章）を行い、keep-alive の workflow に追加する。
- 完了条件: US-01〜US-09 の受入条件が、11.5 の対応表どおりにすべて緑。監査で High 以上の指摘が0件。

---

## 15.1 CEO決定（承認ゲート2・2026-10-06）— 本章が 13章・16章より優先

1. **Supabase は新規プロジェクトを作る**（無料枠に空きあり。16章 #1 は解決）。
2. **新規登録は Hiro 本人だけ**。`supabase/config.toml` は `[auth] enable_signup = false`（`[auth.email]` は true のまま。21章の障害記録参照）、本番ダッシュボードも「Allow new users to sign up」を OFF。`signInWithOtp` は `options.shouldCreateUser: false` を指定する。Hiro のユーザーは本番ダッシュボードの「Invite user / Add user」で作る（devops-engineer、Sprint 5）。未登録のメールアドレスでも画面には「メールを送りました」と同じ表示を出し、登録有無を漏らさない。
3. **6桁コードでのログインを足す**（16章 #3 は解決）。メールテンプレートにリンクと `{{ .Token }}` の両方を載せる。ログイン画面は「メールを送る → 6桁コード入力欄」を同じ画面で出し、`verifyOtp({ email, token, type: 'email' })` で検証する。リンク経由（`/auth/confirm` の token_hash）はそのまま残す。Sprint 1 の Red テストに `OtpForm`（6桁以外は送信不可）と `verifyOtpCode` アクションを追加する。

## 16. 未決事項 / リスク

| # | 内容 | 影響 | 推奨 / 担当 |
|---|---|---|---|
| 1 | **Supabase の無料プランで持てるプロジェクトの数**。無料プランには「同時に動かせる無料プロジェクトは2つまで」という制限があると理解していますが、**今回は確かめていません**。budget-app と carskiida が既に無料プロジェクトなら、road-review は3つ目になります | 本番の Supabase を作れない可能性 | CFO / devops-engineer が現在のプランと制限を確認する。代わりの案: 既存プロジェクトの別スキーマに同居させる（RLS の設計は変わらない）か、有料プランにする。**CEO判断が必要** |
| 2 | Preview 環境が本番の DB を使う | プレビューで作ったデータが本番に混ざる | MVP は Hiro 1人なので受け入れる。他の人に使ってもらう前に Preview 専用のプロジェクトか Supabase Branching を検討する |
| 3 | メールのリンクを、迷惑メール対策の仕組みなどが先に開いてしまい、トークンが使い切られる | ログインに失敗する | 起きたら `/auth/confirm` を「ボタンを押してから verifyOtp する」画面に変える。メール本文に6桁のコード（`{{ .Token }}`）も書き、コードを入力してログインできる画面を足す案もある（CEO の「マジックリンクだけ」という決定の範囲内か要確認） |
| 4 | 組み込みのメール送信は1時間あたりの上限がとても少ない | 自分以外が使い始めるとログインできない | 公開前に独自の SMTP（例: Resend）を設定する。CFO がコストを確認 |
| 5 | iOS Safari で、大きな画像（例: 48MP）を `createImageBitmap` するときのメモリ | 縮小に失敗する | 1枚ずつ処理し、失敗したら「decode_failed: 画像が大きすぎる可能性があります」と表示する。実機で確かめる（qa-engineer） |
| 6 | HEIC に対応しない | iPhone のカメラ設定によっては写真を選べない | 画面に「iPhone は 設定 > カメラ > フォーマット で互換性優先にするか、写真アプリから共有すると JPEG になります」と案内する（案内文が正しいかは実機で確かめる）。将来の課題 |
| 7 | 道の情報のメモの上限（200/200/500）と、一覧の「総合評価」を最新の値にするか平均にするか | 仕様 | CPO が確認する |
| 8 | Vercel Toolbar を Preview で使うときの CSP | Preview で Toolbar が動かない | devops-engineer が Vercel の公式ドキュメントで許可するドメインを確かめる |
| 9 | RLS/E2E の CI 化 | 回帰に気づくのが遅れる | Sprint 5 の後、GitHub Actions に `supabase/setup-cli` + `supabase start` のジョブを追加する（action を SHA で固定するのは supply-chain-auditor が確認） |
| 10 | 既存2アプリには `.npmrc`（engine-strict）が無い | ルールと実態がずれている | road-review には作る。既存アプリへの横展開は CTO が別途判断する |
| 11 | `storage.list()` は下の階層までまとめて取らない（フォルダごとに呼ぶ必要がある）前提で、6.3 を設計している | 孤立ファイルを回収しきれない | Sprint 5 の RLS/E2E で実際の動きを確かめる。合わなければフォルダごとに順に呼ぶ処理に直す |
| 12 | 地理院タイルの使い方 | 大量のアクセスで迷惑をかける | E2E ではタイルへの通信を止める。出典表示を消さない。利用規約が変わっていないか、リリース前にもう一度確認する |
| 13 | 公開共有を始めるとき | — | `visibility` の制約を広げ、公開用の select ポリシーを足し、コンテンツポリシーとモデレーションの仕組みを用意する（PRD 10章）。写真の公開は、署名付きURLの代わりに別の公開バケットへコピーする方式を検討する |
| 14 | 実装前に動作を確かめていない API の細部 | 実装時の手戻り | `generateLink` の hashed_token と `verifyOtp({ type: 'email' })` の組み合わせ（Sprint 1）、`z.file().mime()` に配列を渡せるか・`transform` 内の `addIssue` + `z.NEVER`（Sprint 2/4）、`createSignedUrls` の戻り値の形（Sprint 4）、`Permissions-Policy: camera=()` がスマホのファイル選択からの撮影に影響しないか（Sprint 4 実機）。いずれも Red テストで先に確かめる |

---

## 17. CTOレビューの記録（v1 → v1.1）

code-architect の v1 を CTO がレビューし、次の点を直して承認しました（1イテレーション）。

| # | 指摘 | 対応 |
|---|---|---|
| 1 | マイグレーションが「スキーマ / RLS / Storage / ビュー」の種類ごとに分かれていて、TDD のスプリント単位で足せない（Sprint 1 で 00001 の一部だけ適用、のような無理があった）。RLS を別ファイルにすると、RLS が無いテーブルが一時的に存在する | 1スプリント1ファイルに分け、テーブルと RLS を同じファイルに入れる（3.5）。削除キューは photos の削除トリガーが参照するので Sprint 4 に移動。road_summaries ビューは drives を参照するので Sprint 3 に移動 |
| 2 | `today_in_tokyo()` の実行権限を anon から取り上げるだけでは、Postgres の初期設定（PUBLIC に実行権限がある）が残る | `revoke ... from public, anon` と `grant ... to authenticated` に変更（4章） |
| 3 | `road_info_confirmed_idx`（confirmed_on だけのインデックス）は、「道ごとの最新の情報」の検索に使われない | 削除し、`getLatestRoadInfo` の問い合わせ方を明記（3.2 補足） |
| 4 | 道の開始ピンの zod スキーマが `refine` だったため、確認後の型が null を含んだままだった | `transform` + `addIssue` + `z.NEVER` で、確認後は null にならない型に変更（8章） |
| 5 | 走行記録の zod スキーマに、何もしない `superRefine` が残っていた | 削除し、ルールはコメントで残す（8章） |

承認した主な設計判断: react-leaflet / react-hook-form / date-fns を入れず新規依存は leaflet だけ、token_hash 方式のマジックリンク、ブラウザから Storage へ直接アップロード（RLS で drive の持ち主まで確認）、出力 JPEG 固定 + サムネイル生成、DB → Storage の順で消して失敗分はキューで再削除、`visibility` は MVP では `'private'` だけを許す制約。

---

## 付録: 設計時に確認した資料

- 既存アプリ: `apps/carskiida`（package.json、pnpm-workspace.yaml、next.config.ts、vitest.config.ts、.env.example、.gitignore、eslint.config.mjs、src/lib/supabase）、`apps/budget-app`（package.json、next.config.ts、middleware.ts、vitest.config.ts、tsconfig.json、.node-version、AGENTS.md、src/lib/supabase、auth/callback、tests/setup.ts、supabase/migrations）、`.claude/rules/*.md`、`.github/workflows/supabase-keep-alive.yml` と `supply-chain-security.yml`
- 既存アプリで分かったこと: overrides の違いは postcss の書き方だけ。どちらのアプリにも `playwright.config.ts`・`supabase/config.toml`・`.npmrc`・`proxy.ts` は無い。`.gitignore` の `.env*` は `.env.example` まで無視する
- context7 / 公式資料で確認: Next.js v16（middleware → proxy への名前変更と Node.js ランタイム限定、`ssr: false` は Client Component 内だけ、CSP の nonce なしの例、useActionState、redirect は try の外）、Supabase（getClaims、token_hash + verifyOtp、メールテンプレート、Rate limit、Vercel Preview のリダイレクトURL、Storage のバケット・ポリシー・remove・署名付きURL、storage テーブルへの SQL DELETE が拒否されるようになった告知、config.toml）、zod v4.3.6、React（form action 成功時の入力リセット）、react-leaflet 5.0.0 / leaflet 1.9.4 の npm 情報、MDN（createImageBitmap の imageOrientation、toBlob の PNG フォールバック）、国土地理院タイル一覧ページ


---

## 18. Sprint 1 レビュー・監査の対応方針（CTO決定・2026-10-06）

code-reviewer（重大0・重要2・提案3）と security-auditor（Critical/High 0・中5・低7）の結果を受けた方針。

### 18.1 Sprint 1 Refactor で直す（TDD: test-writer → backend/frontend）
| # | 内容 | 担当 |
|---|---|---|
| R-1 | `(app)/error.tsx` と `global-error.tsx`（日本語文言＋「もう一度読み込む」） | frontend |
| R-2 | OtpForm: 入力を `normalize('NFKC')` → 数字以外を除去 → 6桁に切る。全角・貼り付けのテスト | frontend |
| R-3 | フォーカス: 「メールアドレスを変更」後はメール欄へ、失敗時は入力欄/ボタンへ戻す | frontend |
| R-4 | LoginForm の型を `RequestMagicLinkState` に統一 | frontend |
| S-1（中-1） | `config.toml` の `[auth] enable_signup = false` | backend |
| S-3（中-3） | `over_email_send_rate_limit` も成功と同じ表示（「届かない場合は60秒後に再送」）。IP単位の `over_request_rate_limit` だけ `rate_limited` | backend |
| S-4（中-4a） | `otp_expiry = 900`（15分）、メール文面も15分に | backend |
| S-5（中-5） | proxy で nonce 付き CSP（`script-src 'self' 'nonce-…' 'strict-dynamic'`）。テーマスクリプトに nonce。`dangerouslySetInnerHTML` を layout 以外で禁止する lint | backend（proxy/next.config）＋ frontend（layout） |
| S-6（低-1） | `/auth/confirm` は GET で確認画面だけ表示し、「ログインする」ボタンの Server Action で `verifyOtp`（ログインCSRFとリンク検査によるトークン消費を防ぐ）。route.ts は page.tsx に置き換え | backend（action）＋ frontend（page） |
| S-7（低-2） | 公開パス判定を `=== '/login' \|\| startsWith('/login/')` と `/auth/` に厳密化 | backend |
| S-8（低-4・低-5） | user_settings の grant から delete を外し、update は `safety_notice_acknowledged_at` 列だけに。keep_alive は `revoke ... from public` → anon/authenticated に grant（マイグレーション未適用なので 00001/00002 を直接修正） | backend |

### 18.2 Sprint 5（本番設定）で devops-engineer が確認する
- 中-1(b): 本番ダッシュボードで全体・メールともサインアップ OFF。Hiro は Invite/Add user で作成。
- 中-2: Redirect URLs は本番ドメインと `https://road-review-*-<team-slug>.vercel.app/**` だけ。`*.vercel.app` 全体は禁止。
- 中-4(e): 公開前にカスタム SMTP。本番の `otp_expiry` も 900。
- 低-5: keep-alive workflow に road-review を追加。

### 18.3 受け入れる残りのリスク（記録）
- 中-3(3): GoTrue を直接呼べば登録の有無は分かる（サーバー側の仕様）。招待制の個人アプリなので受け入れる。
- 中-4(c)(d): アプリ側の IP/メール単位の回数制限は公開共有の前に再検討。
- 低-3: matcher は静的拡張子を除外。API ルートを作るときは必ず `getUserId()` で確認する。
- 低-6: getClaims は JWT 期限まで取り消しを反映しない。BAN 機能が必要になったら重要操作だけ `getUser()`。
- 低-7: `braces`（開発用、修正版なし）は監視を続ける。

## 19. Sprint 2 の決定（CTO・2026-10-06）
1. エラー文言は PRD/UX（M-10〜M-12）を正とする。8章の zod メッセージは次に読み替える: 「道の名前を入力してください」「50文字以内で入力してください」「都道府県を選んでください」「地図を動かして開始地点のピンを置いてください」。
2. 林道の保存値は `forest`（PRD 7.2 の `forest_road` ではない）。
3. 地図タイルはデザイン仕様 6-1 の淡色地図（pale）を使う。export 名は `GSI_STD_TILE_URL` のまま（中身は pale の URL）。出典表示は必須。
4. PinPicker は 9.4 の方式（クリックで置く・数値入力・「地図の中心に置く」）。UX の全画面十字線方式は MVP 後に再検討。
5. E2E の 404 は HTTP ステータスではなくページ内容で判定（`loading.tsx` によるストリーミング後の `notFound()` は 200 + noindex）。
6. E2E では地理院タイルへのリクエストを 1×1 PNG で応答する。
7. RLS テストで DB 制約（名前・都道府県・種別・日本の範囲・終了ピンの両方/なし・visibility='private'）も確認する。マイグレーション `00003_roads.sql` は 3.2 / 4 章どおり。

### 19.1 Sprint 2 レビュー・監査の対応（CTO決定）
| # | 内容 | 担当 |
|---|---|---|
| P-1（review #1） | PinPicker: 入力で座標が変わったら、ピンが表示範囲外なら panTo する（作成時だけでなく）。`JAPAN_BOUNDS` 外の座標はピンを作らず・動かさず・パンしない | frontend |
| P-2 | PinPicker のマーカーは `{ keyboard: false, interactive: false }`（押しても何もしないボタンを作らない。地図クリックを妨げない） | frontend |
| P-3 | PinPicker に中心の十字マーク（aria-hidden, pointer-events-none） | frontend |
| P-4 | RoadsMap のポップアップのリンクは `router.push` でクライアント遷移 | frontend |
| D-1（L-1） | roads の INSERT 権限から `visibility` を外す（既定値 'private'） | backend |
| D-2（L-2） | name の CHECK を `name ~ '^\S(.*\S)?$'` かつ `name !~ '[[:cntrl:]]'` に。zod も制御文字・双方向制御文字（U+202A–202E, U+2066–2069）を拒否 | backend |
| D-3（L-3） | 1ユーザーあたり道 500 件までの BEFORE INSERT トリガー（超過は専用エラー → M-xx「登録できる道は500件までです」）。`listRoadSummaries` に `.limit(500)` | backend |
| C-1（Info） | `source-map-js` を `pnpm.overrides` で `"source-map-js@>=1.0.0 <1.2.2": "^1.2.2"` に。**1.2.2 は 2026-09-30 公開のため cooldown 明け（2026-10-07 23:08 JST）以降に適用**（免除リストは使わない） | devops（supply-chain 確認） |
| 後回し | L-4 `style-src 'unsafe-inline'` の削除は Supabase 起動後の E2E で地図表示を確認してから。L-5 タイル通信はプライバシーポリシーに記載（CMO） | — |

## 20. Sprint 3 の決定（CTO・2026-10-06）
1. 道の情報は「走行記録1件につき road_info 1行」（3章）。項目は PRD の8項目。各項目は null 可の status 列 + `<item>_memo`（null = 記録しない）。最新値は項目ごとに選ぶ（確認日が新しい順 → 作成日時が新しい順）。
2. 道の情報は DriveForm 内の RoadInfoFieldset で入力する。UX S-08 の `/roads/[id]/info/new` と履歴シートは MVP 後。
3. 列名は 3章のまま（`few/normal/many`、`rating_road_surface`、`rating_ease_of_driving`）。
4. 一覧カードは PRD の「総合 平均 X.X」。`lastRatingOverall` も持つ。
5. 道の情報の行の文言は PRD 形式（「あり（土日のみ）・確認日 2026-10-01」）。「ユーザー記録」はセクションのラベル。
6. RatingInput は radio のため aria-valuetext ではなく、live region の「選択中: N（語）」。
7. エラー時のフォーカスはエラー要約（RoadForm と同じ）。
8. メモは「2000文字以内で入力してください」。走行日の下限は 2000-01-01。
9. **既知のリスク（受け入れ）**: createDrive は drives → road_info の2回の insert。road_info 失敗時は drive を削除して戻す（補償処理）。補償の削除も失敗すると road_info なしの drive が残るが、データとしては有効なので受け入れる。公開共有の前に、1トランザクションの RPC 化を再検討する。
10. 後回し: RoadsMap ポップアップの平均表示、交通量の「選択を解除」、`/collection` の地方別一覧。

## 21. 本番環境とログイン方式の変更（CEO決定・2026-10-07）
- 本番: Vercel `road-review`（https://road-review.vercel.app）＋ Supabase `road-review`（ref `ejnuzscvuymqlxrfwvnm`、東京）。Sprint 5 の作業を前倒しした。マイグレーション 00001〜00004 は本番に適用済みで、RLS テストは本番 DB で 65/66 合格（残り1件は下のログイン方式の変更で対象外になる 6桁コードのテスト）。
- **無料プランで標準のメール送信を使う場合、メールテンプレートを変更できない**（Supabase API 400）。CEO は独自 SMTP（Resend / Gmail）を使わないと決定。
- そのため **ログインは「Supabase 標準の Magic Link メール + PKCE」に変更**する:
  - `signInWithOtp` の `emailRedirectTo` を `${siteOrigin}/auth/callback` にする（`shouldCreateUser: false` はそのまま）。
  - 新しい Route Handler `src/app/auth/callback/route.ts`: `?code=` を `exchangeCodeForSession(code)` で交換 → 成功で `rr_next` を消して `safeNextPath(rr_next)` へ、失敗・code なしは `/login?error=link_invalid`。PKCE の code_verifier はリンクを要求したブラウザのクッキーにしかないので、GET で交換してもログインCSRFは成立しない（18.1 S-6 の目的は保たれる）。
  - 制約: **リンクを要求したのと同じブラウザでメールを開く必要がある**。ログイン画面の送信後の文言で案内する（M-03「このブラウザでリンクを開いてください」系）。
  - 6桁コード（OtpForm / verifyOtpCode）と `/auth/confirm`（token_hash）は**画面から外すがコードは残す**（独自 SMTP を入れたら復活。E2E の generateLink ヘルパーは token_hash で `/auth/confirm` を使い続けてよい）。
  - `supabase/config.toml` のテンプレート設定はコメントアウト（独自 SMTP 導入時に戻す）。
- 本番 Auth 設定は `supabase config push`（`[remotes.production]`）で反映: site_url / redirect URLs（本番ドメインと localhost のみ）/ サインアップ OFF / otp_expiry 900 / 再送間隔 60s。
- Vercel の Preview 環境変数は未設定（Git 連携していないため）。Git 連携時に設定する。
- 本番の Redirect URLs に `http://localhost:3000/**` を残すのは、Docker を使わず手元の開発でも本番プロジェクトにつなぐ間だけ（PKCE のため code 単体では悪用できない）。開発用プロジェクトを分けたら削除する。
- 本番の Auth で SMS（Twilio）プロバイダが有効扱いになっており、config push では無効化できない。全体のサインアップは OFF なので新規作成はされないが、Sprint 5 でダッシュボードの Phone プロバイダが無効か確認する。
- **障害記録（2026-10-07）**: `[auth.email] enable_signup = false` を本番に push したところ、ホスト版では「Email プロバイダの有効化」（external_email_enabled）として扱われ、メールログインそのものが無効になった（`email_provider_disabled`）。アプリはアカウント列挙対策で失敗も成功と同じ表示にしているため、画面からは気づけなかった。`[auth.email] enable_signup = true` に戻し、新規登録は全体の `[auth] enable_signup = false` だけで止める（直接 `/auth/v1/signup` を呼んで `signup_disabled` を確認済み）。15.1 の「`[auth.email] enable_signup = false`」はこの記述で置き換える。
- 教訓: `supabase config push` の前に `config diff` を読むだけでなく、push 後に本番の `/auth/v1/otp` を直接叩いてエラーコードを確認する。

## 22. ［取り下げ］ログインを Google OAuth のみに変更（2026-10-07）
> **取り下げ（CEO決定・2026-10-07）**: 調査の結果、標準メール送信は Hiro 宛てに届き、アプリからの送信も正しくユーザーを見つけていることを確認したため、メールログイン（21章）を継続する。以下は検討記録として残す。
- 理由: Supabase 標準のメール送信（試用扱い・到達保証なし）でログインメールが届かず、独自 SMTP は使わない方針のため。
- 方式: `signInWithOAuth({ provider: 'google', options: { redirectTo: '<siteOrigin>/auth/callback' } })` を Server Action で呼び、返ってきた URL へ `redirect()`。戻りは既存の `/auth/callback`（PKCE の code 交換、`rr_next` → `safeNextPath`）をそのまま使う。
- 許可するのは Hiro だけ: 全体の `[auth] enable_signup = false` を維持し、新しい Google アカウントではユーザーを作らせない。既存ユーザー（Hiro のアカウント）への Google ID の紐付けは Supabase の自動リンク（同じ確認済みメール）に頼る。**この挙動はサインアップ OFF 時に本番で必ず確認する**（だめなら admin API で Google identity を事前に作る／ダッシュボードで対応）。
- ログイン失敗（`?error=` 付きの戻り、交換失敗、未登録アカウント）は `/login?error=link_invalid` 系の文言ではなく、OAuth 用の文言「ログインできませんでした。登録済みの Google アカウントでお試しください。」を出す。
- 画面: ログイン画面は「Google でログイン」ボタン1つ（Google のブランドガイドラインに沿った表示）。メールアドレス入力・Magic Link・6桁コードの UI は外す。Magic Link / OTP / `/auth/confirm` のサーバー側コードは当面残す（未使用）。
- CSP: OAuth は Supabase → Google へのトップレベル遷移なので `connect-src` の追加は不要。`form-action 'self'` は Server Action からの `redirect()`（303）には影響しないことを E2E で確認する。
- Supabase 設定: `[auth.external.google] enabled = true`, `client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"`, `secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"`, `skip_nonce_check = false`。Google 側のリダイレクト URI は `https://ejnuzscvuymqlxrfwvnm.supabase.co/auth/v1/callback`。

### 22.1 「メールが届かない」調査記録（2026-10-07）
- Auth ログ（Management API `GET /v1/projects/{ref}/analytics/endpoints/logs`、`select timestamp, event_message from logs where source = 'auth_logs'`）で確認。
- 12:20 / 12:28 JST のアプリからの送信は `otp_disabled`（ユーザー不在扱い）。12:26 まではメールプロバイダ無効（21章の障害）。12:28 の分は設定反映（12:26:44）直後で、全インスタンスへの反映前だった可能性が高いが未証明。
- 12:33 / 12:35 に直接 `/otp`（PKCE なし・あり）を呼ぶとどちらも 200 で、Hiro の受信箱に届いた。12:36 に本番ログイン画面から送信すると、ユーザーを見つけた上での 429（送信間隔）になり、アプリ経由の経路も正常と確認。
- 大文字小文字・PKCE・アプリの入力処理はいずれも原因ではない。
- 学び: アカウント列挙対策で失敗も「送りました」と表示するため、画面からは原因が見えない。今後は Server Action で Supabase のエラーコードを**サーバーログにだけ**出す（メールアドレスは出さない）ことを検討する。

### 22.2 22.1 の訂正（2026-10-07・組織見直しの調査による）
- 22.1 の「12:28 の分は設定反映直後で全インスタンスへの反映前だった可能性が高い」は**根拠のない推測で、撤回する**。Supabase Auth v2.197.0 のソース（`otp.go`）では、`shouldCreateUser: false` のとき `otp_disabled` は「そのメールのユーザーが見つからない」を意味する（公式のエラーコード一覧の説明とは食い違う）。12:20 / 12:28 にユーザーが見つからなかった理由は**未解明**。
- 「1時間2通の上限を調査用の送信で使い切ったため 12:39 のメールが届かなかった可能性が高い」という説明も**撤回する**。ログでは 12:33・12:35・12:39 の3回とも送信成功（`mail.send`）で、途中の 429 は同じ宛先への60秒間隔の制限だった。12:39 のメールが届かなかった原因は**未解明**。
- 詳細と今後の扱いは `docs/org/org-handbook-v2.md`（組織の手引き）を参照。
