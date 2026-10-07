# 公道レビュー（road-review）アーキテクチャ設計書 v2 — ログインなし・端末内保存版

- ステータス: 設計案 v2.0（code-architect 作成 → CTO レビュー待ち → CEO 承認待ち）
- 保存先: `apps/road-review/docs/product/road-review-architecture-v2.md`
- 置き換えるもの: `road-review-architecture.md`（v1.1 と 15〜22章の追記）のうち、認証・DB・RLS・Storage・Server Actions・proxy・CSP（nonce）・テスト基盤の章。**画面仕様・入力項目・文言・Atomic Design の部品は v1 をそのまま使う**（この文書に書かれていない画面の決まりは v1 が正しい）。
- 前提にした事実（2026-10-08 にこのリポジトリと一次資料で確認）
  - 現在のコード: `src/proxy.ts`（nonce 付き CSP + Supabase のセッション更新）、`src/app/layout.tsx:62-63`（`headers()` を読むので全ページが動的描画）、`src/features/{auth,settings,roads,drives}`（Server Actions と問い合わせ）、`src/lib/supabase/*`、`supabase/migrations/00001〜00004`、`tests/rls/*`
  - **写真機能はまだ作られていない**（`PhotoUploader` も `photos` テーブルも無い）。今回の「写真なし」で消すものは無い
  - 監査 `docs/org/research/06-web-dev-lifecycle-and-audit.md` の指摘: B-M1（通信が切れると DriveForm の入力が消える）、B-M7（モックが多い・実装の手順をなぞるテスト）、B-H3（CI が無い）、B-H5（データの書き出しが無い）、B-M9（E2E が開発サーバーで動いている）
- CEO の決定（この設計では変えない）: ログインしない／データはブラウザの中だけに置く／JSON で書き出し・読み込みができる／写真は扱わない／Vercel に置く／スマホを先に考える（モバイルファースト）。v1 から続く決定（GPS を使わない、速度・タイム・ランキングを持たない、道の種別は5つ）もそのまま守る

---

## 0. 要点（先に結論）

1. **`output: 'export'`（静的書き出し）にする。** サーバーで動くコードを無くす。proxy・nonce・Server Actions・Supabase をすべて削る。Next.js のサーバー側の脆弱性（v1 で RCE 修正のため版を上げたもの）の影響を受けなくなる。サーバーが無いので、そもそも攻撃される入口が無い。
2. **URL は `/roads/view/?id=...` のようにクエリ（`?` の後ろ）で表す。** 静的書き出しでは、ビルドの時点で分からない ID を使った `/roads/[roadId]` は作れない（公式 docs「Unsupported Features」）。
3. **CSP（ブラウザに「このサイトはどこのスクリプトを動かしてよいか」を伝える決まり）は2段構えにする。** ① `vercel.json` で全ページ共通のヘッダーを付ける。② ビルドの後にスクリプトが HTML を読み、ページの中に直接書かれたスクリプト（インラインスクリプト）の SHA-256 ハッシュ（中身から計算する指紋）を `<meta http-equiv="Content-Security-Policy">` として各 HTML に入れる。これで nonce を使わなくても、`'unsafe-inline'`（ページ内のスクリプトを何でも動かしてよい設定）と同じ弱さにならない。
4. **保存先は IndexedDB（ブラウザ内のデータベース）。ライブラリは足さない。** 画面は IndexedDB に直接触らない。`RoadReviewRepository`（保存係のインターフェース）を通す。読み込むときは毎回 zod で中身を確かめ、壊れた行は表示から外して件数だけ知らせる。
5. **下書きは localStorage（ブラウザ内の小さな保存場所）に自動で保存する。** 理由: localStorage は同期的に書けるので、ページを閉じる瞬間（`pagehide`）でも書き終わる。保存に失敗しても入力は消えない（監査 B-M1 の解決）。
6. **JSON 書き出しは `{ app, schemaVersion, exportedAt, data }` の形にする。** 読み込みには「置き換え」と「統合」の2つのモードを用意する。ファイル全体を先に確かめ、1つのトランザクション（全部成功するか、全部取り消すかの処理単位）で書く。途中まで書かれた状態は残らない。
7. **iOS で消えにくくするため、PWA（ホーム画面に追加できる Web アプリ）用の manifest を必須にする。** WebKit 公式は「ホーム画面の Web アプリは独自に日数を数える」「`persist()` を許可するかはホーム画面アプリかどうか等で決める」と書いている（11章）。
8. **追加する依存は devDependency の `fake-indexeddb` 1つだけ。** 本番の依存は増えない（むしろ `@supabase/*`、`server-only`、`supabase` の4つが減る）。
9. **CI（コードを出すたびに機械が自動で確かめる仕組み）を新しく作る。** lint・型・単体テスト・ビルド・CSP 検証・E2E（WebKit と Chromium のスマホ画面）を回す。スキップされたテストが1件でもあれば失敗にする。

---

## 1. 全体像

```
┌──────────── Vercel（静的ファイルを配るだけ・関数なし） ────────────┐
│  out/ (HTML/JS/CSS/フォント)  +  vercel.json のセキュリティヘッダー   │
└───────────────────────────────┬────────────────────────────────────┘
                                │ 初回だけ HTML/JS を取得
┌───────────────────────────────▼──────────── ブラウザ ───────────────┐
│ app/**/page.tsx (静的な枠)                                           │
│   └ PageClient.tsx ('use client') ── hooks ──► RoadReviewRepository  │
│        │ props / callbacks                      │  (lib/storage)     │
│        ▼                                        ├─► IndexedDB "road-review"
│   templates ◄ organisms ◄ molecules ◄ atoms     │     roads / drives │
│        │                                        └─► change-bus       │
│        └ useFormDraft ──► localStorage (rr-draft:*)  (BroadcastChannel)
│   RoadsMap/PinPicker ──► 地理院タイル https://cyberjapandata.gsi.go.jp（画像だけ）
│   書き出し: Blob → ダウンロード / 共有シート   読み込み: <input type=file>
└──────────────────────────────────────────────────────────────────────┘
```

外部への通信は「地理院タイル画像（`img-src`）」だけ。`connect-src` は `'self'` だけにする（データを外に送る通り道が無い）。

---

## 2. 技術スタックと依存

### 2.1 変えないもの

next `16.3.6`、react/react-dom `19.2.6`、zod `^4.4.3`、leaflet `^1.9.4`、clsx、tailwind-merge、lucide-react、tailwindcss 4、vitest 4 / jsdom / Testing Library、@playwright/test、TypeScript 6、pnpm 10.29.2、`pnpm-workspace.yaml` の cooldown（`minimumReleaseAge: 10080`）、`pnpm.overrides`、`.npmrc`（engine-strict）、`preinstall: only-allow pnpm`。

### 2.2 削除する依存

| パッケージ | 区分 | 理由 |
|---|---|---|
| `@supabase/ssr` | dependencies | 認証・DB をやめる |
| `@supabase/supabase-js` | dependencies | 同上 |
| `server-only` | dependencies | サーバー専用コードが無くなる |
| `supabase`（CLI） | devDependencies | マイグレーション・ローカル DB をやめる |

`pnpm remove` で消す（`.claude/rules/dependencies.md`）。lockfile の差分は supply-chain-auditor が確認する。

### 2.3 追加する依存（1つだけ）

| パッケージ | 区分 | 理由 | 確認した事実（npm registry、2026-10-08） |
|---|---|---|---|
| `fake-indexeddb` `^6.2.5` | devDependencies | Node/jsdom でテストするとき、IndexedDB を本物どおりの API で動かすため。保存係（repository）を手作りのモックではなく本物の API の上でテストできる（監査 B-M7 への対策） | 最新 6.2.5、Apache-2.0、実行時の依存なし、install/postinstall スクリプトなし、engines `node >=18`、メンテナは1人（dumbmatter） |

- メンテナが1人なのはリスク。ただし devDependency なので利用者のブラウザには届かない。cooldown（7日）も効く。導入時に supply-chain-auditor の監査（Socket `depscore` を含む）を必ず通す。
- **`idb`（8.0.4、ISC、依存なし、スクリプトなし）は採用しない。** 利用者のブラウザに届く本番の依存が1つ増えるため。このアプリで必要なのは「リクエストを Promise にする」「トランザクションの完了を待つ」の2つだけで、`lib/storage/idb-request.ts`（約60行）で書ける。依存を最小にする方針（rules/dependencies.md）を優先する。
- 任意（今回は入れない。必要になったら監査を通して足す）: `@axe-core/playwright`（a11y の自動検査）、`@vitest/coverage-v8`（カバレッジ計測）。

---

## 3. レンダリング方式と CSP の決定

### 3.1 比べた案

