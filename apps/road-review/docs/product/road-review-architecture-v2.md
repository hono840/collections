# 公道レビュー（road-review）アーキテクチャ設計書 v2 — ログインなし・端末内保存版

- ステータス: 設計案 v2.0（code-architect 作成 → CTO レビュー待ち → CEO 承認待ち）
- 保存先: `apps/road-review/docs/product/road-review-architecture-v2.md`
- 置き換えるもの: `road-review-architecture.md`（v1.1 と 15〜22章の追記）のうち、認証・DB・RLS・Storage・Server Actions・proxy・CSP（nonce）・テスト基盤の章。~~画面仕様・入力項目・文言・Atomic Design の部品は v1 をそのまま使う~~ → **取り消し（v2-review 反映）**: 画面仕様・入力項目・文言は `road-review-prd-v2.md`（PRD）と `road-review-design-spec-v2.md`（DS）が正。v1 の画面仕様は使わない。
- **（v2-review 反映）** 合同レビュー `road-review-v2-review.md`（CPO + CTO、2026-10-08）6章の「ARCH に入れる直し」と、同ファイル末尾の「CEO決定（2026-10-08）」を反映した。直した節の見出しに「（v2-review 反映）」を付けた。文中の `C-xx` はレビュー 1章のくい違い番号。文書の優先順位は「レビューの決定 ＞ PRD ＞ DS ＞ この ARCH」。実装の順番の正はレビュー 3章（17段階）
- 前提にした事実（2026-10-08 にこのリポジトリと一次資料で確認）
  - 現在のコード: `src/proxy.ts`（nonce 付き CSP + Supabase のセッション更新）、`src/app/layout.tsx:62-63`（`headers()` を読むので全ページが動的描画）、`src/features/{auth,settings,roads,drives}`（Server Actions と問い合わせ）、`src/lib/supabase/*`、`supabase/migrations/00001〜00004`、`tests/rls/*`
  - **写真機能はまだ作られていない**（`PhotoUploader` も `photos` テーブルも無い）。今回の「写真なし」で消すものは無い
  - 監査 `docs/org/research/06-web-dev-lifecycle-and-audit.md` の指摘: B-M1（通信が切れると DriveForm の入力が消える）、B-M7（モックが多い・実装の手順をなぞるテスト）、B-H3（CI が無い）、B-H5（データの書き出しが無い）、B-M9（E2E が開発サーバーで動いている）
- CEO の決定（この設計では変えない）: ログインしない／データはブラウザの中だけに置く／JSON で書き出し・読み込みができる／写真は扱わない／Vercel に置く／スマホを先に考える（モバイルファースト）。v1 から続く決定（GPS を使わない、速度・タイム・ランキングを持たない、道の種別は5つ）もそのまま守る

---

## 0. 要点（先に結論）（v2-review 反映）

1. **`output: 'export'`（静的書き出し）にする。** サーバーで動くコードを無くす。proxy・nonce・Server Actions・Supabase をすべて削る。Next.js のサーバー側の脆弱性（v1 で RCE 修正のため版を上げたもの）の影響を受けなくなる。サーバーが無いので、そもそも攻撃される入口が無い。
2. **URL は `/roads/view/?id=...` のようにクエリ（`?` の後ろ）で表す。** 静的書き出しでは、ビルドの時点で分からない ID を使った `/roads/[roadId]` は作れない（公式 docs「Unsupported Features」）。
3. **CSP（ブラウザに「このサイトはどこのスクリプトを動かしてよいか」を伝える決まり）は2段構えにする。** ① `vercel.json` で全ページ共通のヘッダーを付ける。② ビルドの後にスクリプトが HTML を読み、ページの中に直接書かれたスクリプト（インラインスクリプト）の SHA-256 ハッシュ（中身から計算する指紋）を `<meta http-equiv="Content-Security-Policy">` として各 HTML に入れる。これで nonce を使わなくても、`'unsafe-inline'`（ページ内のスクリプトを何でも動かしてよい設定）と同じ弱さにならない。
4. **保存先は IndexedDB（ブラウザ内のデータベース）。ライブラリは足さない。** 画面は IndexedDB に直接触らない。`RoadReviewRepository`（保存係のインターフェース）を通す。読み込むときは毎回 zod で中身を確かめ、壊れた行は表示から外して件数だけ知らせる。同時編集の検出（revision）・タブ間の通知（change-bus / BroadcastChannel）は作らず、画面に戻ったとき（`visibilitychange`）に読み直すだけにする（C-23）。
5. **下書きは localStorage（ブラウザ内の小さな保存場所）に自動で保存し、フォームを開いたら自動で戻す。** 理由: localStorage は同期的に書けるので、ページを閉じる瞬間（`pagehide`）でも書き終わる。保存に失敗しても入力は消えない（監査 B-M1 の解決）。キャンセルしても下書きは残す（C-04, C-05）。
6. **JSON 書き出しは `{ app, schemaVersion, exportedAt, appVersion, counts, data }` の形にする。** 読み込みは **「置き換え」だけ**（「統合（合わせる）」は後回し。C-26、CEO決定 2026-10-08 1）。ファイル全体を先に確かめ、1つのトランザクション（全部成功するか、全部取り消すかの処理単位）で書く。途中まで書かれた状態は残らない。
7. **iOS で消えにくくするため、PWA（ホーム画面に追加できる Web アプリ）用の manifest を必須にする。** WebKit 公式は「ホーム画面の Web アプリは独自に日数を数える」「`persist()` を許可するかはホーム画面アプリかどうか等で決める」と書いている（11章）。
8. **追加する依存は devDependency の `fake-indexeddb`（`6.2.5` に固定）と `@axe-core/playwright` の2つ。** 本番の依存は増えない（むしろ `@supabase/*`、`server-only`、`supabase` の4つが減る）。どちらも入れる前に supply-chain-auditor の監査を通す。
9. **CI（コードを出すたびに機械が自動で確かめる仕組み）を新しく作る。** lint・型・単体テスト・ビルド・CSP 検証・E2E（iPhone 相当の WebKit 390×844 と Chromium 360×640 のスマホ画面）を回す。スキップされたテストが1件でもあれば失敗にする。
10. **Vercel は「ただのファイルを配る」設定にする。** `vercel.json` に `"framework": null`・`"buildCommand": "pnpm build"`・`"outputDirectory": "out"` を書き、できあがった `out/` をそのまま配る（C-34。3.3）。**ハッシュ CSP が Vercel で効くと確かめるまで公開しない**（`'unsafe-inline'` での一時公開もしない。CEO決定 2026-10-08 2）。
11. **Supabase からのデータ移行はしない。** v1 のデータは捨てる（PRD 9.1。C-30）。旧 13章の移行 SQL は削除した。

---

## 1. 全体像（v2-review 反映）