| 観点 | A: 今のまま（サーバー描画 + proxy + nonce） | B: 静的書き出し + ヘッダー CSP（`'unsafe-inline'`） | **C: 静的書き出し + ヘッダー CSP + ビルド時ハッシュの meta CSP（採用）** | D: 静的書き出し + 実験的 SRI |
|---|---|---|---|---|
| ページ内スクリプトの制限 | 強い（nonce） | 弱い（何でも動く） | 強い（ハッシュが合うものだけ動く） | 外部ファイルは強い。ページ内スクリプトは別の対策が必要 |
| サーバーの攻撃面 | あり（関数・Next サーバーの脆弱性） | なし | なし | なし |
| オフライン・CDN | 毎回関数を呼ぶ（公式: nonce は全ページ動的・CDN キャッシュ不可） | ○ | ○ | ○ |
| 動的ルート `/roads/[id]` | ○ | ×（クエリで代用） | ×（クエリで代用） | × |
| 仕組みの複雑さ | 中（今のコードがある） | 低 | 中（後処理スクリプト + 検証） | 低。ただし公式が「Experimental」と明記 |
| 「サーバーが無い」ことの機械的な保証 | なし | あり（Server Actions・cookies・proxy を使うとビルドエラー） | あり | あり |

出典: `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md:385-408`（nonce を使うと全ページが動的描画になり、CDN キャッシュが使えない）、同 `:456-539`（SRI は Experimental。「Build-time only: Cannot handle dynamically generated scripts」）、`01-app/02-guides/static-exports.md:278-298`（静的書き出しでは Proxy・Server Actions・Headers・Cookies・`generateStaticParams` の無い動的ルートが使えない）。

### 3.2 採用: C

- **A を捨てる理由**: データがすべてブラウザ内にあるので、サーバーで描画しても空の枠しか作れない。それなのに毎回 Vercel の関数が動き、Next サーバーの脆弱性の影響も受ける。山道で電波が弱いときも、毎回サーバーに取りに行く形は相性が悪い。
- **B を捨てる理由**: App Router の HTML には、Next が書き込むページ内スクリプト（`self.__next_f.push(...)` という RSC データ）が入る。これを許すために `script-src 'unsafe-inline'` にすると、XSS（他人のスクリプトを紛れ込ませる攻撃）が起きたときに防げない。今回は「他人が作った JSON を読み込む」という新しい入口ができるので（8章）、守りを弱めない。
- **D を捨てる理由**: 公式が Experimental と書いている。ページ内スクリプトを守れるかどうかも docs からは確かめられない。
- **C の仕組み**
  1. `vercel.json` の `headers` で、全ページに共通の CSP と他のセキュリティヘッダーを付ける（静的書き出しでは `next.config` の `headers()` が使えないため。公式の Unsupported Features）。
  2. `pnpm build` = `next build && node scripts/csp/inject-meta-csp.mjs`。後処理スクリプトは `out/**/*.html` を読み、`src` 属性の無い `<script>` の中身ごとに `sha256-<base64>` を計算する。そして `<head>` の**最初の子要素**として `<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'sha256-…' …">` を入れる。
  3. ブラウザは、ヘッダーの CSP と meta の CSP の**両方**を満たすものだけを動かす（ポリシーが複数あると、全部の条件を満たす必要がある）。ヘッダー側は `script-src 'self' 'unsafe-inline'` で緩い。meta 側がハッシュで締める。結果として、ハッシュが合うページ内スクリプトと、自分のドメインの JS だけが動く。
  4. meta CSP では `frame-ancestors` が効かない（仕様）。だからヘッダー側に置く。
- **失敗したときの検知**: 後処理が meta を入れ損ねると、ヘッダーだけ（＝B 相当）に黙って弱まる。これを防ぐため `scripts/csp/verify-out.mjs` を CI で実行する。全 HTML について「meta CSP が `<head>` の最初にある」「すべてのページ内スクリプトのハッシュが入っている」「`'unsafe-inline'` と `'unsafe-eval'` が meta 側に無い」を確かめ、1つでも外れたら失敗にする。E2E でも `securitypolicyviolation`（CSP 違反のイベント）が0件であることを確かめる（10章）。
- **【要検証・Step 0 で確かめる】**: (a) Vercel の Next.js ビルドで、`output: 'export'` の後処理が `out/` に反映されるか（Preview で `curl` して meta を確認する）。(b) `vercel.json` の `headers` が静的書き出しの配信にも付くか（`curl -I` で確認する）。(c) 開発モード（`next dev`）では CSP がかからない。CSP を確かめるのはビルド後の E2E だけでよいか。**(a)(b) が成り立たなければ CEO に報告し、B（`'unsafe-inline'`）で一時的に出すか、A に戻すかを判断してもらう**（勝手に B にしない）。

### 3.3 CSP の中身

`vercel.json`（正はこのファイル1つ。テスト・ローカルの静的サーバー・検証スクリプトはここを読む）:

```
default-src 'self';
script-src 'self' 'unsafe-inline';          ← 緩い側。meta のハッシュで締める
style-src 'self' 'unsafe-inline';           ← Leaflet が style 属性を使うため（v1 から変更なし）
img-src 'self' data: blob: https://cyberjapandata.gsi.go.jp;
font-src 'self';                            ← next/font はビルド時にフォントを自分のドメインに置く
connect-src 'self';                         ← Supabase を削除。外への fetch は一切しない
worker-src 'self';                          ← 将来の Service Worker 用
manifest-src 'self';
object-src 'none';
base-uri 'none';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests
```

meta 側（ページごとに後処理が作る）: `script-src 'self' 'sha256-AAA' 'sha256-BBB' …; object-src 'none'; base-uri 'none'`

その他のヘッダー（`vercel.json`）: `X-Content-Type-Options: nosniff`、`Referrer-Policy: strict-origin-when-cross-origin`、`X-Frame-Options: DENY`、`Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()`（GPS を使わない決定）、`Cross-Origin-Opener-Policy: same-origin`、`Strict-Transport-Security: max-age=63072000; includeSubDomains`（監査 L5。Vercel が自動で付けるかは未確認なので、自分で付ける。付けても害は無い）。

- 色テーマ用のページ内スクリプト（`layout.tsx` の themeScript）は残す。ハッシュは後処理が自動で入れる。`nonce` 属性と `headers()` は消す。
- `'strict-dynamic'` は使わない（JS はすべて自分のドメインから読むので要らない）。
- Trusted Types（`require-trusted-types-for 'script'`）は今回は入れない。Leaflet が出典表示で innerHTML を使っていて（`lib/map/gsi-tiles.ts:10`）、壊れる恐れがあるため。将来の課題にする。

---

## 4. ルーティング（App Router + 静的書き出し）

### 4.1 URL の対応表

| 画面 | v1 の URL | v2 の URL | 静的ファイル |
|---|---|---|---|
| 道の一覧（地図 + リスト） | `/roads` | `/` | `out/index.html` |
| 道の登録 | `/roads/new` | `/roads/new/` | `out/roads/new/index.html` |
| 道の詳細 | `/roads/[roadId]` | `/roads/view/?id={roadId}` | `out/roads/view/index.html` |
| 道の編集 | `/roads/[roadId]/edit` | `/roads/edit/?id={roadId}` | |
| 走行記録の登録 | `/roads/[roadId]/drives/new` | `/drives/new/?roadId={roadId}` | |
| 走行記録の編集 | `/roads/[roadId]/drives/[driveId]/edit` | `/drives/edit/?id={driveId}` | 道の ID は記録から分かる |
| データ管理（書き出し・読み込み・保存状態・全削除） | なし | `/settings/data/` | |
| 404 | | `not-found.tsx` | `out/404.html` |
| ログイン・`/auth/*` | あり | **削除** | |

- `next.config.ts`: `output: 'export'`、`trailingSlash: true`（`/roads/view/index.html` の形で出力される。どの静的サーバーでも同じように配れる）、`images: { unoptimized: true }`（そのまま）。
- 古い URL の `/roads` は、`vercel.json` の `redirects` で `/` に送る（`permanent: false`）。v1 の `/roads/<uuid>` は少人数しか使っていないので、転送しない（404 になる）。
- URL を組み立てる処理は `src/lib/routes.ts` の1か所に集める（`roadViewHref(id)` など）。`RoadsMap.tsx:47` の `/roads/${road.id}` もここを使うように直す。ID は zod で UUID だと確かめたものだけを入れる。

### 4.2 ページの組み立て方

```
app/(app)/roads/view/page.tsx        Server Component（ビルド時に描画される静的な枠）
  export const metadata = { title: '道の詳細' }
  return <Suspense fallback={<PageLoading/>}><RoadViewPageClient/></Suspense>

app/(app)/roads/view/PageClient.tsx  'use client'
  const id = useSearchParams().get('id')
  const road = useRoad(id)                 ← features/roads/hooks.ts
  return <RoadDetailTemplate header=… drives={<DriveList …/>} …/>
```

- `useSearchParams` を使う部品は `<Suspense>` で包む。包まないと本番ビルドが失敗する（`use-search-params.md:180-181`）。
- IndexedDB・localStorage・`navigator` に触るのは `useEffect` の中とイベントの処理の中だけにする。Client Component もビルド時に一度 HTML へ描画されるため（`static-exports.md:257-274`）。
- 保存した後の移動は `router.replace(roadViewHref(id))`（戻るボタンで入力済みのフォームに戻らないようにする）。
- 見つからない ID・形が正しくない ID・削除済みの ID は、どれも同じ「見つかりません」表示（`NotFoundState` molecule）にする（v1 の「同じ 404」の考え方を引き継ぐ）。
- `app/(app)/layout.tsx` は Server Component のままにする。その中に Client の `AppProviders`（`RepositoryProvider` + `SafetyNoticeGate` + `StorageStatusBanner`）を置き、さらに `AppShellTemplate` を入れる。
- `app/page.tsx`（今の `redirect('/roads')`）は削除する。代わりに `app/(app)/page.tsx` が `/` になる。
- `error.tsx` の `retry`（16.3）はそのまま使う。保存処理の失敗は結果の値として返し、throw しない（7.4）。そのため、エラー境界（エラー時に代わりの画面を出す仕組み）に飛ぶのは本当に想定外のバグのときだけになる。

---

## 5. データモデルとスキーマのバージョン管理

### 5.1 保存するレコード（schemaVersion 1）

道の情報（road_info）は走行記録に**埋め込む**（1対1の関係なので、別の保存場所にしない）。こうすると1回の `put` で書き終わるので、v1 の「drives だけ更新されて road_info が失敗する」半端な保存（監査 B-M2）が構造上起きなくなる。

```ts
// src/lib/schema/v1.ts  (types are z.output of the schemas below)
type RoadRecordV1 = {
  id: string              // crypto.randomUUID()
  name: string            // 1..50, trimmed, no control/bidi chars (roadNameSchema)
  prefectureCode: number  // 1..47
  roadType: 'pass' | 'skyline' | 'coastal' | 'forest' | 'other'
  start: { lat: number; lng: number }        // Japan bounds, 6 decimals
  end: { lat: number; lng: number } | null
  createdAt: string       // ISO 8601 (UTC "Z" when written by the app)
  updatedAt: string
  revision: number        // int >= 1, +1 on every update (optimistic concurrency)
}

type DriveRecordV1 = {
  id: string
  roadId: string
  drivenOn: string        // YYYY-MM-DD, >= 2000-01-01 (future check only on write)
  vehicleType: 'car' | 'motorcycle' | null
  weather: 'sunny' | 'cloudy' | 'rain' | 'snow' | 'other' | null
  ratingOverall: number   // 1..5
  ratingScenery: number | null
  ratingRoadSurface: number | null
  ratingEaseOfDriving: number | null
  traffic: 'few' | 'normal' | 'many' | null
  memo: string            // <= 2000
  roadInfo: {
    confirmedOn: string   // YYYY-MM-DD; defaults to drivenOn on write (was a DB trigger in v1)
    items: Record<RoadInfoItem, { status: Status | null; memo: string /* <= 200 */ }>
  } | null
  createdAt: string
  updatedAt: string
  revision: number
}
```

- 入力の決まり（文字数・列挙値・日本の範囲・評価 1〜5）は、今の `lib/validation/{road,drive,road-info,common}.ts` から部品を取り出して**同じものを使う**。たとえば `roadNameSchema`、`latLngSchema`、`ratingSchema`、`ROAD_TYPES` などを export して共有する。
- 「未来の日付は禁止」は**書き込むときだけ**確かめる（フォームの入力スキーマ）。読み込むとき・取り込むときは確かめない（時計のずれや時差で、保存済みのデータが急に「壊れた」扱いになるのを防ぐ）。
- `createdAt` / `updatedAt` は記録を管理するための時刻で、走行の時刻ではない（v1 の決定どおり）。
- **件数の上限**（この設計で決めた値。CPO/CEO の確認待ち。16章）: 道 500件（v1 の DB トリガーと同じ）、走行記録は全体で 5,000件。

### 5.2 2種類の「バージョン」

| 名前 | 置き場所 | 意味 |
|---|---|---|
| `SCHEMA_VERSION`（= IndexedDB の DB バージョン） | `src/lib/schema/version.ts` | レコードの形のバージョン。**IndexedDB の `open(name, version)` のバージョンと同じ数にそろえる**（1対1） |
| 書き出しファイルの `schemaVersion` | JSON の一番上 | そのファイルが、どのレコードの形で書かれたか |

バージョン番号を分けない理由: IndexedDB では、バージョンを上げたときの `upgradeneeded` の中でしか保存場所（object store）を作り直せない。データの形の変更も同じタイミングで、1つのトランザクションの中で行えば、途中で失敗しても元に戻る。番号をそろえておけば「DB のバージョンは上がったが、データの移行は終わっていない」という状態がそもそも起きない。

### 5.3 移行（マイグレーション）の仕組み

```ts
// src/lib/schema/migrations.ts
export type RecordMigration = {
  from: number
  to: number                                   // always from + 1
  migrateRoad: (raw: unknown) => unknown       // pure & synchronous
  migrateDrive: (raw: unknown) => unknown
  upgradeStores?: (db: IDBDatabase, tx: IDBTransaction) => void // structural changes (indexes)
}
export const MIGRATIONS: readonly RecordMigration[] = [] // v1 is the first version

export function migrateDataset(
  dataset: { roads: unknown[]; drives: unknown[] },
  fromVersion: number,
): { roads: unknown[]; drives: unknown[] }    // applies from..CURRENT in order
```

- **同じ移行関数を2か所で使う**: ① IndexedDB の `upgradeneeded`（`oldVersion` から今のバージョンまで、カーソルで1件ずつ読み、`migrateRoad/Drive` を通して `put` する）。② JSON を取り込むとき（古い `schemaVersion` のファイル）。
- 移行関数は**同期的で純粋**（同じ入力なら必ず同じ結果を返し、外に影響しない）にする。`upgradeneeded` の中で IndexedDB 以外の Promise を待つと、トランザクションが自動で確定してしまうため。
- ある1件の移行が例外を投げたら、その行は**元のまま残し**、移行全体は止めない（DB が開けなくなる方が被害が大きいため）。その行は次に読むときに zod の検査で落ち、「壊れたデータ」として数えられる（5.4）。
- 移行関数ごとに「古い形の見本 → 新しい形」の単体テストと、「古い DB を作る → 新しいコードで開く」の結合テストを必ず書く（10章）。
- 新しいバージョンの DB を古いアプリで開いたとき（`VersionError`）は、「新しいバージョンのアプリで保存されたデータです。ページを再読み込みしてください」と表示する。

### 5.4 読み込むたびの検査（壊れたデータの扱い）

```ts
// src/lib/storage/parse-records.ts
export type Parsed<T> = { items: T[]; invalid: { id: string | null; issues: string[] }[] }
export function parseRecords<T>(schema: z.ZodType<T>, rawRecords: unknown[]): Parsed<T>
```

- 一覧・詳細・書き出しのどれでも、IndexedDB から読んだ値は必ず zod の `safeParse` を通す。
- 壊れた行は**表示から外す**。画面の上には「読み込めないデータが N 件あります（データ管理へ）」と出す。黙って捨てたり、自動で消したりはしない。
- データ管理の画面には「調査用に、壊れたデータも含めてそのまま書き出す」ボタンを置く（`road-review-raw-dump-*.json`。この形式は読み込みには使えない）。
- 子の走行記録の `roadId` が存在しない場合（孤立した記録）も、壊れたデータとして数える。

---

## 6. 保存層（Repository）

### 6.1 IndexedDB の構成

| 項目 | 値 |
|---|---|
| DB 名 | `road-review` |
| バージョン | `SCHEMA_VERSION`（初めは 1） |
| store `roads` | keyPath `id` |
| store `drives` | keyPath `id`、index `byRoadId`（`roadId`、unique ではない） |

- 道は最大500件、走行記録は最大5,000件なので、一覧は `getAll()` してメモリの中で並べ替える（インデックスを増やさない）。
- 一覧に出す集計（最終走行日・最新の総合評価・回数・平均）は、v1 の SQL ビュー `road_summaries` の代わりに、純粋関数 `lib/roads/build-road-summaries.ts` で計算する。並び順も v1 と同じにする（最終走行日の新しい順。走っていない道は最後。同じなら登録の新しい順）。

### 6.2 インターフェース（UI が知ってよいのはこれだけ）