```
┌──── Vercel（framework: null。out/ をそのまま配るだけ・関数なし） ────┐
│  out/ (HTML/JS/CSS/フォント)  +  vercel.json のセキュリティヘッダー   │
└───────────────────────────────┬────────────────────────────────────┘
                                │ 初回だけ HTML/JS を取得
┌───────────────────────────────▼──────────── ブラウザ ───────────────┐
│ app/**/page.tsx (静的な枠)                                           │
│   └ PageClient.tsx ('use client') ── hooks ──► RoadReviewRepository  │
│        │ props / callbacks                      │  (lib/storage)     │
│        ▼                                        └─► IndexedDB "road-review"
│   templates ◄ organisms ◄ molecules ◄ atoms           roads / drives │
│        │                         （visibilitychange で読み直す）     │
│        └ useFormDraft ──► localStorage (rr-draft:*)                  │
│   RoadMiniMap/PinPicker ──► 地理院タイル https://cyberjapandata.gsi.go.jp（画像だけ）
│   書き出し: Blob → ダウンロード   読み込み（置き換え）: <input type=file>
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

### 2.3 追加する依存（2つ。どちらも devDependency）（v2-review 反映）

| パッケージ | 区分 | 理由 | 確認した事実（npm registry、2026-10-08） |
|---|---|---|---|
| `fake-indexeddb` `6.2.5`（`pnpm add -D fake-indexeddb@6.2.5` で版を固定。レビュー 2.4） | devDependencies | Node/jsdom でテストするとき、IndexedDB を本物どおりの API で動かすため。保存係（repository）を手作りのモックではなく本物の API の上でテストできる（監査 B-M7 への対策） | 最新 6.2.5、Apache-2.0、実行時の依存なし、install/postinstall スクリプトなし、engines `node >=18`、メンテナは1人（dumbmatter） |

- メンテナが1人なのはリスク。ただし devDependency なので利用者のブラウザには届かない。cooldown（7日）も効く。導入時に supply-chain-auditor の監査（Socket `depscore` を含む）を必ず通す。
- **`idb`（8.0.4、ISC、依存なし、スクリプトなし）は採用しない。** 利用者のブラウザに届く本番の依存が1つ増えるため。このアプリで必要なのは「リクエストを Promise にする」「トランザクションの完了を待つ」の2つだけで、`lib/storage/idb-request.ts`（約60行）で書ける。依存を最小にする方針（rules/dependencies.md）を優先する。
- **`@axe-core/playwright`（a11y の自動検査）は入れる**（v2-review 反映。PRD 11章・14章の完了の定義が「axe の重大・深刻0件」を必須にしているため。レビュー 2.5）。版と公開日・スクリプトの有無は、入れるときに supply-chain-auditor が npm registry と Socket の `depscore` で確かめる【未確認】。
- 任意（今回は入れない。必要になったら監査を通して足す）: `@vitest/coverage-v8`（カバレッジ計測）。
- Socket の供給網スコアは、`fake-indexeddb` についても【未確認】（レビュー 2.4）。入れる前に確かめる（`guard-install.mjs` が 20 未満なら自動で止める）。

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

### 3.2 採用: C（v2-review 反映）

- **A を捨てる理由**: データがすべてブラウザ内にあるので、サーバーで描画しても空の枠しか作れない。それなのに毎回 Vercel の関数が動き、Next サーバーの脆弱性の影響も受ける。山道で電波が弱いときも、毎回サーバーに取りに行く形は相性が悪い。
- **B を捨てる理由**: App Router の HTML には、Next が書き込むページ内スクリプト（`self.__next_f.push(...)` という RSC データ）が入る。これを許すために `script-src 'unsafe-inline'` にすると、XSS（他人のスクリプトを紛れ込ませる攻撃）が起きたときに防げない。今回は「他人が作った JSON を読み込む」という新しい入口ができるので（8章）、守りを弱めない。
- **D を捨てる理由**: 公式が Experimental と書いている。ページ内スクリプトを守れるかどうかも docs からは確かめられない。
- **C の仕組み**
  1. `vercel.json` の `headers` で、全ページに共通の CSP と他のセキュリティヘッダーを付ける（静的書き出しでは `next.config` の `headers()` が使えないため。公式の Unsupported Features）。
  2. `pnpm build` = `next build && node scripts/csp/inject-meta-csp.mjs`。後処理スクリプトは `out/**/*.html` を読み、`src` 属性の無い `<script>` の中身ごとに `sha256-<base64>` を計算する。そして `<head>` の**最初の子要素**として `<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'sha256-…' …">` を入れる。
  3. ブラウザは、ヘッダーの CSP と meta の CSP の**両方**を満たすものだけを動かす（ポリシーが複数あると、全部の条件を満たす必要がある）。ヘッダー側は `script-src 'self' 'unsafe-inline'` で緩い。meta 側がハッシュで締める。結果として、ハッシュが合うページ内スクリプトと、自分のドメインの JS だけが動く。
  4. meta CSP では `frame-ancestors` が効かない（仕様）。だからヘッダー側に置く。
- **失敗したときの検知**: 後処理が meta を入れ損ねると、ヘッダーだけ（＝B 相当）に黙って弱まる。これを防ぐため `scripts/csp/verify-out.mjs` を CI で実行する。全 HTML について「meta CSP が `<head>` の最初にある」「すべてのページ内スクリプトのハッシュが入っている」「`'unsafe-inline'` と `'unsafe-eval'` が meta 側に無い」を確かめ、1つでも外れたら失敗にする。E2E でも `securitypolicyviolation`（CSP 違反のイベント）が0件であることを確かめる（10章）。
- **【要検証・Step 0 で確かめる】**: (a) 後処理した `out/` が、そのまま Vercel から配られるか。Next.js 用の自動の組み立て（Framework Preset: Next.js）を通さず、`vercel.json` に `"framework": null`・`"buildCommand": "pnpm build"`・`"outputDirectory": "out"` を書いて**ただのファイルとして配る**形で試す（C-34。後から書き換えた HTML がそのまま届くはず【推論・要検証】）。Preview で `curl` して全ページの meta CSP を確認する。(b) `vercel.json` の `headers` が付くか（`curl -I` で `frame-ancestors 'none'` と HSTS を確認する）。(c) 開発モード（`next dev`）では CSP がかからないので、CSP を確かめるのは「ビルドした `out/` を静的サーバーで配った E2E」だけで行う。結果は `docs/product/road-review-adr-static-export.md` に記録する。
- **(a)(b) が成り立たないとき（CEO決定 2026-10-08 2）**: **効くまで公開しない。** B（`'unsafe-inline'`）での一時公開もしない。CEO に報告して止める。

### 3.3 CSP の中身と `vercel.json`（v2-review 反映）

`vercel.json`（正はこのファイル1つ。テスト・ローカルの静的サーバー・検証スクリプトはここを読む）の骨組み:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "buildCommand": "pnpm build",
  "outputDirectory": "out",
  "redirects": [
    { "source": "/roads", "destination": "/", "permanent": false }
  ],
  "headers": [
    { "source": "/(.*)", "headers": [ { "key": "Content-Security-Policy", "value": "…下の内容…" } ] }
  ]
}
```

- `"framework": null` は「Next.js 用の自動の組み立てを使わない」という意味。`buildCommand` の `pnpm build`（= `next build && node scripts/csp/inject-meta-csp.mjs`）が作った `out/` を、`outputDirectory` としてそのまま配る（C-34）。Vercel のプロジェクト設定の Framework Preset も「Other」にそろえる（14章）。
- `$schema` の URL と、`framework: null` の正確な効き方は Step 0 で Vercel の公式 docs と Preview の動きで確かめる【未確認】。

ヘッダーの CSP:

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

- 色テーマ用のページ内スクリプト（`layout.tsx` の themeScript）は**消す**（v2-review 反映。C-09: MVP はライト表示だけ）。ハッシュが1つ減る。残る Next.js のページ内スクリプトのハッシュは後処理が自動で入れる。`nonce` 属性と `headers()` は消す。
- `worker-src 'self'` は将来のサービスワーカー用。v2 ではサービスワーカーを入れない（C-32）が、残しても害はない。
- `'strict-dynamic'` は使わない（JS はすべて自分のドメインから読むので要らない）。
- Trusted Types（`require-trusted-types-for 'script'`）は今回は入れない。Leaflet が出典表示で innerHTML を使っていて（`lib/map/gsi-tiles.ts:10`）、壊れる恐れがあるため。将来の課題にする。

---

## 4. ルーティング（App Router + 静的書き出し）

### 4.1 URL の対応表（v2-review 反映）

この表を採用する（C-33）。データ画面は `/data/` に短くした（画面名「データ」に合わせる）。一覧の地図表示は後回し（C-21）なので、ホームはリストだけ。ホームの絞り込み・並び替えの条件は `/?type=pass&pref=20&sort=rating` のようにクエリに残す（C-19）。

| 画面 | v1 の URL | v2 の URL | 静的ファイル |
|---|---|---|---|
| 道の一覧（リスト。上部にまとめ） | `/roads` | `/` | `out/index.html` |
| 道の登録 | `/roads/new` | `/roads/new/` | `out/roads/new/index.html` |
| 道の詳細 | `/roads/[roadId]` | `/roads/view/?id={roadId}` | `out/roads/view/index.html` |
| 道の編集 | `/roads/[roadId]/edit` | `/roads/edit/?id={roadId}` | |
| 走行記録の登録 | `/roads/[roadId]/drives/new` | `/drives/new/?roadId={roadId}` | |
| 走行記録の編集 | `/roads/[roadId]/drives/[driveId]/edit` | `/drives/edit/?id={driveId}` | 道の ID は記録から分かる |
| データ（書き出し・読み込み・保存状態・全削除・つかったきろく） | なし | `/data/` | `out/data/index.html` |
| 404 | | `not-found.tsx` | `out/404.html` |
| ログイン・`/auth/*` | あり | **削除** | |

- `next.config.ts`: `output: 'export'`、`trailingSlash: true`（`/roads/view/index.html` の形で出力される。どの静的サーバーでも同じように配れる）、`images: { unoptimized: true }`（そのまま）。
- 古い URL の `/roads` は、`vercel.json` の `redirects` で `/` に送る（`permanent: false`）。v1 の `/roads/<uuid>` は少人数しか使っていないので、転送しない（404 になる）。
- URL を組み立てる処理は `src/lib/routes.ts` の1か所に集める（`roadViewHref(id)` など）。`RoadsMap.tsx:47` の `/roads/${road.id}` は、一覧の地図が後回しになったので `RoadsMap` ごと使わなくなる（詳細の小さな地図 `RoadMiniMap` はリンクを持たない。v2-review 反映）。ID は zod で UUID だと確かめたものだけを入れる。

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

### 5.1 保存するレコード（schemaVersion 1）（v2-review 反映）

道の情報（road_info）は走行記録に**埋め込む**（1対1の関係なので、別の保存場所にしない。C-14 で PRD もこの形に決定）。こうすると1回の `put` で書き終わるので、v1 の「drives だけ更新されて road_info が失敗する」半端な保存（監査 B-M2）が構造上起きなくなる。

レビューでの変更（C-11〜C-16, C-23, C-30）: 場所は `location` 1つで null 可（旧 `start` は必須だった）／終了ピン `end` を削除／車両種別 `vehicleType`・天候 `weather` を削除（CEO決定 2026-10-08 1）／`helpfulNote` を追加／同時編集の検出をやめたので `revision` を削除。列挙の名前（`forest`・`few`・`many` など）は今のコードのまま（C-15）。

```ts
// src/lib/schema/v1.ts  (types are z.output of the schemas below)
type RoadRecordV1 = {
  id: string              // crypto.randomUUID()
  name: string            // 1..50, trimmed, no control/bidi chars (roadNameSchema)
  prefectureCode: number  // 1..47
  roadType: 'pass' | 'skyline' | 'coastal' | 'forest' | 'other'   // required, no default (C-07)
  location: { lat: number; lng: number } | null  // optional single pin; Japan bounds, 6 decimals
  createdAt: string       // ISO 8601, UTC "Z" form as written by the app
  updatedAt: string
}

type DriveRecordV1 = {
  id: string
  roadId: string
  drivenOn: string        // YYYY-MM-DD, >= 2000-01-01 (future check only on write)
  ratingOverall: number   // 1..5
  ratingScenery: number | null
  ratingRoadSurface: number | null
  ratingEaseOfDriving: number | null
  traffic: 'few' | 'normal' | 'many' | null
  memo: string            // <= 2000
  helpfulNote: string     // <= 200, optional answer for Gate 1 ("" when unanswered)
  roadInfo: {
    confirmedOn: string   // YYYY-MM-DD; defaults to drivenOn on write (was a DB trigger in v1)
    items: Record<RoadInfoItem, { status: Status | null; memo: string /* <= 200 */ }>
  } | null
  createdAt: string
  updatedAt: string
}
```

- 入力の決まり（文字数・列挙値・日本の範囲・評価 1〜5）は、今の `lib/validation/{road,drive,road-info,common}.ts` から部品を取り出して**同じものを使う**。たとえば `roadNameSchema`、`latLngSchema`、`ratingSchema`、`ROAD_TYPES` などを export して共有する。
- 「未来の日付は禁止」は**書き込むときだけ**確かめる（フォームの入力スキーマ）。読み込むとき・取り込むときは確かめない（時計のずれや時差で、保存済みのデータが急に「壊れた」扱いになるのを防ぐ）。
- `createdAt` / `updatedAt` は記録を管理するための時刻で、走行の時刻ではない（v1 の決定どおり）。
- **件数の上限**（v2-review 反映。C-18 で決定）: 道 500件（v1 の DB トリガーと同じ）、走行記録は全体で 5,000件。性能の目安は PRD の「道 500・記録 3,000」で測る。
- 道の情報の「最新の値」は、同じ道の走行記録のうち `roadInfo.confirmedOn` が一番新しいもの（同じ日なら `createdAt` が新しいもの）から項目ごとに計算する。今ある `lib/road-info/latest.ts` を使う（C-14）。

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

### 5.4 読み込むたびの検査（壊れたデータの扱い）（v2-review 反映）

```ts
// src/lib/storage/parse-records.ts
export type Parsed<T> = { items: T[]; invalid: { id: string | null; issues: string[] }[] }
export function parseRecords<T>(schema: z.ZodType<T>, rawRecords: unknown[]): Parsed<T>
```

- 一覧・詳細・書き出しのどれでも、IndexedDB から読んだ値は必ず zod の `safeParse` を通す。
- 壊れた行は**表示から外す**。画面の上には「読み込めないデータが N 件あります」と件数だけ出す。黙って捨てたり、自動で消したりはしない。
- ~~「調査用に、壊れたデータも含めてそのまま書き出す」ボタン~~ → **作らない**（C-31。1人用の MVP では使う場面がほぼない。壊れたデータが実際に出たら戻す）。
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

### 6.2 インターフェース（UI が知ってよいのはこれだけ）（v2-review 反映）

レビューでの変更: `conflict`・`expectedRevision`・`changeBus` を削除（C-23）。読み込みは置き換えだけなので、`planImport` / `applyImport` を `replaceAll` 1つにまとめ、確認画面の「この端末の件数」用に `countAll` を足した（C-26。名前は実装時に code-architect が決めてよい）。`rawDump` を削除（C-31）。

```ts
// src/lib/storage/repository.ts
export type StorageErrorCode =
  | 'unavailable'      // IndexedDB cannot be opened (disabled / blocked)
  | 'quota_exceeded'
  | 'not_found'
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
  updateRoad(id: string, values: RoadValues): Promise<StorageResult<Road>>
  deleteRoad(id: string): Promise<StorageResult<{ deletedDrives: number }>> // cascades in one tx
  listDrives(roadId: string): Promise<StorageResult<Parsed<DriveWithRoadInfo>>>
  getDrive(id: string): Promise<StorageResult<DriveWithRoadInfo | null>>
  createDrive(roadId: string, values: DriveValues): Promise<StorageResult<DriveWithRoadInfo>>
  updateDrive(id: string, values: DriveValues): Promise<StorageResult<DriveWithRoadInfo>>
  deleteDrive(id: string): Promise<StorageResult<void>>
  countAll(): Promise<StorageResult<{ roads: number; drives: number }>> // for the replace confirmation
  exportSnapshot(): Promise<StorageResult<ExportFileV1>>
  replaceAll(file: ValidatedImport): Promise<StorageResult<ImportReport>>  // one readwrite tx: clear + put
  clearAll(): Promise<StorageResult<void>>
}