```ts
// src/lib/storage/repository.ts
export type StorageErrorCode =
  | 'unavailable'      // IndexedDB cannot be opened (disabled / blocked)
  | 'quota_exceeded'
  | 'not_found'
  | 'conflict'         // revision mismatch (edited in another tab)
  | 'limit_exceeded'   // 500 roads / 5000 drives
  | 'validation'
  | 'version_changed'  // DB upgraded by another tab; reload required
  | 'unexpected'

export type StorageResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: StorageErrorCode; message: string; fieldErrors?: FieldErrors } }

export interface RoadReviewRepository {
  listRoadSummaries(): Promise<StorageResult<Parsed<RoadSummary>>>
  getRoad(id: string): Promise<StorageResult<Road | null>>
  createRoad(values: RoadValues): Promise<StorageResult<Road>>
  updateRoad(id: string, values: RoadValues, expectedRevision: number): Promise<StorageResult<Road>>
  deleteRoad(id: string): Promise<StorageResult<{ deletedDrives: number }>> // cascades in one tx
  listDrives(roadId: string): Promise<StorageResult<Parsed<DriveWithRoadInfo>>>
  getDrive(id: string): Promise<StorageResult<DriveWithRoadInfo | null>>
  createDrive(roadId: string, values: DriveValues): Promise<StorageResult<DriveWithRoadInfo>>
  updateDrive(id: string, values: DriveValues, expectedRevision: number): Promise<StorageResult<DriveWithRoadInfo>>
  deleteDrive(id: string): Promise<StorageResult<void>>
  exportSnapshot(): Promise<StorageResult<ExportFileV1>>
  planImport(file: ValidatedImport, mode: ImportMode): Promise<StorageResult<ImportPlan>>
  applyImport(plan: ImportPlan): Promise<StorageResult<ImportReport>>  // one readwrite tx
  rawDump(): Promise<StorageResult<{ roads: unknown[]; drives: unknown[] }>>
  clearAll(): Promise<StorageResult<void>>
}

export function createIndexedDbRepository(deps: {
  indexedDB: IDBFactory             // window.indexedDB in the app, new FDBFactory() in tests
  now?: () => Date
  randomUUID?: () => string
  changeBus?: ChangeBus
}): RoadReviewRepository
```

- **必ず結果の値を返し、throw しない。** IndexedDB の `QuotaExceededError` は `quota_exceeded` に、`InvalidStateError` や `VersionError` は `version_changed` に変換する。フォームは結果を見てエラーを表示し、入力は残す。
- **楽観的な同時編集の検査**: `update*` は、同じ readwrite トランザクションの中で今の行を読み、`revision !== expectedRevision` なら `conflict` を返す。画面には「別のタブ（画面）で更新されています。最新の内容を読み込みますか？（入力は下書きに残ります）」と出す。
- **件数の上限**: `createRoad` と `createDrive` は、同じトランザクションの中で `count()` を取ってから追加する。
- **削除の連鎖**: `deleteRoad` は `[roads, drives]` の readwrite トランザクションで、`byRoadId` の範囲の記録をすべて消してから道を消す。全部成功するか、全部取り消されるかのどちらかになる。消した後、その道に関係する下書きも消す。
- **依存の差し込み（DI）**: `indexedDB`・`now`・`randomUUID` を外から渡せるようにする。テストでは `new IDBFactory()`（fake-indexeddb）を毎回新しく渡して、テスト同士が影響し合わないようにする。
- 内部の補助関数: `lib/storage/idb-request.ts`（`requestToPromise`、`transactionDone`）、`lib/storage/open-database.ts`（`upgradeneeded` で移行を流す・`versionchange` で閉じる・`blocked` を処理する）。

### 6.3 React からの使い方

- `src/features/storage/RepositoryProvider.tsx`（'use client'）: 最初に描画されたときに、ブラウザの中でだけ repository を作って context で配る。テストでは `repository` を props で差し込む。
- `src/features/storage/useStorageQuery.ts`: `{ status: 'loading' | 'ready' | 'error', data, error }` を返す小さな hook。change-bus の通知を受けたら読み直す。SWR などのライブラリは入れない。
- `src/features/roads/hooks.ts`（`useRoadSummaries`、`useRoad`）、`src/features/drives/hooks.ts`（`useDrives`、`useDrive`）、`src/features/storage/useRepository.ts`（書き込み用）。
- `src/lib/storage/change-bus.ts`: 同じタブの中は `EventTarget`、別のタブには `BroadcastChannel('road-review:changes')` で `{ type: 'changed', stores: ['roads'] }` を知らせる。トランザクションの `complete` の後にだけ送る。
- 別のタブで DB のバージョンが上がったとき: `db.onversionchange` で DB を閉じ、`StorageStatusBanner` に「アプリが更新されました。再読み込みしてください」と出す。

---

## 7. フォーム・下書き・エラー時の入力保持

### 7.1 方針（監査 B-M1 の解決）

1. 組織（organisms）の `RoadForm` / `DriveForm` は **保存先を知らない**。`onSubmit(values) => Promise<StorageResult<…>>` を props で受け取る。Server Action の import（`DriveForm.tsx:15`）は消す。
2. 送信の処理は `try/catch` で包み、`startTransition` の中で throw しない。失敗はフォームの上の要約（Alert）に出し、入力値の state はそのまま残す。
3. 入力値は自動で下書きに保存する（7.2）。タブが落ちても、ページを再読み込みしても戻せる。

### 7.2 下書きの自動保存

| 項目 | 決定 | 理由 |
|---|---|---|
| 保存先 | **localStorage**（キー `rr-draft:v1:{formKey}`） | 同期的に書けるので、`pagehide` / `visibilitychange(hidden)` の瞬間に確実に書き終わる。IndexedDB の非同期の書き込みは、iOS でページを閉じるときに終わらない恐れがある。1件は最大でも約12KB（メモ2000字 + 道の情報のメモ8×200字）で、容量の上限（一般に約5MB）に対して十分小さい |
| formKey | `road:new`、`road:edit:{id}`、`drive:new:{roadId}`、`drive:edit:{id}` | |
| 中身 | `{ v: 1, formKey, savedAt, baseRevision: number \| null, values: unknown }` | |
| 書くタイミング | 入力の変更から 500ms 後（デバウンス = 連続した入力が止まってから1回だけ書く）、加えて `pagehide` と `visibilitychange` で hidden になったとき | |
| 読むとき | 外側の形は zod で確かめる。`values` はフォームの state 用のスキーマ（null を許す緩い形）で確かめ、合わなければ黙って捨てる | 壊れた下書きで画面が落ちないようにする |
| 戻すとき | フォームを開いたときに下書きがあり、初期値と違えば `DraftRestoreBanner`（「保存されていない下書きがあります（10/08 14:20）［復元する］［破棄する］」）を出す。自動では戻さない | 古い下書きで上書きしてしまう事故を防ぐ |
| 編集の衝突 | `baseRevision` と今の `revision` が違えば「この下書きの後に記録が更新されています」と書き添える | |
| 消すタイミング | 保存に成功したとき／［破棄する］を押したとき／キャンセルしたとき／30日より古いもの（アプリを起動したときに掃除する）／道を削除したとき（その道の分） | |
| 失敗したとき | localStorage の容量オーバーなどは握りつぶし、フォームの下に「下書きを保存できませんでした」と小さく出す（保存そのものは続ける） | |

- 実装: `src/lib/drafts/draft-store.ts`（純粋 + Storage の差し込み）、`src/features/drafts/useFormDraft.ts`（hook）。
- 離脱の警告（`beforeunload`）は付けない。自動保存があるし、スマホではこのイベントが確実には発生しないため。

### 7.3 安全注意の確認・その他の設定

| 設定 | 保存先 | 書き出しに含めるか |
|---|---|---|
| 安全注意を確認した日時 | localStorage `rr-safety-ack`（ISO 日時） | 含めない（端末ごとに一度確認すればよい） |
| 色テーマ | localStorage `rr-theme`（今のまま） | 含めない |
| 最後に書き出した日時・書き出し後の変更回数 | localStorage `rr-last-export`、`rr-changes-since-export` | 含めない |

`SafetyNoticeDialog` は `acknowledged` と `onAcknowledge: () => Promise<boolean>` を props で受け取る形に変える（Server Action の import を消す）。

### 7.4 結果の型

`src/lib/actions/result.ts` を `src/lib/result.ts` に移し、エラーコードを 6.2 の `StorageErrorCode` に置き換える。`photo_limit_exceeded`、`rate_limited`、`unauthorized`、`storage_cleanup_pending` は消す。

---

## 8. 書き出し（エクスポート）と読み込み（インポート）

### 8.1 ファイルの形式

```json
{
  "app": "road-review",
  "schemaVersion": 1,
  "exportedAt": "2026-10-08T05:12:34.567Z",
  "appVersion": "2.0.0",
  "counts": { "roads": 12, "drives": 48 },
  "data": {
    "roads": [ { "id": "…", "name": "…", "...": "RoadRecordV1" } ],
    "drives": [ { "id": "…", "roadId": "…", "...": "DriveRecordV1" } ]
  }
}
```

- ファイル名: `road-review-backup-YYYYMMDD-HHmm.json`（日本時間）。MIME は `application/json`。UTF-8、BOM なし。`JSON.stringify(file, null, 2)`（人が読めるように整形する）。
- 中身は zod の検査に通った行だけ（壊れた行は 5.4 の生データ書き出しに分ける）。だから**自分が書き出したファイルは、必ず自分で読み込める**（往復テストで保証する）。
- 保存の方法は2つ: ［ファイルとして保存］（Blob の URL + `<a download>`）と、［共有メニューで送る］（`navigator.canShare({ files })` が true の端末だけ表示する。iOS では「ファイルに保存」や AirDrop が選べる）。
- 書き出しに成功したら `rr-last-export` を更新する。
- 注意の文言: 「このファイルには、走った道の位置とメモが暗号化されずに入っています。人に渡すときは気をつけてください」。

### 8.2 読み込みの流れ（2段階 + 確認）