export function createIndexedDbRepository(deps: {
  indexedDB: IDBFactory             // window.indexedDB in the app, new FDBFactory() in tests
  now?: () => Date
  randomUUID?: () => string
}): RoadReviewRepository
```

- **必ず結果の値を返し、throw しない。** IndexedDB の `QuotaExceededError` は `quota_exceeded` に、`InvalidStateError` や `VersionError` は `version_changed` に変換する。フォームは結果を見てエラーを表示し、入力は残す。
- **同時編集**（C-23）: 版番号での衝突の検出はしない。2つのタブで同じ記録を編集したら、後から保存したほうが残る（PRD US-19）。
- **件数の上限**: `createRoad` と `createDrive` は、同じトランザクションの中で `count()` を取ってから追加する。
- **削除の連鎖**: `deleteRoad` は `[roads, drives]` の readwrite トランザクションで、`byRoadId` の範囲の記録をすべて消してから道を消す。全部成功するか、全部取り消されるかのどちらかになる。消した後、その道に関係する下書きも消す。
- **依存の差し込み（DI）**: `indexedDB`・`now`・`randomUUID` を外から渡せるようにする。テストでは `new IDBFactory()`（fake-indexeddb）を毎回新しく渡して、テスト同士が影響し合わないようにする。
- 内部の補助関数: `lib/storage/idb-request.ts`（`requestToPromise`、`transactionDone`）、`lib/storage/open-database.ts`（`upgradeneeded` で移行を流す・`versionchange` で閉じる・`blocked` を処理する）。

### 6.3 React からの使い方（v2-review 反映）

- `src/features/storage/RepositoryProvider.tsx`（'use client'）: 最初に描画されたときに、ブラウザの中でだけ repository を作って context で配る。テストでは `repository` を props で差し込む。
- `src/features/storage/useStorageQuery.ts`: `{ status: 'loading' | 'ready' | 'error', data, error }` を返す小さな hook。画面が見えるようになったとき（`visibilitychange` で visible）と、同じタブで書き込んだ後（書き込み用の hook が `refetch` を呼ぶ）に読み直す。SWR などのライブラリは入れない。読み込みが 0.2秒未満で終わったときは読み込み中の表示を出さない（C-39。部品の受入条件）。
- `src/features/roads/hooks.ts`（`useRoadSummaries`、`useRoad`）、`src/features/drives/hooks.ts`（`useDrives`、`useDrive`）、`src/features/storage/useRepository.ts`（書き込み用）。
- ~~`src/lib/storage/change-bus.ts`（`EventTarget` + `BroadcastChannel` でタブ間に変更を知らせる）~~ → **作らない**（C-23）。
- 別のタブで DB のバージョンが上がったとき: `db.onversionchange` で DB を閉じ、`StorageStatusBanner` に「アプリが更新されました。再読み込みしてください」と出す。

---

## 7. フォーム・下書き・エラー時の入力保持

### 7.1 方針（監査 B-M1 の解決）

1. 組織（organisms）の `RoadForm` / `DriveForm` は **保存先を知らない**。`onSubmit(values) => Promise<StorageResult<…>>` を props で受け取る。Server Action の import（`DriveForm.tsx:15`）は消す。
2. 送信の処理は `try/catch` で包み、`startTransition` の中で throw しない。失敗はフォームの上の要約（Alert）に出し、入力値の state はそのまま残す。
3. 入力値は自動で下書きに保存する（7.2）。タブが落ちても、ページを再読み込みしても戻せる。

### 7.2 下書きの自動保存（v2-review 反映）

レビューでの変更（C-04, C-05, C-23）: 下書きは**自動で戻す**／キャンセル・戻るでは**消さない**／`baseRevision` と編集の衝突の注記は削除。

| 項目 | 決定 | 理由 |
|---|---|---|
| 保存先 | **localStorage**（キー `rr-draft:v1:{formKey}`） | 同期的に書けるので、`pagehide` / `visibilitychange(hidden)` の瞬間に確実に書き終わる。IndexedDB の非同期の書き込みは、iOS でページを閉じるときに終わらない恐れがある。1件は最大でも約12KB（メモ2000字 + 道の情報のメモ8×200字）で、容量の上限（一般に約5MB）に対して十分小さい |
| formKey | `road:new`、`road:edit:{id}`、`drive:new:{roadId}`、`drive:edit:{id}` | |
| 中身 | `{ v: 1, formKey, savedAt, values: unknown }` | |
| 書くタイミング | 入力の変更から 500ms 後（デバウンス = 連続した入力が止まってから1回だけ書く）、加えて `pagehide` と `visibilitychange` で hidden になったとき | |
| 読むとき | 外側の形は zod で確かめる。`values` はフォームの state 用のスキーマ（null を許す緩い形）で確かめ、合わなければ黙って捨てる | 壊れた下書きで画面が落ちないようにする |
| 戻すとき | フォームを開いたときに下書きがあり、初期値と違えば**自動で入力欄に戻し**、`DraftRestoreBanner`（N-03「前回の書きかけを戻しました（10月8日 21:30）」＋［破棄する］）を出す | 押し忘れて消える方が被害が大きい（C-05）。古い下書きで上書きする心配は、日時の表示と［破棄する］で防ぐ（C-04） |
| 消すタイミング | 保存に成功したとき／［破棄する］を押して確認したとき／30日より古いもの（アプリを起動したときに掃除する）／道を削除したとき（その道の分）／全データ削除のとき。**キャンセル・戻るでは消さない**（C-04） | |
| 失敗したとき | localStorage の容量オーバーなどは握りつぶし、フォームの下に「下書きを保存できませんでした」と小さく出す（保存そのものは続ける） | |

- 実装: `src/lib/drafts/draft-store.ts`（純粋 + Storage の差し込み）、`src/features/drafts/useFormDraft.ts`（hook）。
- 離脱の警告（`beforeunload`）も、画面の中の「離れますか？」の確認も付けない（C-04）。自動保存があるし、スマホではこのイベントが確実には発生しないため。

### 7.3 安全注意の確認・その他の設定（v2-review 反映）

| 設定 | 保存先 | 書き出しに含めるか |
|---|---|---|
| 初回の案内を終えた日時・安全注意を確認した日時 | localStorage `rr-onboarding-done`、`rr-safety-ack`（ISO 日時） | 含めない（端末ごとに一度確認すればよい） |
| ~~色テーマ `rr-theme`~~ | **作らない**（C-09。MVP はライトだけ） | — |
| 最後に書き出した日時・書き出し後の変更回数 | localStorage `rr-last-export`、`rr-changes-since-export` | 含めない |
| 書き出しのお知らせを「あとで」にした期限 | localStorage `rr-reminder-snoozed-until` | 含めない |
| 保存の保護を頼んだ日時と結果 | localStorage `rr-persist`（`{ requestedAt, granted }`） | 含めない |
| つかったきろく（道詳細を開いた回数・走行記録の保存回数・最後に走行記録を保存した時刻） | localStorage `rr-usage`（C-17） | **含めない** |

- localStorage のキー名は案。実装時に code-architect が `rr-` の接頭辞をそろえて決めてよい。

`SafetyNoticeDialog` は `acknowledged` と `onAcknowledge: () => Promise<boolean>` を props で受け取る形に変える（Server Action の import を消す）。

### 7.4 結果の型

`src/lib/actions/result.ts` を `src/lib/result.ts` に移し、エラーコードを 6.2 の `StorageErrorCode` に置き換える。`photo_limit_exceeded`、`rate_limited`、`unauthorized`、`storage_cleanup_pending` は消す。

---

## 8. 書き出し（エクスポート）と読み込み（インポート）

### 8.1 ファイルの形式（v2-review 反映）

この形を正にする（C-24。PRD 7.3 もこの形に合わせた）。つかったきろくは入れない（C-17）。

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
- 中身は zod の検査に通った行だけ（壊れた行は書き出さず、件数だけ知らせる。5.4）。だから**自分が書き出したファイルは、必ず自分で読み込める**（往復テストで保証する）。
- 保存の方法は **［ファイルとして保存］（Blob の URL + `<a download>`）の1つだけ**（C-28）。~~［共有メニューで送る］~~ は出さない（Android の Chrome は `.json` を共有できないのに `canShare` が true を返す落とし穴がある。RES:159-163）。iOS で「ファイル」アプリに保存できないと CEO の実機確認で分かったときだけ、iOS に限って共有ボタンを足す。
- 書き出しに成功したら `rr-last-export` を更新する。
- 注意の文言: 「このファイルには、走った道の位置とメモが暗号化されずに入っています。人に渡すときは気をつけてください」。

### 8.2 読み込みの流れ（検査 + 確認。置き換えだけ）（v2-review 反映）

```
<input type="file" accept="application/json,.json">
  1. size check            File.size > MAX_IMPORT_BYTES -> reject (before reading)
  2. text + JSON.parse     strip leading U+FEFF; SyntaxError -> "JSONとして読めません"
  3. envelope schema       app === 'road-review'; schemaVersion int >= 1; exportedAt ISO;
                           counts.roads / counts.drives int; data.roads / data.drives arrays (max lengths)
  4. version gate          > SCHEMA_VERSION -> reject ("新しいバージョンのアプリで作られたファイル")
                           < SCHEMA_VERSION -> migrateDataset(data, schemaVersion)
  5. record schemas        every record must pass (all-or-nothing); report up to 3 issues (PRD US-16)
                           as "走行記録 12件目: 総合評価が 1〜5 ではありません"
  6. integrity             duplicate road ids / duplicate drive ids inside the file -> reject
                           drive.roadId must exist in the file
                           counts must equal data lengths (PRD US-16 check 8) -> reject
  7. confirm UI            file counts vs. local counts (countAll) + "先に今のデータを書き出す"
                           (shown as the primary button when local data exists)
  8. apply (replace)       ONE readwrite transaction over [roads, drives]: clear() then put all;
                           abort -> nothing changes