```
<input type="file" accept="application/json,.json">
  1. size check            File.size > MAX_IMPORT_BYTES -> reject (before reading)
  2. text + JSON.parse     strip leading U+FEFF; SyntaxError -> "JSONとして読めません"
  3. envelope schema       app === 'road-review'; schemaVersion int >= 1; exportedAt ISO;
                           data.roads / data.drives arrays (max lengths)
  4. version gate          > SCHEMA_VERSION -> reject ("新しいバージョンのアプリで作られたファイル")
                           < SCHEMA_VERSION -> migrateDataset(data, schemaVersion)
  5. record schemas        every record must pass (all-or-nothing); report up to 5 issues
                           as "data.drives[12].ratingOverall: 1〜5で選んでください"
  6. integrity             duplicate road ids / duplicate drive ids inside the file -> reject
                           drive.roadId must exist in file (replace) or in file ∪ local (merge)
  7. plan (dry run)        counts: 追加 / 更新 / 変更なし / ローカル優先 ; limits after merge
  8. confirm UI            preview + mode + "先に今のデータを書き出す"(default ON for replace)
  9. apply                 ONE readwrite transaction over [roads, drives]; abort -> nothing changes
```

| 決まり | 値・動き | 理由 |
|---|---|---|
| `MAX_IMPORT_BYTES` | 64 MiB | 最悪の場合の見積もり: 走行記録1件 ≒ 最大約11KB（メモ2000字×UTF-8で3バイト + 道の情報のメモ1600字×3 + 項目名）× 5,000件 ≒ 55MB、道500件 × 約0.5KB ≒ 0.25MB。**自分で書き出した最大のファイルが読み込めない、という事態を避ける上限**にした。普段の大きさはもっと小さい（メモが短い記録は1件1KB未満） |
| 件数 | 道 ≤ 500、走行記録 ≤ 5,000（統合した後の合計にも適用） | 5.1 と同じ |
| 置き換え（replace） | 両方の store を `clear()` してから全件 `put`。同じトランザクションの中で行う | |
| 統合（merge） | ID が無い → 追加。ID があって中身が同じ → 何もしない。ID があって中身が違う → **`updatedAt` が新しい方を残す。同じならローカルを残す**。結果を件数で報告する | 端末を2台使う人が、片方の書き出しをもう片方に取り込む場面を想定（同期の代わり） |
| 時刻の正規化 | 取り込むときに `createdAt` / `updatedAt` を `new Date(x).toISOString()` で UTC の "Z" 形式にそろえる | Supabase から移すデータは `+00:00` 形式でマイクロ秒まで付く（12章） |
| 知らないキー | レコードの中の知らないキーは取り除く（zod の既定）。一番上の `app` が違えば拒否する | 将来の形の変更に少し耐えられるようにしつつ、別アプリのファイルを誤って読むのは防ぐ |
| 安全性 | `__proto__` などのキーは zod が新しいオブジェクトを作るので混ざらない。文字列は React が表示時にエスケープする。地図のポップアップは `textContent` で名前を入れている（`RoadsMap.tsx:40-58`）。道の名前にある制御文字・双方向制御文字は今のスキーマで拒否される | 他人が作った悪意のある JSON への対策 |
| 途中で失敗したとき | トランザクションが中止され、何も変わらない。画面に「読み込めませんでした。データは変わっていません」と出す | |

実装: `src/lib/transfer/{export-file.ts, parse-import.ts, plan-import.ts}`（純粋関数）+ repository の `planImport` / `applyImport`。

---

## 9. 消えにくくする工夫（persist・バックアップの催促）

- `navigator.storage.persist()`: **アプリを開いたときには呼ばない**（Firefox では許可を求める画面が出て邪魔になるため）。最初の保存に成功した後に1回だけ呼ぶ。データ管理の画面にも［データを消えにくくする］ボタンを置く。状態は `navigator.storage.persisted()` で取得して表示する（「消えにくい設定: 有効／無効（ブラウザが判断）」）。
- `navigator.storage.estimate()` で使っている容量を表示する（`StorageUsageMeter`）。
- **バックアップの催促**（`BackupReminderBanner`）: 道が1件以上あって、(a) 一度も書き出していない、(b) 最後の書き出しから30日以上たった、(c) 書き出しの後に20回以上変更した、のどれかに当てはまれば、一覧の上に「最後のバックアップ: 未実施／M月D日。［今すぐ書き出す］」を出す（閉じると7日間は出さない）。
- iOS の利用者には、データ管理の画面に「ホーム画面に追加すると、データが消えにくくなります」という案内を出す（11章の根拠）。

---

## 10. テスト戦略

### 10.1 層ごとの役割

| 層 | 環境 | 対象 | モックの方針 |
|---|---|---|---|
| ① 純粋関数 | vitest（`node`） | スキーマ v1、移行、`build-road-summaries`、`parse-import` / `plan-import`、`export-file`、`draft-store`（Storage を差し込む）、CSP のハッシュ計算 | なし |
| ② 保存層の結合 | vitest（`node`）+ fake-indexeddb（テストごとに `new IDBFactory()`） | CRUD、削除の連鎖、件数上限、`revision` の衝突、v0→v1 の upgrade、壊れた行を飛ばす動き、change-bus の通知、取り込みの途中失敗で何も変わらないこと（不正な行を混ぜて中止させる） | IndexedDB は fake-indexeddb（本物の API 仕様どおりに動く代わり）。repository の中身はモックしない |
| ③ 部品・画面 | vitest（`jsdom`） | 組織（callback を受け取る形）、`PageClient` + 本物の repository（fake-indexeddb）+ `RepositoryProvider` | `vi.mock` でモジュールを差し替えない。callback は普通の関数を渡す。Leaflet だけは今の `tests/helpers/leaflet-mock.ts` を使い続ける（jsdom では地図を描けないため。本物の動きは E2E で確かめる） |
| ④ E2E | Playwright → **ビルドした `out/` を静的サーバーで配る**（`scripts/serve-static.mjs`。依存なし・`vercel.json` のヘッダーを付ける） | 本番と同じ配信・同じ CSP で、本物のブラウザの IndexedDB を使う | 外部への通信はすべて止める |
| ⑤ ビルドの検証 | Node スクリプト | `verify-out.mjs`（meta CSP・ハッシュ）、`out/` にサーバー用のファイルが無いこと | |

- jsdom 環境の中で fake-indexeddb が `structuredClone` を見つけられるかは、Step 0 で確かめる（【要検証】）。だから保存層のテストは `// @vitest-environment node` で書く。
- **スキップを0件にする**: `vitest run --reporter=default --reporter=json --outputFile=reports/vitest.json` の後、`scripts/ci/assert-no-skips.mjs` がスキップ・todo の数を数え、0件でなければ失敗にする。Playwright も `forbidOnly` に加えて、レポートのスキップ件数を同じ方法で確かめる。
- 消すテスト: `tests/rls/**`、`vitest.rls.config.ts`、`tests/helpers/supabase-test-users.ts`、`tests/e2e/support/login.ts`、`tests/e2e/auth.spec.ts`、`tests/config/{supabase-config,migration-00004}.test.ts`、`src/features/**/{actions,queries}.test.ts`、`src/app/auth/**`・`(auth)/**` のテスト、`lib/auth/*`・`safe-next-path`・`validation/auth` のテスト、`LoginForm` / `OtpForm` / `ConfirmLoginForm` / `AuthTemplate` のテスト。
- 書き直すテスト: `tests/config/next-config.test.ts` は「`output: 'export'` になっていること」「`vercel.json` の CSP の各項目」を確かめるテストにする。`src/lib/security/csp.test.ts` は `scripts/csp` のテストに置き換える。

### 10.2 E2E（スマホ画面が主役）

`playwright.config.ts`:

```ts
projects: [
  { name: 'iphone-webkit',   use: { ...devices['iPhone 13'] } },             // iOS Safari に近い WebKit
  { name: 'android-chromium', use: { ...devices['Pixel 7'] } },
  { name: 'small-360',        use: { ...devices['Pixel 5'], viewport: { width: 360, height: 780 } } },
  { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
],
webServer: { command: 'node scripts/serve-static.mjs out --port 4173', url: 'http://127.0.0.1:4173' },
use: { baseURL: 'http://127.0.0.1:4173', permissions: [], screenshot: 'on', trace: 'on-first-retry' },
```

- **外への通信を止める**: 共通の fixture で `context.route('**/*', …)` を設定する。`127.0.0.1` 以外は `abort`。ただし `https://cyberjapandata.gsi.go.jp/**` だけは `tests/e2e/fixtures/tile.png` を返す（地理院のサーバーに負荷をかけず、スクリーンショットも毎回同じになる）。止めた通信が1件でもあれば失敗にする。
- **CSP 違反を0件にする**: `addInitScript` で `securitypolicyviolation` を `window.__cspViolations` に集め、各テストの最後に空であることを確かめる。
- テストの一覧（spec）: `roads.spec.ts`（登録・編集・削除の連鎖）、`drives.spec.ts`、`draft.spec.ts`（入力 → 再読み込み → ［復元する］で元に戻る。保存の失敗を `page.evaluate` で容量オーバーにして起こし、入力が残ること）、`transfer.spec.ts`（書き出し → 全削除 → 読み込みで同じになる。`download` イベントと `setInputFiles` を使う。不正なファイル6種類の拒否メッセージ）、`multi-tab.spec.ts`（同じ context の2ページ: 片方で保存したらもう片方の一覧が変わる。同時に編集したら `conflict` の表示が出る）、`safety.spec.ts`、`security.spec.ts`（ヘッダー・meta CSP・外への通信0件）。
- データの準備は、アプリ自身の読み込み機能に見本の JSON を渡して行う（読み込み機能のテストも兼ねる）。
- **スクリーンショット**: 主な6画面 × 4つの project を `test-results/` に保存し、CI の成果物（artifact）として PR ごとに人が見られるようにする。`toHaveScreenshot`（画像の差分で失敗させる検査）は、フォントの描画が OS によって違うため、最初は入れない。Linux の CI で基準画像を作る運用が決まったら足す。

---

## 11. リスクと対策

| # | リスク | 根拠 | 対策 |
|---|---|---|---|
| R1 | **iOS Safari がデータを消す**（7日間そのサイトを操作しないと、スクリプトが書いた保存データ＝IndexedDB・localStorage がすべて消される） | WebKit 公式「deleting all of a website's script-writable storage after seven days of Safari use without user interaction on the site」、ただしホーム画面の Web アプリは「have their own counter of days of use」（https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/） | PWA の manifest を必須にし、ホーム画面への追加を案内する（9章）。バックアップの催促。`persist()` |
| R2 | 容量の圧迫や上限で消える | WebKit 公式（Safari 17）: 容量の上限は「no guarantee that a site can store that much」。消すときは最後に操作した日時が古い順。`persist()` を許可するかは「whether the website is opened as a Home Screen Web App」などで判断する（https://webkit.org/blog/14403/updates-to-storage-policy/） | データ自体が小さい（最大でも数十MB）。`quota_exceeded` を画面に出す。書き出しを促す |
| R3 | 利用者が自分で「履歴と Web サイトデータを消去」する／端末をなくす／プライベートブラウズ（閉じると消える） | ブラウザの仕様 | 同期の仕組みは無い。**書き出したファイルだけが復旧の手段**であることを、データ管理の画面と初回の注意で明記する |
| R4 | 複数のタブで同時に書く | IndexedDB はトランザクション単位でしか守らない | `revision` による衝突の検出、change-bus での再読み込み、`versionchange` で閉じる |
| R5 | データが壊れる・移行に失敗する | | 読むたびの zod 検査、壊れた行は外して件数を出す、生データの書き出し、移行の単体テストと結合テスト、移行に失敗した行も元のまま残す |
| R6 | 悪意のある JSON を読み込む | 新しい入口 | 8.2 の検査（サイズ・件数・形・参照・重複）、全部成功か全部取り消しかの書き込み、ハッシュ CSP、`connect-src 'self'` |
| R7 | ハッシュ CSP の後処理が効かず、黙って弱まる | 3.2 | `verify-out.mjs` と E2E で CSP の状態を確かめる。【要検証】が成り立たなければ CEO の判断を仰ぐ |
| R8 | 静的書き出しで `vercel.json` のヘッダーが付かない | 未確認 | Step 0 の Preview で `curl -I` して確かめる |
| R9 | Supabase からの移行で件数や値がずれる | 12章 | 移行前後で件数を照らし合わせる、読み込みの事前確認画面、Supabase のプロジェクトは移行が確認できるまで止めない |
| R10 | `next/font/google` はビルド時にネットに接続する | v1 からの構成 | CI でも Vercel でもネットに接続できる。オフラインではビルドできないことを README に書く |
| R11 | 時計・時差のずれ | | 未来の日付は書くときだけ確かめる（日本時間で判定・v1 と同じ）。読むときは拒否しない |

---

## 12. 削除するもの・残すもの・作るもの

### 12.1 削除

| 対象 | 具体的なもの |
|---|---|
| Supabase のクライアント | `src/lib/supabase/{client,server,proxy}.ts` |
| proxy | `src/proxy.ts`（認証と nonce の両方） |
| 認証 | `src/features/auth/`、`src/app/auth/{confirm,callback}/`、`src/app/(auth)/`、`src/lib/auth/{get-user-id,next-path-cookie}.ts`、`src/lib/utils/safe-next-path.ts`、`src/lib/validation/auth.ts` |
| Server Actions と問い合わせ | `src/features/{settings,roads,drives}/{actions,queries}.ts` |
| 部品 | organisms `LoginForm`、`OtpForm`、`ConfirmLoginForm`、templates `AuthTemplate`（いずれもテストと index.ts を含む） |
| 型 | `src/types/database.types.ts` |
| CSP（nonce） | `src/lib/security/csp.ts`（+test）。`layout.tsx` の `headers()` と `nonce` |
| DB | `supabase/` ディレクトリ全体（migrations・config.toml・templates）。**12章のデータ移行が終わってから**消す。git の履歴には残る |
| テスト | 10.1 の「消すテスト」 |
| 設定 | `vitest.rls.config.ts`、`.env.example`（環境変数が無くなる）、package.json の `test:rls` |
| Vercel | 環境変数 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`NEXT_PUBLIC_SITE_URL`（Production / Preview / Development の全部）。`SUPABASE_SERVICE_ROLE_KEY` が誤って登録されていないかも確認する |
| Supabase のプロジェクト | データ移行が確認できてから一時停止にする → 30日後に削除する（CEO の承認を得てから） |
| CSP の `connect-src` | Supabase のドメイン |
| ESLint | `noData` の対象から `@/lib/supabase/*` を外す（12.4 で付け替える） |
| 文書 | `road-review-auth-password-design.md` は「取り下げ」と書いて残す。`road-review-architecture.md` の先頭に「認証・DB・CSP の章は v2 で置き換え済み」と書く |

### 12.2 残す（中身を少し直すものを含む）

- atoms すべて（Button、Input、Textarea、Label、FieldError、Spinner、Alert、RoadTypeBadge、RatingMeter）
- molecules すべて（FormField、ChoiceGroup、RatingInput、PrefectureSelect、LatLngInputs、SafetyNoticeBanner、ForestRoadNote、EmptyState、RoadListItem、RatingSummary、DriveCard、RoadInfoSummary、CollectionSummary）。リンクの URL は `lib/routes.ts` を使うように直す
- organisms: `RoadForm`・`DriveForm`（callback の props に変える）、`RoadInfoFieldset`、`PinPicker`、`RoadsMap`（リンク先を直す）、`RoadList`、`DriveList`、`SafetyNoticeDialog`（callback に変える）、`AppHeader`（ログアウトをやめ、［データ管理］へのリンクに変える。Server Component のまま）
- templates: `AppShellTemplate`、`FormPageTemplate`、`RoadsIndexTemplate`、`RoadDetailTemplate`
- lib: `constants/*`、`map/gsi-tiles.ts`、`ratings/summary.ts`、`road-info/latest.ts`、`collection/stats.ts`、`utils/{date,cn}.ts`、`validation/{common,road,drive,road-info}.ts`（record スキーマ用に部品を export する）
- Leaflet の読み込み方（`useEffect` の中で `await import('leaflet')`）、divIcon、テーマのスクリプト、フォント

### 12.3 作る — ファイル構成

```
apps/road-review/
├── next.config.ts                 # output:'export', trailingSlash:true, images.unoptimized
├── vercel.json                    # headers (CSP etc.) + redirects (/roads -> /)  ← single source
├── public/
│   ├── manifest.webmanifest       # name/short_name/start_url "/"/display "standalone"/theme_color/icons
│   ├── icons/icon-192.png, icon-512.png, apple-touch-icon.png
├── scripts/
│   ├── csp/inject-meta-csp.mjs    # postbuild: hash inline scripts -> <meta> CSP
│   ├── csp/verify-out.mjs         # CI gate
│   ├── serve-static.mjs           # zero-dep static server applying vercel.json headers (E2E)
│   └── ci/assert-no-skips.mjs
├── tests/
│   ├── setup.ts
│   ├── helpers/leaflet-mock.ts
│   ├── helpers/repository.ts      # createTestRepository() with new IDBFactory()
│   ├── fixtures/export-v1-*.json  # valid / duplicate ids / orphan drive / future version / bad field / huge
│   └── e2e/{fixtures.ts, *.spec.ts, fixtures/tile.png}
└── src/
    ├── app/
    │   ├── layout.tsx             # static; manifest + appleWebApp metadata; theme script (no nonce)
    │   ├── not-found.tsx / global-error.tsx
    │   └── (app)/
    │       ├── layout.tsx         # <AppProviders> + AppShellTemplate
    │       ├── error.tsx
    │       ├── page.tsx + PageClient.tsx                  # "/"
    │       ├── roads/new/page.tsx + PageClient.tsx
    │       ├── roads/view/page.tsx + PageClient.tsx       # ?id=
    │       ├── roads/edit/page.tsx + PageClient.tsx       # ?id=
    │       ├── drives/new/page.tsx + PageClient.tsx       # ?roadId=
    │       ├── drives/edit/page.tsx + PageClient.tsx      # ?id=
    │       └── settings/data/page.tsx + PageClient.tsx
    ├── components/{atoms,molecules,organisms,templates}/  # 12.4
    ├── features/
    │   ├── storage/{RepositoryProvider.tsx, useRepository.ts, useStorageQuery.ts, AppProviders.tsx}
    │   ├── roads/hooks.ts
    │   ├── drives/hooks.ts
    │   ├── drafts/useFormDraft.ts
    │   ├── safety/useSafetyAck.ts
    │   └── backup/useBackupReminder.ts
    └── lib/
        ├── schema/{version.ts, v1.ts, migrations.ts}
        ├── storage/{repository.ts, indexeddb-repository.ts, open-database.ts, idb-request.ts,
        │            parse-records.ts, change-bus.ts, errors.ts}
        ├── transfer/{export-file.ts, parse-import.ts, plan-import.ts, download.ts}
        ├── drafts/draft-store.ts
        ├── roads/build-road-summaries.ts
        ├── routes.ts
        ├── result.ts
        └── (constants, map, ratings, road-info, collection, utils, validation — kept)
```