```

- 「統合（merge）」の手順（事前の計算・ローカル優先の判定）は後回し（C-26。CEO決定 2026-10-08 1）。入れるときにこの節へ戻す。

| 決まり | 値・動き | 理由 |
|---|---|---|
| `MAX_IMPORT_BYTES` | 64 MiB | 最悪の場合の見積もり: 走行記録1件 ≒ 最大約11KB（メモ2000字×UTF-8で3バイト + 道の情報のメモ1600字×3 + 項目名）× 5,000件 ≒ 55MB、道500件 × 約0.5KB ≒ 0.25MB。**自分で書き出した最大のファイルが読み込めない、という事態を避ける上限**にした。普段の大きさはもっと小さい（メモが短い記録は1件1KB未満） |
| 件数 | 道 ≤ 500、走行記録 ≤ 5,000 | 5.1 と同じ（C-18） |
| 置き換え（replace） | 両方の store を `clear()` してから全件 `put`。同じトランザクションの中で行う | MVP の読み込みはこれだけ（C-26） |
| ~~統合（merge）~~ | **後回し**（C-26） | 2台目の端末を使い始めたら戻す |
| 時刻の形（v2-review 反映） | `createdAt` / `updatedAt` は**アプリが書く UTC の "Z" 形式**（`new Date().toISOString()` の形）だけを受け付ける。それ以外の形は検査5で拒否する | Supabase からの移行をやめたので（C-30）、`+00:00` やマイクロ秒つきの形を受け付ける理由がなくなった |
| 知らないキー | レコードの中の知らないキーは取り除く（zod の既定）。一番上の `app` が違えば拒否する | 将来の形の変更に少し耐えられるようにしつつ、別アプリのファイルを誤って読むのは防ぐ |
| 安全性 | `__proto__` などのキーは zod が新しいオブジェクトを作るので混ざらない。文字列は React が表示時にエスケープする。地図のポップアップは `textContent` で名前を入れている（`RoadsMap.tsx:40-58`）。道の名前にある制御文字・双方向制御文字は今のスキーマで拒否される | 他人が作った悪意のある JSON への対策 |
| 途中で失敗したとき | トランザクションが中止され、何も変わらない。画面に「読み込めませんでした。データは変わっていません」と出す | |

実装: `src/lib/transfer/{export-file.ts, parse-import.ts}`（純粋関数）+ repository の `countAll` / `replaceAll`（v2-review 反映。`plan-import.ts` は統合と一緒に後回し）。

---

## 9. 消えにくくする工夫（persist・バックアップの催促）（v2-review 反映）

- `navigator.storage.persist()`: **アプリを開いたときには呼ばない**（Firefox では許可を求める画面が出て邪魔になるため）。最初の保存（道か走行記録）に成功した後に1回だけ呼ぶ（PRD US-17 と一致）。状態は `navigator.storage.persisted()` で取得し、データ画面に「保護: 有効／無効」とだけ表示し、**常に「書き出しをおすすめします」を添える**（C-29。Safari のタブでは許可されないことが多い）。［データを消えにくくする］ボタンは置かない【推論・PRD に無いため】。
- ~~`navigator.storage.estimate()` で使っている容量を表示する（`StorageUsageMeter`）~~ → **作らない**（C-31）。`estimate()` は PRD US-17 の「保存の量が極端に少ない（プライベートブラウズの可能性）」の判定にだけ使う。
- **書き出しのお知らせ**（`BackupReminderBanner`。C-27）: 次の両方を満たすとき、一覧の上に N-07「最後の書き出しから○日たちました。書き出しておきましょう。」と［書き出す］［あとで］を出す。①最後の書き出しから **7日以上**（一度も書き出していなければ最初の記録から7日以上）②その後の変更が1件以上。［あとで］で **3日間**出さない（`rr-reminder-snoozed-until`）。初めての走行記録の保存直後にも、道詳細の上部に N-06 を1回出す（PRD US-15）。理由: iOS の Safari は「Safari を使った日が7日分」で保存データを消す（RES:39-46）ので、30日では間に合わない。
- iOS の Safari の利用者（ホーム画面のアプリとして開いていないとき）には、データ画面と初回の案内のステップ2に「ホーム画面に追加」の案内を出す（11章の根拠）。Android には出さない（C-08）。

---

## 10. テスト戦略

### 10.1 層ごとの役割（v2-review 反映）

| 層 | 環境 | 対象 | モックの方針 |
|---|---|---|---|
| ① 純粋関数 | vitest（`node`） | スキーマ v1（禁止の項目名＝速度・時刻・タイム・順位などが型に無いこと。PRD US-13）、移行、`build-road-summaries`、`parse-import`、`export-file`、`draft-store`（Storage を差し込む）、CSP のハッシュ計算 | なし |
| ② 保存層の結合 | vitest（`node`）+ fake-indexeddb（テストごとに `new IDBFactory()`） | CRUD、削除の連鎖、件数上限、v0→v1 の upgrade、壊れた行を飛ばす動き、置き換えの途中失敗で何も変わらないこと（不正な行を混ぜて中止させる）。revision・change-bus のテストは無い（C-23） | IndexedDB は fake-indexeddb（本物の API 仕様どおりに動く代わり）。repository の中身はモックしない |
| ③ 部品・画面 | vitest（`jsdom`） | 組織（callback を受け取る形）、`PageClient` + 本物の repository（fake-indexeddb）+ `RepositoryProvider` | `vi.mock` でモジュールを差し替えない。callback は普通の関数を渡す。Leaflet だけは今の `tests/helpers/leaflet-mock.ts` を使い続ける（jsdom では地図を描けないため。本物の動きは E2E で確かめる） |
| ④ E2E | Playwright → **ビルドした `out/` を静的サーバーで配る**（`scripts/serve-static.mjs`。依存なし・`vercel.json` のヘッダーを付ける） | 本番と同じ配信・同じ CSP で、本物のブラウザの IndexedDB を使う | 外部への通信はすべて止める |
| ⑤ ビルドの検証 | Node スクリプト | `verify-out.mjs`（meta CSP・ハッシュ）、`out/` にサーバー用のファイルが無いこと | |

- jsdom 環境の中で fake-indexeddb が `structuredClone` を見つけられるかは、Step 0 で確かめる（【要検証】）。だから保存層のテストは `// @vitest-environment node` で書く。
- **スキップを0件にする**: `vitest run --reporter=default --reporter=json --outputFile=reports/vitest.json` の後、`scripts/ci/assert-no-skips.mjs` がスキップ・todo の数を数え、0件でなければ失敗にする。Playwright も `forbidOnly` に加えて、レポートのスキップ件数を同じ方法で確かめる。
- 消すテスト: `tests/rls/**`、`vitest.rls.config.ts`、`tests/helpers/supabase-test-users.ts`、`tests/e2e/support/login.ts`、`tests/e2e/auth.spec.ts`、`tests/config/{supabase-config,migration-00004}.test.ts`、`src/features/**/{actions,queries}.test.ts`、`src/app/auth/**`・`(auth)/**` のテスト、`lib/auth/*`・`safe-next-path`・`validation/auth` のテスト、`LoginForm` / `OtpForm` / `ConfirmLoginForm` / `AuthTemplate` のテスト。
- 書き直すテスト: `tests/config/next-config.test.ts` は「`output: 'export'` になっていること」「`vercel.json` の CSP の各項目」を確かめるテストにする。`src/lib/security/csp.test.ts` は `scripts/csp` のテストに置き換える。

### 10.2 E2E（スマホ画面が主役）（v2-review 反映）

全部の流れは **`iphone-webkit`（390×844）と `small-360`（Chromium 360×640）の2つ**で回す。パソコンは表示の確認1本だけ（`desktop-chromium` は `@desktop` タグの付いたテストだけを回す）。Android の Pixel は外す（レビュー 2.5、C-36）。

`playwright.config.ts`:

```ts
projects: [
  { name: 'iphone-webkit',    use: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } }, // WebKit; viewport set explicitly (verify the descriptor's default)
  { name: 'small-360',        use: { ...devices['Pixel 5'], viewport: { width: 360, height: 640 } } },
  { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] }, grep: /@desktop/ },
],
webServer: { command: 'node scripts/serve-static.mjs out --port 4173', url: 'http://127.0.0.1:4173' },
use: { baseURL: 'http://127.0.0.1:4173', permissions: [], screenshot: 'on', trace: 'on-first-retry' },
```