テストはそれぞれの対象と同じディレクトリに `*.test.ts(x)` として置く（`.claude/rules/tests.md`）。

### 12.4 Atomic Design 対応表（v2 で追加・変更するもの）

| コンポーネント | 階層 | Server/Client | 説明 |
|---|---|---|---|
| ConfirmDialog | molecules | Client | ネイティブの `<dialog>` + 確定 / キャンセルの Button（v1 の設計にあったが未実装） |
| DraftRestoreBanner | molecules | Client | Alert + ［復元する］［破棄する］ |
| BackupReminderBanner | molecules | どちらでも | Alert + 書き出しへのリンク + 閉じる |
| StorageIssueNotice | molecules | どちらでも | 「保存できません／読み込めないデータが N 件あります」（Alert + リンク） |
| NotFoundState | molecules | どちらでも | 「見つかりません」+ 一覧へのリンク |
| FilePickerButton | molecules | Client | Label + 見えない `<input type="file">`（ボタンの見た目。キーボードで操作できる） |
| StorageUsageMeter | molecules | Client | 使用量・消えにくい設定の状態を文字で出す |
| RoadForm / DriveForm | organisms | Client | **変更**: `onSubmit` を props で受け取る。throw しない。下書きの hook は PageClient から `draft` props で渡す |
| SafetyNoticeDialog | organisms | Client | **変更**: `onAcknowledge` を props で受け取る |
| AppHeader | organisms | Server | **変更**: ログアウトをやめ［データ管理］へのリンクにする |
| DeleteConfirmButton | organisms | Client | Button + ConfirmDialog。`onConfirm` を props で受け取る（道・記録で共用） |
| DataExportPanel | organisms | Client | 件数・最後の書き出し日時・［ファイルとして保存］［共有メニューで送る］・注意文 |
| DataImportPanel | organisms | Client | FilePickerButton → 検査結果 → モード選択（置き換え / 統合）→ 事前確認の件数 → ConfirmDialog |
| StorageManagementPanel | organisms | Client | StorageUsageMeter + ［データを消えにくくする］+ 生データの書き出し + 全削除（DeleteConfirmButton） |
| SettingsPageTemplate | templates | Server | title + sections スロット（データを持たない） |

依存の向き: atoms ← molecules ← organisms ← templates は変えない（molecules どうしの import は禁止、organisms が organisms を含むのは許可。v1 の 2.2 と同じ）。**v2 では `components/**` のどの階層も `@/lib/storage/*`・`@/features/*` を import してはいけない**。保存処理に触るのは `app/**`（PageClient）と `features/**` だけ。ESLint で次のように止める。

```js
const noData = [{ group: ['@/features/*', '@/lib/storage/*', '@/lib/transfer/*', '@/lib/drafts/*'],
                  message: 'Components receive data and callbacks via props; only app/ and features/ touch storage.' }]
// atoms / molecules / organisms / templates: all get noData
```

（`lib/transfer` の純粋な型だけが必要な場合は `import type` を使う。必要なら `allowTypeImports: true` を付ける。）

### 12.5 部品の親子関係（例: 走行記録の登録）

```
app/(app)/drives/new/page.tsx            [Server, static]
└ Suspense
  └ PageClient                           [Client]  useSearchParams / useRoad / useRepository / useFormDraft
    └ FormPageTemplate                   [templates]
      ├ notice: SafetyNoticeBanner       [molecules]
      ├ notice: DraftRestoreBanner       [molecules]
      └ form: DriveForm                  [organisms]  props: road, initialValues, onSubmit, draft
           ├ RatingInput×4 / ChoiceGroup×3 / FormField+Textarea   [molecules]
           ├ RoadInfoFieldset            [organisms]
           └ Button                      [atoms]
```

---

## 13. 既存データの移行（Supabase → v2）

本番の Supabase に CEO の記録が入っているので、捨てずに移す。依存は増やさない。Supabase の SQL Editor で次の SQL を実行し、結果の JSON をファイルに保存して、v2 の読み込み画面で「置き換え」で取り込む。

```sql
-- Run once in the Supabase SQL Editor (production). Replace the owner UUID with Hiro's auth.users.id.
-- Filtering by user_id also excludes any @example.test users created by past tests (audit H4).
with owner as (select '00000000-0000-0000-0000-000000000000'::uuid as id),
road_rows as (
  select r.created_at, json_build_object(
    'id', r.id, 'name', r.name, 'prefectureCode', r.prefecture_code, 'roadType', r.road_type,
    'start', json_build_object('lat', r.start_lat, 'lng', r.start_lng),
    'end', case when r.end_lat is null then null else json_build_object('lat', r.end_lat, 'lng', r.end_lng) end,
    'createdAt', r.created_at, 'updatedAt', r.updated_at, 'revision', 1) as row_json
  from public.roads r join owner on r.user_id = owner.id
),
drive_rows as (
  select d.created_at, json_build_object(
    'id', d.id, 'roadId', d.road_id, 'drivenOn', d.driven_on,
    'vehicleType', d.vehicle_type, 'weather', d.weather,
    'ratingOverall', d.rating_overall, 'ratingScenery', d.rating_scenery,
    'ratingRoadSurface', d.rating_road_surface, 'ratingEaseOfDriving', d.rating_ease_of_driving,
    'traffic', d.traffic, 'memo', d.memo,
    'roadInfo', case when ri.drive_id is null then null else json_build_object(
      'confirmedOn', ri.confirmed_on,
      'items', json_build_object(
        'motorcycleBan', json_build_object('status', ri.motorcycle_ban, 'memo', ri.motorcycle_ban_memo),
        'nightClosure',  json_build_object('status', ri.night_closure,  'memo', ri.night_closure_memo),
        'winterClosure', json_build_object('status', ri.winter_closure, 'memo', ri.winter_closure_memo),
        'toll',          json_build_object('status', ri.toll,           'memo', ri.toll_memo),
        'parking',       json_build_object('status', ri.parking,        'memo', ri.parking_memo),
        'toilet',        json_build_object('status', ri.toilet,         'memo', ri.toilet_memo),
        'michiNoEki',    json_build_object('status', ri.michi_no_eki,   'memo', ri.michi_no_eki_memo),
        'observatory',   json_build_object('status', ri.observatory,    'memo', ri.observatory_memo))) end,
    'createdAt', d.created_at, 'updatedAt', d.updated_at, 'revision', 1) as row_json
  from public.drives d join owner on d.user_id = owner.id
  left join public.road_info ri on ri.drive_id = d.id
)
select json_build_object(
  'app', 'road-review', 'schemaVersion', 1, 'exportedAt', now(), 'appVersion', 'supabase-migration',
  'data', json_build_object(
    'roads',  coalesce((select json_agg(row_json order by created_at) from road_rows),  '[]'::json),
    'drives', coalesce((select json_agg(row_json order by created_at) from drive_rows), '[]'::json))
) as export_json;
```

- 列の名前は `00003_roads.sql`・`00004_drives_road_info.sql`・`features/drives/queries.ts:20-26` から取った。backend-developer が実行する前に、もう一度マイグレーションと照らし合わせる。
- 確認の手順: SQL で `select count(*)` を取った件数と、読み込み画面の事前確認に出る件数が合うこと → 取り込み → 一覧の件数と、道1件分の詳細を目で見て確かめる → v2 で書き出したファイルを CEO の手元の別の場所にも保存する → その後で Supabase を一時停止する。
- `timestamptz` は `+00:00` 形式でマイクロ秒まで出る。取り込むときに `toISOString()` で正規化する（8.2）。そのため、record スキーマは `z.iso.datetime({ offset: true })` で受け付ける。

---

## 14. CI ワークフロー案（`.github/workflows/road-review-ci.yml`、担当: devops-engineer）