- **外への通信を止める**: 共通の fixture で `context.route('**/*', …)` を設定する。`127.0.0.1` 以外は `abort`。ただし `https://cyberjapandata.gsi.go.jp/**` だけは `tests/e2e/fixtures/tile.png` を返す（地理院のサーバーに負荷をかけず、スクリーンショットも毎回同じになる）。止めた通信が1件でもあれば失敗にする。
- **CSP 違反を0件にする**: `addInitScript` で `securitypolicyviolation` を `window.__cspViolations` に集め、各テストの最後に空であることを確かめる。
- テストの一覧（spec）: `roads.spec.ts`（登録・編集・削除の連鎖。ピンなしで保存できる）、`drives.spec.ts`、`draft.spec.ts`（入力 → 1秒待つ → 再読み込み → **自動で**元に戻り「前回の書きかけを戻しました」が出る。キャンセルしても下書きが残る。保存の失敗を `page.evaluate` で容量オーバーにして起こし、入力が残ること）、`transfer.spec.ts`（書き出し → 全削除 → 置き換えの読み込みで同じになる。`download` イベントと `setInputFiles` を使う。不正なファイル9種類（PRD US-16）の拒否メッセージ）、`safety.spec.ts`、`security.spec.ts`（ヘッダー・meta CSP・外への通信0件・Geolocation の呼び出しが無い）、`a11y.spec.ts`（`@axe-core/playwright` で重大・深刻0件）。~~`multi-tab.spec.ts`~~ は作らない（C-23）。
- データの準備は、アプリ自身の読み込み機能に見本の JSON を渡して行う（読み込み機能のテストも兼ねる）。
- **限界**: Linux の Playwright の WebKit は iOS の Safari そのものではない。7日ルール・ホーム画面のアプリ・「ファイル」アプリへの保存・アプリ切り替え時の `pagehide` は再現できないので、CEO の iPhone 実機確認に任せ、テストで「確かめた」とは書かない（レビュー 2.5）。
- **スクリーンショット**: 全画面 × 全状態を **360×640 と 390×844** で撮り（C-36）、`test-results/` に保存して CI の成果物（artifact）として PR ごとに人が見られるようにする。合否の表は `apps/road-review/docs/qa/{日付}-screens.md` に qa-engineer が書き、公開前の最終の1組だけをコミットする（C-37）。`toHaveScreenshot`（画像の差分で失敗させる検査）は、フォントの描画が OS によって違うため、最初は入れない。Linux の CI で基準画像を作る運用が決まったら足す。

---

## 11. リスクと対策（v2-review 反映）

| # | リスク | 根拠 | 対策 |
|---|---|---|---|
| R1 | **iOS Safari がデータを消す**（7日間そのサイトを操作しないと、スクリプトが書いた保存データ＝IndexedDB・localStorage がすべて消される） | WebKit 公式「deleting all of a website's script-writable storage after seven days of Safari use without user interaction on the site」、ただしホーム画面の Web アプリは「have their own counter of days of use」（https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/） | PWA の manifest を必須にし、ホーム画面への追加を案内する（9章）。バックアップの催促。`persist()` |
| R2 | 容量の圧迫や上限で消える | WebKit 公式（Safari 17）: 容量の上限は「no guarantee that a site can store that much」。消すときは最後に操作した日時が古い順。`persist()` を許可するかは「whether the website is opened as a Home Screen Web App」などで判断する（https://webkit.org/blog/14403/updates-to-storage-policy/） | データ自体が小さい（最大でも数十MB）。`quota_exceeded` を画面に出す。書き出しを促す |
| R3 | 利用者が自分で「履歴と Web サイトデータを消去」する／端末をなくす／プライベートブラウズ（閉じると消える） | ブラウザの仕様 | 同期の仕組みは無い。**書き出したファイルだけが復旧の手段**であることを、データ画面と初回の案内のステップ2で明記する |
| R4 | 複数のタブで同時に書く | IndexedDB はトランザクション単位でしか守らない | （v2-review 反映。C-23）衝突の検出はしない。画面に戻ったとき（`visibilitychange`）に読み直し、後から保存したほうが残る。`versionchange` で DB を閉じる。利用者は1人で、ほぼ1つの画面で使う前提 |
| R5 | データが壊れる・形の移行（スキーマ版の更新）に失敗する | | 読むたびの zod 検査、壊れた行は外して件数を出す、移行の単体テストと結合テスト、移行に失敗した行も元のまま残す（生データの書き出しは作らない。C-31） |
| R6 | 悪意のある JSON を読み込む | 新しい入口 | 8.2 の検査（サイズ・件数・形・参照・重複）、全部成功か全部取り消しかの書き込み、ハッシュ CSP、`connect-src 'self'` |
| R7 | ハッシュ CSP の後処理が効かず、黙って弱まる | 3.2 | `verify-out.mjs` を CI の必須の関門にし（`404.html` を含む全 HTML）、E2E で CSP 違反0件を確かめる。Vercel は `framework: null` ＋ `outputDirectory: "out"` で `out/` をそのまま配る。【要検証】が成り立たなければ**効くまで公開しない**（CEO決定 2026-10-08 2。v2-review 反映） |
| R8 | 静的書き出しで `vercel.json` のヘッダーが付かない | 未確認 | Step 0 の Preview で `curl -I` して確かめる。だめなら公開しない（同上） |
| ~~R9~~ | （削除。v2-review 反映: Supabase からのデータ移行はしないので、移行のリスクも無い。C-30） | | |
| R10 | `next/font/google` はビルド時にネットに接続する | v1 からの構成 | CI でも Vercel でもネットに接続できる。オフラインではビルドできないことを README に書く |
| R11 | 時計・時差のずれ | | 未来の日付は書くときだけ確かめる（日本時間で判定・v1 と同じ）。読むときは拒否しない |

---

## 12. 削除するもの・残すもの・作るもの

### 12.1 削除（v2-review 反映）

| 対象 | 具体的なもの |
|---|---|
| Supabase のクライアント | `src/lib/supabase/{client,server,proxy}.ts` |
| proxy | `src/proxy.ts`（認証と nonce の両方） |
| 認証 | `src/features/auth/`、`src/app/auth/{confirm,callback}/`、`src/app/(auth)/`、`src/lib/auth/{get-user-id,next-path-cookie}.ts`、`src/lib/utils/safe-next-path.ts`、`src/lib/validation/auth.ts` |
| Server Actions と問い合わせ | `src/features/{settings,roads,drives}/{actions,queries}.ts` |
| 部品 | organisms `LoginForm`、`OtpForm`、`ConfirmLoginForm`、templates `AuthTemplate`（いずれもテストと index.ts を含む） |
| 型 | `src/types/database.types.ts` |
| CSP（nonce） | `src/lib/security/csp.ts`（+test）。`layout.tsx` の `headers()` と `nonce` |
| DB | `supabase/` ディレクトリ全体（migrations・config.toml・templates）。**コードの削除と同じ PR で消す**（データ移行はしないので待つ理由がない。C-30）。git の履歴には残る |
| テスト | 10.1 の「消すテスト」 |
| 設定 | `vitest.rls.config.ts`、`.env.example`（環境変数が無くなる）、package.json の `test:rls` |
| Vercel | 環境変数 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`NEXT_PUBLIC_SITE_URL`（Production / Preview / Development の全部）。`SUPABASE_SERVICE_ROLE_KEY` が誤って登録されていないかも確認する |
| Supabase のプロジェクト | **v2 が本番で動くのを確かめた後、CEO 本人がダッシュボードで停止 → 削除する**（AI は行わない。CEO決定 2026-10-08 3。PRD 9.1）。データは移行せず捨てる |
| CSP の `connect-src` | Supabase のドメイン |
| ESLint | `noData` の対象から `@/lib/supabase/*` を外す（12.4 で付け替える） |
| 文書 | `road-review-auth-password-design.md` は「取り下げ」と書いて残す。`road-review-architecture.md` の先頭に「認証・DB・CSP の章は v2 で置き換え済み」と書く |

### 12.2 残す（中身を少し直すものを含む）（v2-review 反映）

- atoms すべて（Button、Input、Textarea、Label、FieldError、Spinner、Alert、RoadTypeBadge、RatingMeter）
- molecules すべて（FormField、ChoiceGroup、RatingInput、PrefectureSelect、LatLngInputs、SafetyNoticeBanner、ForestRoadNote、EmptyState、RoadListItem、RatingSummary、DriveCard、RoadInfoSummary、CollectionSummary）。リンクの URL は `lib/routes.ts` を使うように直す
- organisms: `RoadForm`・`DriveForm`（callback の props に変える）、`RoadInfoFieldset`、`PinPicker`、`RoadsMap`（→ 表示だけの `RoadMiniMap` に作り直す。一覧の地図は後回し。v2-review 反映）、`RoadList`、`DriveList`、`SafetyNoticeDialog`（callback に変える）、`AppHeader`（ログアウトをやめ、［データ］へのリンクに変える。Server Component のまま）
- 部品の名前と分け方の正は DS 7-2（TopBar・BottomActionBar・Onboarding など）。この節の一覧は「今あるものを残す」目安（v2-review 反映）
- templates: `AppShellTemplate`、`FormPageTemplate`、`RoadsIndexTemplate`、`RoadDetailTemplate`
- lib: `constants/*`、`map/gsi-tiles.ts`、`ratings/summary.ts`、`road-info/latest.ts`、`collection/stats.ts`、`utils/{date,cn}.ts`、`validation/{common,road,drive,road-info}.ts`（record スキーマ用に部品を export する）
- Leaflet の読み込み方（`useEffect` の中で `await import('leaflet')`）、divIcon、フォント（テーマのスクリプトは消す。C-09。v2-review 反映）

### 12.3 作る — ファイル構成（v2-review 反映）

```
apps/road-review/
├── next.config.ts                 # output:'export', trailingSlash:true, images.unoptimized
├── vercel.json                    # framework:null, buildCommand "pnpm build", outputDirectory "out",
│                                  # headers (CSP etc.) + redirects (/roads -> /)  ← single source
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
│   ├── fixtures/export-v1-*.json  # valid / wrong app / duplicate ids / orphan drive / future version /
│   │                              # bad field / counts mismatch / empty / huge (PRD US-16 の9種)
│   └── e2e/{fixtures.ts, *.spec.ts, fixtures/tile.png}
└── src/
    ├── app/
    │   ├── layout.tsx             # static; manifest + appleWebApp metadata; no theme script, no nonce
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
    │       └── data/page.tsx + PageClient.tsx             # "/data/"
    ├── components/{atoms,molecules,organisms,templates}/  # 12.4
    ├── features/
    │   ├── storage/{RepositoryProvider.tsx, useRepository.ts, useStorageQuery.ts, AppProviders.tsx}
    │   ├── roads/hooks.ts
    │   ├── drives/hooks.ts
    │   ├── drafts/useFormDraft.ts
    │   ├── safety/useSafetyAck.ts
    │   ├── backup/useBackupReminder.ts
    │   └── usage/useUsageCounter.ts   # 2 counters in localStorage (C-17)
    └── lib/
        ├── schema/{version.ts, v1.ts, migrations.ts}
        ├── storage/{repository.ts, indexeddb-repository.ts, open-database.ts, idb-request.ts,
        │            parse-records.ts, errors.ts}          # no change-bus (C-23)
        ├── transfer/{export-file.ts, parse-import.ts, download.ts}   # no plan-import (merge is Later)
        ├── drafts/draft-store.ts
        ├── roads/build-road-summaries.ts
        ├── routes.ts
        ├── result.ts
        └── (constants, map, ratings, road-info, collection, utils, validation — kept)
```

テストはそれぞれの対象と同じディレクトリに `*.test.ts(x)` として置く（`.claude/rules/tests.md`）。

### 12.4 Atomic Design 対応表（v2 で追加・変更するもの）（v2-review 反映）

部品の名前・見た目の正は DS 7-2。下の表は保存処理まわりの部品の目安。

| コンポーネント | 階層 | Server/Client | 説明 |
|---|---|---|---|
| ConfirmDialog | molecules | Client | ネイティブの `<dialog>` + 確定 / キャンセルの Button（v1 の設計にあったが未実装）。DS では下から出る ConfirmSheet |
| DraftRestoreBanner | molecules | Client | Alert「前回の書きかけを戻しました（日時）」+ ［破棄する］（自動で戻した後に出す。C-05） |
| BackupReminderBanner | molecules | どちらでも | Alert + 書き出しへのリンク + 閉じる |
| StorageIssueNotice | molecules | どちらでも | 「保存できません／読み込めないデータが N 件あります」（Alert + リンク） |
| NotFoundState | molecules | どちらでも | 「見つかりません」+ 一覧へのリンク |
| FilePickerButton | molecules | Client | Label + 見えない `<input type="file">`（ボタンの見た目。キーボードで操作できる） |
| PersistStatus | molecules | Client | 「保護: 有効／無効」＋常に「書き出しをおすすめします」（C-29。旧 StorageUsageMeter の容量表示は作らない。C-31） |
| UsageCounts | molecules | どちらでも | つかったきろくの2つの回数を文字で出す（C-17） |
| RoadForm / DriveForm | organisms | Client | **変更**: `onSubmit` を props で受け取る。throw しない。下書きの hook は PageClient から `draft` props で渡す |
| SafetyNoticeDialog | organisms | Client | **変更**: `onAcknowledge` を props で受け取る |
| AppHeader | organisms | Server | **変更**: ログアウトをやめ［データ］へのリンクにする（DS では TopBar） |
| DeleteConfirmButton | organisms | Client | Button + ConfirmDialog。`onConfirm` を props で受け取る（道・記録で共用） |
| DataExportPanel | organisms | Client | 件数・最後の書き出し日時・その後の変更件数・［ファイルとして保存］・注意文（共有メニューは出さない。C-28） |
| DataImportPanel | organisms | Client | FilePickerButton → 検査結果 → 件数の比較（ファイル / この端末）→ 「今の記録を先に書き出す」→ ConfirmDialog（**置き換えだけ**。C-26） |
| StorageManagementPanel | organisms | Client | PersistStatus + UsageCounts + 全削除（DeleteConfirmButton。「削除」と入力させる。PRD US-11）。生データの書き出しは作らない（C-31） |
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
           ├ RatingInput×4 / ChoiceGroup×1 (traffic; vehicle & weather removed) / FormField+Textarea×2 (memo, helpfulNote)   [molecules]
           ├ RoadInfoFieldset            [organisms]
           └ Button                      [atoms]
```

---

## 13. 既存データの移行: なし（v2-review 反映。旧「Supabase → v2 の移行 SQL」を削除）

- 旧版にあった Supabase からのデータ移行 SQL と、その確認の手順は**削除した**（C-30）。CEO は「本番（Supabase）にある v1 のデータは引き継がず、捨てる」と決めている（PRD 9.1）。
- そのため、record スキーマの日時は「アプリが書く UTC の "Z" 形式」だけを受け付ければよい（8.2 の「時刻の形」）。`+00:00` 形式やマイクロ秒つきの形を受け付ける必要はない。
- 移行のための型の項目（車両種別・天候・`revision`）も不要になったので、5.1 から消した。
- Supabase の本番プロジェクトの停止・削除は、v2 が本番で動くのを確かめた後に **CEO 本人がダッシュボードで行う**（CEO決定 2026-10-08 3。12.1）。
- 章の番号は、ほかの文書からの参照を崩さないために残す。

---

## 14. CI ワークフロー案（`.github/workflows/road-review-ci.yml`、担当: devops-engineer）（v2-review 反映）

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
      - run: pnpm exec playwright install --with-deps chromium webkit   # projects: iphone-webkit / small-360 / desktop(@desktop only)
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@<pinned SHA>   # if: always(); playwright-report + test-results (screenshots)
```

- アクションは、既にある `supply-chain-security.yml` と同じ形で SHA を固定する（shai-hulud 対策）。`run:` に外から来た値（PR のタイトルなど）を直接埋め込まない。
- `--ignore-scripts` で Next の SWC・esbuild が動くかは、Step 0 で確かめる（【要検証】。動かない場合は、許可が必要な依存を `onlyBuiltDependencies` に入れる案を supply-chain-auditor と一緒に決める）。
- **main のブランチ保護で「verify」と「e2e」を必須のチェックにする**（CEO決定 2026-10-08 4 で承認。**設定は CEO が行う。CI の用意が先**）。
- Vercel: **Git 連携をつなぐ**（Root Directory `apps/road-review`、**Framework Preset「Other」（`vercel.json` の `"framework": null` と同じ）**、Build Command `pnpm build`、Output Directory `out`、Production Branch `main`）。Next.js 用の自動の組み立てを通さず、後処理した `out/` をそのまま配る（C-34。3.2・3.3）。PR ごとに Preview が作られ、本番には main からしか出ない（監査 H6 の解決）。
- Vercel のインストールでも `--ignore-scripts` 相当にするか（`installCommand`）は、Step 0 の結果を見て devops-engineer と supply-chain-auditor が決める【未確認】。

---

## 15. 実装の順番（TDD: 失敗するテストを先に書く → 通す → 整理する）（v2-review 反映）

**実装の順番の正は、レビュー 3章の 17 段階（段階 0〜17）**。各段階で画面を作るときは 360×640 と 390×844 の画面写真で確かめる。下の表は旧版の Step を残し、レビューの決定に合わせて中身を直したもの（対応の目安）。