```yaml
name: road-review CI
on:
  pull_request:
    paths: ['apps/road-review/**', '.github/workflows/road-review-ci.yml']
  push:
    branches: [main]
    paths: ['apps/road-review/**', '.github/workflows/road-review-ci.yml']
permissions:
  contents: read
concurrency:
  group: road-review-ci-${{ github.ref }}
  cancel-in-progress: true
defaults:
  run:
    working-directory: apps/road-review
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<same pinned SHA as supply-chain-security.yml>
      - uses: pnpm/action-setup@<pinned SHA>        # version 10.29.2
      - uses: actions/setup-node@<pinned SHA>       # node 22, cache: pnpm, cache-dependency-path: apps/road-review/pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile --ignore-scripts
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test:ci                            # vitest run + json report
      - run: node scripts/ci/assert-no-skips.mjs reports/vitest.json
      - run: pnpm build                              # next build && inject-meta-csp
      - run: node scripts/csp/verify-out.mjs out
      - uses: actions/upload-artifact@<pinned SHA>   # name: out
  e2e:
    needs: verify
    runs-on: ubuntu-latest
    steps:
      - checkout / pnpm / node / install (same as above)
      - uses: actions/download-artifact@<pinned SHA> # out
      - run: pnpm exec playwright install --with-deps chromium webkit
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@<pinned SHA>   # if: always(); playwright-report + test-results (screenshots)
```

- アクションは、既にある `supply-chain-security.yml` と同じ形で SHA を固定する（shai-hulud 対策）。`run:` に外から来た値（PR のタイトルなど）を直接埋め込まない。
- `--ignore-scripts` で Next の SWC・esbuild が動くかは、Step 0 で確かめる（【要検証】。動かない場合は、許可が必要な依存を `onlyBuiltDependencies` に入れる案を supply-chain-auditor と一緒に決める）。
- **main のブランチ保護で「verify」と「e2e」を必須のチェックにする**（設定は CEO の承認を得てから）。
- Vercel: **Git 連携をつなぐ**（Root Directory `apps/road-review`、Framework Next.js、Production Branch `main`）。PR ごとに Preview が作られ、本番には main からしか出ない（監査 H6 の解決）。

---

## 15. 実装の順番（TDD: 失敗するテストを先に書く → 通す → 整理する）

各ステップは「test-writer が失敗するテスト（Red）→ frontend-developer / backend-developer が通す（Green）→ 整理（Refactor）→ code-reviewer」の順に進める。CI ができてからは、各ステップの PR が CI で緑になることを完了の条件にする。

| Step | 内容 | 主な担当 | 完了の条件 |
|---|---|---|---|
| 0 | **確認の試作（spike）と ADR**: 小さな枝で `output:'export'` + `vercel.json` + 後処理の meta CSP を Vercel の Preview に出し、`curl -I` と DevTools で 3.2 の【要検証】(a)(b) を確かめる。fake-indexeddb を jsdom / node で動かす。`--ignore-scripts` でビルドできるか確かめる | devops-engineer / frontend-developer | 結果を記録する。成り立たなければ CEO に判断を仰ぐ |
| 1 | **CI の骨組み**（14章。最初は今のコードで lint・型・単体・ビルドを回す）+ `assert-no-skips` | devops-engineer | PR で CI が回る |
| 2 | **スキーマ**: `lib/schema/{version,v1,migrations}.ts`、validation から部品を export する | test-writer → backend-developer | ①のテストが緑 |
| 3 | **純粋なドメイン関数**: `build-road-summaries`、`export-file`、`parse-import`、`plan-import`（重複・孤立・バージョン・上限・BOM・壊れた JSON・往復） | test-writer → backend-developer | ①が緑。v1 の road_summaries と同じ並び順・同じ集計 |
| 4 | **保存層**: `idb-request`、`open-database`（upgrade・versionchange）、`indexeddb-repository`（CRUD・連鎖削除・上限・revision・壊れた行・取り込みが全部成功か全部取り消しか）、`change-bus` | test-writer → backend-developer | ②が緑（fake-indexeddb） |
| 5 | **React との接続**: `RepositoryProvider`、`useStorageQuery`、各 hook、`tests/helpers/repository.ts` | frontend-developer | ③の hook テストが緑 |
| 6 | **静的書き出しへの切り替え**: `next.config`（export）、新しいルート + PageClient、`lib/routes.ts`、組織を callback の形に変える、`AppHeader` / `SafetyNoticeDialog` の変更、**古いルート・`features/*/{actions,queries}`・proxy・auth を同じ PR で消す**、`layout.tsx` から `headers()` と nonce を消す | frontend-developer（+ test-writer がページのテストを書き直す） | `pnpm build` が通り、`out/` ができる。③が緑 |
| 7 | **CSP**: `vercel.json`、`inject-meta-csp.mjs`、`verify-out.mjs`、`serve-static.mjs`、`next-config.test.ts` の書き直し | devops-engineer / frontend-developer | ⑤が緑。ローカルの静的サーバーで CSP 違反が0件 |
| 8 | **フォームの失敗時の扱いと下書き**: try/catch、`draft-store`、`useFormDraft`、`DraftRestoreBanner` | test-writer → frontend-developer | 「保存が失敗しても入力が残る」「再読み込みしても戻せる」のテストが緑 |
| 9 | **削除**: `ConfirmDialog`、`DeleteConfirmButton`、道の連鎖削除・記録の削除の画面 | 同上 | |
| 10 | **書き出し・読み込み・データ管理**: `/settings/data`、3つの Panel、`persist()`、使用量、バックアップの催促 | 同上 | 往復の E2E が緑 |
| 11 | **E2E 一式 + CI の e2e ジョブ**（10.2）。外への通信0件・CSP 違反0件・4つの project・スクリーンショットの成果物 | test-writer / devops-engineer | CI の e2e が緑・スキップ0件 |
| 12 | **依存と設定の掃除**: `pnpm remove @supabase/ssr @supabase/supabase-js server-only supabase`、`pnpm add -D fake-indexeddb`（Step 4 の前に入れてよい）、`.env.example` と `vitest.rls.config.ts` を消す、ESLint の `noData` を付け替える → **supply-chain-auditor の監査** | devops-engineer / supply-chain-auditor | 監査に通る |
| 13 | **PWA の manifest + アイコン**、`appleWebApp` の metadata、ホーム画面への追加の案内 | frontend-developer | iPhone（WebKit）の E2E で manifest が読まれる |
| 14 | **データ移行と公開**: 13章の SQL → 取り込み → 照らし合わせ → Vercel の Git 連携・環境変数の削除 → main にマージ → 本番で確かめる → Supabase を一時停止 → 30日後に `supabase/` を消す | backend-developer / devops-engineer（各段階で CEO の承認） | 件数が一致し、本番で操作を1回確かめた記録がある |
| 15 | **文書**: アプリの README、ルートの README のアプリ一覧・技術スタック、v1 設計書への注記 | content-creator / CTO | ドキュメント管理ルールの表に沿っている |

（任意・Phase 2）**Service Worker**: 手書きの `public/sw.js`。`/_next/static` はキャッシュを優先し、HTML はネットワークを優先して、つながらなければキャッシュを使う。キャッシュ名にビルド ID を入れる。新しい版があれば「更新があります［再読み込み］」と出す。Next の PWA ガイドにある `sw.js` 用のヘッダーを `vercel.json` に足す。山道で電波が無いときにアプリを起動できるようになるが、古い版が残る事故の恐れもあるので、CEO に判断してもらう。

---

## 16. CEO / CPO に決めてもらうこと

1. **静的書き出しと、クエリの URL（`/roads/view/?id=`）でよいか**（3・4章）。Step 0 の【要検証】が成り立たなかったときに、B（`'unsafe-inline'`）で一時的に出してよいか、A に戻すか。
2. **Supabase の既存データを移すか**。移すなら、プロジェクトを一時停止・削除するタイミング（13章）。
3. **上限の値**: 道 500件、走行記録 5,000件、読み込みファイル 64MiB（5.1・8.2）。
4. **統合のときの衝突の扱い**: 「更新日時が新しい方を残す。同じならローカル」でよいか（8.2）。
5. **Service Worker（オフラインでの起動）を Phase 2 でやるか**（15章）。
6. **main のブランチ保護に CI の必須チェックを足すか**（14章）。

---

## 付録: 主な出典

- Next.js 16（ローカルの docs）: `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`（Supported/Unsupported Features、Browser APIs）、`content-security-policy.md:385-539`（nonce と動的描画・Without Nonces・SRI）、`progressive-web-apps.md`、`offline-support.md:139`（フルリロードでのオフラインは Service Worker が必要）、`03-api-reference/04-functions/use-search-params.md:180-184`
- WebKit: Full Third-Party Cookie Blocking and More（7日間の上限・ホーム画面アプリの例外）https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/ ／ Updates to Storage Policy（Safari 17 の容量・削除・persist）https://webkit.org/blog/14403/updates-to-storage-policy/
- npm registry（2026-10-08 に確認）: https://registry.npmjs.org/fake-indexeddb/latest 、https://registry.npmjs.org/idb/latest
- 監査: `docs/org/research/06-web-dev-lifecycle-and-audit.md`（B-H3、B-H5、B-H6、B-M1、B-M2、B-M7、B-M9、L5）