各ステップは「test-writer が失敗するテスト（Red）→ frontend-developer / backend-developer が通す（Green）→ 整理（Refactor）→ code-reviewer」の順に進める。CI ができてからは、各ステップの PR が CI で緑になることを完了の条件にする。

| Step | 内容 | 主な担当 | 完了の条件 |
|---|---|---|---|
| 0 | **確認の試作（spike）と ADR**: 小さな枝で `output:'export'` + `vercel.json`（**`framework: null`・`buildCommand: "pnpm build"`・`outputDirectory: "out"`**・headers）+ 後処理の meta CSP を Vercel の Preview に出し、`curl -I` と DevTools で 3.2 の【要検証】(a)(b) を確かめる。fake-indexeddb を jsdom / node で動かす。`--ignore-scripts` でビルドできるか確かめる。並行して CEO の iPhone 実機確認（レビュー 4章の決定3。段階9の前まで） | devops-engineer / frontend-developer / CEO | 結果を `docs/product/road-review-adr-static-export.md` に記録する。成り立たなければ CEO に報告して止める（**効くまで公開しない**。CEO決定 2026-10-08 2） |
| 1 | **CI の骨組み**（14章。最初は今のコードで lint・型・単体・ビルドを回す）+ `assert-no-skips` | devops-engineer | PR で CI が回る |
| 2 | **スキーマ**: `lib/schema/{version,v1,migrations}.ts`、validation から部品を export する | test-writer → backend-developer | ①のテストが緑 |
| 3 | **純粋なドメイン関数**: `build-road-summaries`、`export-file`、`parse-import`（重複・孤立・バージョン・上限・件数の照合・BOM・壊れた JSON・往復）。`plan-import` は作らない（統合は後回し） | test-writer → backend-developer | ①が緑。v1 の road_summaries と同じ並び順・同じ集計 |
| 4 | **保存層**: `idb-request`、`open-database`（upgrade・versionchange）、`indexeddb-repository`（CRUD・連鎖削除・上限・壊れた行・置き換えが全部成功か全部取り消しか）。**revision と change-bus は作らない**（C-23） | test-writer → backend-developer | ②が緑（fake-indexeddb） |
| 5 | **React との接続**: `RepositoryProvider`、`useStorageQuery`、各 hook、`tests/helpers/repository.ts` | frontend-developer | ③の hook テストが緑 |
| 6 | **静的書き出しへの切り替え**: `next.config`（export）、新しいルート + PageClient、`lib/routes.ts`、組織を callback の形に変える、`AppHeader` / `SafetyNoticeDialog` の変更、**古いルート・`features/*/{actions,queries}`・proxy・auth を同じ PR で消す**、`layout.tsx` から `headers()` と nonce を消す | frontend-developer（+ test-writer がページのテストを書き直す） | `pnpm build` が通り、`out/` ができる。③が緑 |
| 7 | **CSP**: `vercel.json`、`inject-meta-csp.mjs`、`verify-out.mjs`、`serve-static.mjs`、`next-config.test.ts` の書き直し | devops-engineer / frontend-developer | ⑤が緑。ローカルの静的サーバーで CSP 違反が0件 |
| 8 | **フォームの失敗時の扱いと下書き**: try/catch、`draft-store`、`useFormDraft`（自動で戻す・キャンセルでも残す）、`DraftRestoreBanner` | test-writer → frontend-developer | 「保存が失敗しても入力が残る」「再読み込みすると自動で戻る」のテストが緑 |
| 9 | **削除**: `ConfirmDialog`、`DeleteConfirmButton`、道の連鎖削除・記録の削除の画面 | 同上 | |
| 10 | **書き出し・読み込み・データ画面**: `/data/`、3つの Panel、`persist()` と保護の状態、つかったきろく、書き出しのお知らせ（7日・3日） | 同上 | 往復の E2E（書き出し→全削除→置き換えの読み込みで一致）が緑 |
| 11 | **E2E 一式 + CI の e2e ジョブ**（10.2）。外への通信0件・CSP 違反0件・axe の重大・深刻0件・**2つの project（iphone-webkit・small-360）＋パソコン1本**・スクリーンショットの成果物 | test-writer / devops-engineer | CI の e2e が緑・スキップ0件 |
| 12 | **依存と設定の掃除**: `pnpm remove @supabase/ssr @supabase/supabase-js server-only supabase`、`pnpm add -D fake-indexeddb@6.2.5`（Step 4 の前に入れてよい）と `@axe-core/playwright`、`.env.example` と `vitest.rls.config.ts` を消す、ESLint の `noData` を付け替える → **supply-chain-auditor の監査** | devops-engineer / supply-chain-auditor | 監査に通る |
| 13 | **PWA の manifest + アイコン**、`appleWebApp` の metadata、ホーム画面への追加の案内（iOS だけ） | frontend-developer | iPhone（WebKit）の E2E で manifest が読まれる |
| 14 | **公開**（データ移行の部分は削除。C-30）: Vercel の Git 連携（Framework Preset「Other」）・古い環境変数の削除 → main にマージ（本番の変更の凍結は v2 の公開だけ例外。**公開直前に CEO に再確認**。CEO決定 2026-10-08 3）→ 本番で主な流れを1回確かめる → **CEO 本人が** Supabase を停止 → 削除。`supabase/` ディレクトリは Step 6 のコード削除と同じ PR で消しておく | devops-engineer / CEO | 本番の URL で、記録→書き出し→別のブラウザで読み込み、が通った記録がある |
| 15 | **文書**: アプリの README、ルートの README のアプリ一覧・技術スタック、v1 設計書への注記 | content-creator / CTO | ドキュメント管理ルールの表に沿っている |

~~（任意・Phase 2）**Service Worker**~~ → **v2 には入れない（後回し）**（C-32。CEO決定 2026-10-08 1）。古い版が残る事故の恐れ・CSP と更新通知とテストの仕事の増加に加え、iOS では Cache API も7日ルールで消える（RES:40）ため。入れないので「最初にアプリを開くには電波が要る」（`offline-support.md:139`。PRD 13章）。CEO が山の中で開けず困ったら、手書きの `public/sw.js`（`/_next/static` はキャッシュ優先、HTML はネットワーク優先、キャッシュ名にビルド ID、更新の案内）の案に戻る。

---

## 16. CEO / CPO に決めてもらうこと（v2-review 反映: すべて決着）

旧 2「Supabase の既存データを移すか」は**削除した**（CEO は「移行しない・捨てる」と決めている。C-30）。番号は旧版との対応のために残す。

- **1.** **静的書き出しと、クエリの URL（`/roads/view/?id=`）でよいか**（3・4章）→ **採用**（C-33。データ画面は `/data/`）。Step 0 の【要検証】が成り立たなかったとき → **効くまで公開しない。B（`'unsafe-inline'`）での一時公開もしない**（CEO決定 2026-10-08 2）。
- **3.** **上限の値**: 道 500件、走行記録 5,000件、読み込みファイル 64MiB → **このとおり**（C-18, C-25）。
- **4.** **統合のときの衝突の扱い** → **統合そのものを後回し**（C-26。CEO決定 2026-10-08 1）。入れるときに改めて決める。
- **5.** **Service Worker（オフラインでの起動）** → **v2 には入れない（後回し）**（C-32。CEO決定 2026-10-08 1）。
- **6.** **main のブランチ保護に CI の必須チェックを足すか** → **足す**（CEO決定 2026-10-08 4。設定は CEO。CI の用意が先）。

---

## 付録: 主な出典

- Next.js 16（ローカルの docs）: `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`（Supported/Unsupported Features、Browser APIs）、`content-security-policy.md:385-539`（nonce と動的描画・Without Nonces・SRI）、`progressive-web-apps.md`、`offline-support.md:139`（フルリロードでのオフラインは Service Worker が必要）、`03-api-reference/04-functions/use-search-params.md:180-184`
- WebKit: Full Third-Party Cookie Blocking and More（7日間の上限・ホーム画面アプリの例外）https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/ ／ Updates to Storage Policy（Safari 17 の容量・削除・persist）https://webkit.org/blog/14403/updates-to-storage-policy/
- npm registry（2026-10-08 に確認）: https://registry.npmjs.org/fake-indexeddb/latest 、https://registry.npmjs.org/idb/latest
- 監査: `docs/org/research/06-web-dev-lifecycle-and-audit.md`（B-H3、B-H5、B-H6、B-M1、B-M2、B-M7、B-M9、L5）
