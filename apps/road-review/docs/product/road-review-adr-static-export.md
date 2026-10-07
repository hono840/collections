# ADR（下書き）: 静的書き出し＋ハッシュ meta CSP で配る

- 状態: **下書き（ローカルの確認は合格。Vercel の上での確認も V-3 の `/roads` の転送を除いて合格（5章）。使い捨てプロジェクトは 2026-10-08 に削除済み（7章）。CEO の iPhone での1枚は未実施）**
- 作成日: 2026-10-08
- 作成: devops-engineer（段階0 のローカル部分。`road-review-v2-review.md` 3.1 の段階0 ①③ と 2.4）
- 関連: `road-review-architecture-v2.md` 3章・4章・10章（以下 ARCH）、`road-review-v2-review.md`（以下 REVIEW）C-33・C-34・2.3・2.4・4章の決定4
- 表記: 【事実】ファイル・コマンドの出力で確かめた／【推論】根拠から考えた／【未確認】まだ確かめていない（確かめ方を書く）

用語メモ:
- **静的書き出し**（`output: 'export'`。サーバーで動く部分を持たず、HTML・JS・CSS のファイルだけを作って配る方式）
- **インラインスクリプト**（`<script src="…">` のように外のファイルを読むのではなく、HTML の中に直接書かれたスクリプト）
- **ハッシュ**（中身から計算する指紋。1文字でも違えば別の値になる）
- **CSP**（ブラウザに「このページで、どのスクリプトを動かしてよいか」を伝える決まり）

---

## 1. 決定

1. `next.config.ts` は `output: 'export'`・`trailingSlash: true`・`images.unoptimized: true` にする。
2. `pnpm build` = `next build && node scripts/csp/inject-meta-csp.mjs out && node scripts/csp/verify-out.mjs out` にする。**ハッシュは必ずビルドの後に計算する**（3.2 のとおり、ビルドのたびに中身が変わるため）。
3. meta CSP は `<head>` の中の **`<meta charSet>` のすぐ後**に入れる（ARCH 3.2 の「最初の子要素」から少し変える。理由は 4.3）。
4. `vercel.json` は `framework: null`・`outputDirectory: "out"`・`buildCommand: "pnpm build"`・**`trailingSlash: true`**・`headers` にする。`cleanUrls` は付けない（3.3）。
5. ローカルの静的サーバー（`scripts/serve-static.mjs`）は `vercel.json` のヘッダーをそのまま付ける。ただし **`upgrade-insecure-requests` だけはローカルで外す**（4.2。これがないと WebKit で JS が1つも動かない）。
6. 本番に出すのは、**Vercel の Preview で 5章の確認がすべて通ってから**。通らなければ CEO に報告して止める（`'unsafe-inline'` で出すことはしない。REVIEW の CEO 決定2）。

## 2. 試作の中身（本物のアプリは変えていない）

【事実】試作は使い捨てのコピーで作った。本物の `apps/road-review/` のコード・`package.json`・lockfile は変えていない（`git diff --stat` で差分0）。コミットもデプロイもしていない。

- 場所: `/private/tmp/claude-501/-Users-hiro-dev-collection/2ab04b8c-1720-4813-b6f8-2c054c1ad711/scratchpad/spike-static/`（一時フォルダ。段階7 で本物のアプリへ移す）
- 依存のインストール: `pnpm install --frozen-lockfile --offline`（lockfile どおり。新しい依存は0）
- コピーから消したもの: proxy・Supabase・Server Actions・認証・テスト・`supabase/`。コピーに入っていた `.env.local` と `.vercel/`（本物の Vercel プロジェクト `road-review` へのつながり）は**すぐ消した**（試作から本物のプロジェクトへ間違って出す事故を防ぐため）
- ページ（4つ）:
  - `/`（ホーム。リンク2つ）
  - `/roads/view/?id=…`（Client Component で `useSearchParams` を読み、`<Suspense>` で包む。IndexedDB の有無を `useEffect` の中で調べる）
  - `/map/`（Leaflet を `useEffect` の中で `import('leaflet')`。地理院タイル）
  - 404（Next の既定）
  - ルートの `layout.tsx` に、本物と同じテーマ用のインラインスクリプトと `next/font/google`（BIZ UDPGothic）
- 作ったスクリプト:

| ファイル | 役目 |
|---|---|
| `scripts/csp/html-scripts.mjs` | 共通の部品（HTML の一覧・インラインスクリプトの取り出し・SHA-256） |
| `scripts/csp/inject-meta-csp.mjs` | `out/**/*.html` のインラインスクリプトごとにハッシュを計算し、meta CSP を入れる。もう一度動かしても二重にならない |
| `scripts/csp/verify-out.mjs` | 関所。meta CSP がちょうど1つ／meta より前に `script`・`link`・`style` がない／meta の `script-src` に `'unsafe-inline'`・`'unsafe-eval'` がない／全インラインスクリプトのハッシュがある／`vercel.json` に `frame-ancestors 'none'` と HSTS がある。1つでも外れたら終了コード1 |
| `scripts/serve-static.mjs` | 依存なしの静的サーバー。`vercel.json` の `headers`・`redirects`・`trailingSlash` を同じように動かす |
| `scripts/verify-browser.mjs` | 試作専用の確認（Playwright で Chromium と WebKit、390×844） |
| `vercel.json` / `.vercelignore` | 6章の Preview 用 |

## 3. 証拠

### 3.1 Next.js 16.3.6 の同梱 docs（`apps/road-review/node_modules/next/dist/docs/`）

| 内容 | 出典 |
|---|---|
| `output: 'export'` で `out/` ができる。`trailingSlash: true` は任意 | `01-app/02-guides/static-exports.md:24-27, 38` |
| `trailingSlash: true` と `output: "export"` で `/about` は `/about/index.html` になる | `01-app/03-api-reference/05-config/01-next-config-js/trailingSlash.md:27` |
| `trailingSlash: true` だと `/about` は `/about/` へ転送される（ただし転送はサーバーの仕事） | 同 `trailingSlash.md:18` |
| 静的書き出しでは Redirects・Headers・Proxy・Cookies・`generateStaticParams` のない動的ルートなどが使えない | `static-exports.md:284-296` |
| `window`・`localStorage` はブラウザでだけ触る（Client Component もビルド時に HTML になる） | `static-exports.md:259` |
| 本番ビルドで `useSearchParams` を `<Suspense>` で包まないとビルドが失敗する | `01-app/03-api-reference/04-functions/use-search-params.md:181` |
| nonce は動的描画が必要。静的ページには nonce を入れられない | `01-app/02-guides/content-security-policy.md:38, 181` |
| SRI は Experimental で、ビルド時に作られないスクリプトは扱えない | `content-security-policy.md:536, 538` |

### 3.2 ビルドの結果（質問 a・b への答え）

【事実】`pnpm build` の出力（抜粋）:

```
▲ Next.js 16.3.6 (Turbopack)
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /map
└ ○ /roads/view
○  (Static)  prerendered as static content
[inject-meta-csp] out/404.html: 3 inline script hash(es)
[inject-meta-csp] out/404/index.html: 3 inline script hash(es)
[inject-meta-csp] out/_not-found/index.html: 3 inline script hash(es)
[inject-meta-csp] out/index.html: 3 inline script hash(es)
[inject-meta-csp] out/map/index.html: 3 inline script hash(es)
[inject-meta-csp] out/roads/view/index.html: 3 inline script hash(es)
[verify-out] OK: 6 HTML file(s) carry a hash-only meta CSP
```

【事実】どの HTML にもインラインスクリプトは **3つ**ある:

| # | 中身 | 長さ | ページごとに違うか | ビルドごとに違うか |
|---|---|---|---|---|
| 1 | テーマ用スクリプト（`layout.tsx`） | 414 文字 | 同じ | 同じ |
| 2 | `(self.__next_f=self.__next_f\|\|[]).push([0])` | 43 文字 | 同じ | 同じ |
| 3 | `self.__next_f.push([1,"…"])`（**RSC のデータ**。そのページの中身と JS の部品の名前が入る） | 6,805〜22,005 文字 | **違う** | **違う** |

- **(a) ページごと・ビルドごとに中身が変わるインラインスクリプトはあるか → ある（#3）。** 同じソースのまま2回ビルドしても、全ページの #3 のハッシュが変わった（例: `/index.html` は `bRKbRFnWPXq3…` → `VbL6+2KG1y94…`）。原因は RSC のデータにビルドのたびにランダムに作られる番号（`"b":"wBD4laGiqZbLE8Vj-leQI"`。`.next/BUILD_ID` と同じ値）が入るため。ホームの文字を1つ変えると、ホーム以外のページの #3 も変わった（部品の名前が変わるため）。→ **ハッシュは前もって `vercel.json` に書けない。ビルドの後に計算するしかない**（決定2の根拠）。
- **(b) RSC のデータはインラインか → インライン。** `<script>self.__next_f.push(...)</script>` として HTML の中に書かれる（#2・#3）。これを `'unsafe-inline'` なしで動かすには、ハッシュが要る。なお、画面の切り替えのとき（リンクを押したとき）は、RSC のデータを `out/map/__next._full.txt` などのファイルとして `fetch` で読む（`connect-src 'self'` で足りる）。切り替えでも CSP 違反は0件だった（3.4）。

### 3.3 `trailingSlash` と Vercel の `cleanUrls`（質問 c への答え）

【事実】Vercel CLI 54.9.1 の中の転送の作り方（`~/Library/pnpm/global/5/node_modules/vercel/dist/chunks/chunk-H3M6DIPE.js`）:

- `convertTrailingSlash(true)`（21019-21043 行）: `/.well-known` は除き、`/map` のように拡張子のない URL を **308 で `/map/` へ転送**。`/file.txt/` は `/file.txt` へ。`false` を書くと逆に `/map/` → `/map` へ転送する。
- `convertCleanUrls(true, trailingSlash)`（20893-20908 行）: `/x/index.html` と `/x.html` を、`trailingSlash` が true なら `/x/` へ転送する。

判断:
- `framework: null` にすると、`next.config.ts` の `trailingSlash` は Vercel の転送に**効かない**（Next のサーバーが無いので）【推論】。だから `vercel.json` にも **`"trailingSlash": true`** を書いて合わせる。`false` を書くと `/map/` → `/map` へ転送されて、ファイル（`map/index.html`）とずれるので**書いてはいけない**。
- `cleanUrls` は要らない。`trailingSlash: true` の書き出しには `.html` で終わる URL が `404.html` しかないため。付けても `/map/index.html` → `/map/` の転送が増えるだけで、ぶつかりはしない【推論】。
- ローカルの `serve-static.mjs` は、上の2つの正規表現をそのまま写して同じ動きにした。`/map` を開くと 308 で `/map/` へ移ることを Chromium・WebKit で確かめた（3.4 の `map-no-slash`）。

### 3.4 ブラウザでの確認（Playwright 1.63.0、390×844、Chromium と WebKit 26.6）

手順: `node scripts/serve-static.mjs out --port 4173` → `node scripts/verify-browser.mjs`。外への通信はすべて止め、地理院タイル（`cyberjapandata.gsi.go.jp`）だけ見本の画像に差し替えた。CSP 違反は `securitypolicyviolation` のイベントとコンソールの「Refused to…」を両方数えた。

【事実】結果（両方のブラウザで同じ）:

| 確認 | Chromium | WebKit |
|---|---|---|
| `/`・`/roads/view/?id=…`・`/map/`・`/map`（→ `/map/`）・`/no-such-page/`（404）の CSP 違反 | 0 件 | 0 件 |
| 各ページの meta CSP の数 | 1 | 1 |
| ヘッダーの `frame-ancestors 'none'` と HSTS | あり | あり |
| `useSearchParams` で読んだ ID が表示される（JS が動いた証拠） | 〇 | 〇 |
| リンクを押して `/map/` へ切り替え（RSC の `.txt` を読む）の CSP 違反 | 0 件 | 0 件 |
| **対照実験1**: localStorage に `rr-theme=dark` を入れて再読み込み → テーマ用スクリプトが動いて `dark` が付く | 〇 | 〇 |
| **対照実験2**: ハッシュのないインラインスクリプトを足す → **止められる**（`script-src-elem` の違反が出る） | 〇 | 〇 |
| 地図タイルの通信先 | `cyberjapandata.gsi.go.jp` のみ（27 回） | 同じ |
| それ以外の外への通信 | 0 件 | 0 件 |

- 対照実験2 が大事: ヘッダーの CSP は `'unsafe-inline'` で緩いのに止められたので、**meta のハッシュ CSP が本当に効いている**ことが分かる（ポリシーが2つあると両方を満たすものしか動かない、という仕組みどおり）。
- `verify-out.mjs` がわざと壊したものを止めるかも確かめた【事実】:

```
== case: meta removed          → [verify-out] FAIL: neg/map/index.html: expected 1 meta CSP, found 0        exit=1
== case: unsafe-inline added   → [verify-out] FAIL: neg/index.html: meta script-src contains unsafe-*        exit=1
== case: inline script tampered→ [verify-out] FAIL: neg/roads/view/index.html: inline script ... missing 'sha256-…'  exit=1
```

- 画面写真（12枚）: `/private/tmp/claude-501/-Users-hiro-dev-collection/2ab04b8c-1720-4813-b6f8-2c054c1ad711/scratchpad/screens/`（`{chromium,webkit}-{home,road-view,map,map-no-slash,not-found,nav-from-home}.png`）。地図はタイルを見本に差し替えたので緑の面だけだが、＋/− と出典の表示は出ている。

### 3.5 `--ignore-scripts` でビルドできるか（質問 d への答え）

【事実】`node_modules` を消してから:

```
pnpm install --frozen-lockfile --offline --ignore-scripts   → Done in 2.5s
pnpm build --ignore-scripts                                  → [verify-out] OK: 6 HTML file(s) ... / exit=0
```

- Next のコンパイラ（SWC と Turbopack）は `@next/swc-darwin-arm64@16.3.6` という**ビルド済みの部品**で届き、インストール時のスクリプトは要らない。lockfile に `requiresBuild: true` の行は0件。
- 注意: `pnpm build --ignore-scripts` は `prebuild`・`postbuild` を飛ばす。だから CSP の後処理は `postbuild` ではなく、**`build` の中に `&&` でつなぐ**（決定2）。もし誰かが `postbuild` に移しても、`verify-out` が止める。
- 【未確認】CI（Linux）では `@next/swc-linux-x64-gnu@16.3.6` を使う（lockfile 550 行目にある）。同じくビルド済みの部品なので動くはず【推論】。段階1 の CI で確かめる。

### 3.6 fake-indexeddb@6.2.5（質問 e への答え。インストールはしていない）

【事実】`pnpm view fake-indexeddb@6.2.5 …`（2026-10-08 取得）:

| 項目 | 結果 |
|---|---|
| 最新版 | `latest: 6.2.5` |
| 公開日 | `2025-11-07T15:23:51Z`。cooldown（7日 = `minimumReleaseAge: 10080`）を大きく過ぎている |
| 実行時の依存 | なし（`dependencies` が空） |
| インストール時のスクリプト | `preinstall`・`install`・`postinstall` は**なし**。`prepare: "husky"` はあるが、レジストリから入れるパッケージでは動かない【推論】。そのうえ pnpm 10 は依存のスクリプトを許可制で止める（`pnpm-workspace.yaml` のコメント） |
| メンテナ | 1人（dumbmatter） |
| integrity | `sha512-CGnyrvbhPlWYMngksqrSSUT1BAVP49dZocrHuK0SvtR0D5TMs5wP0o3j7jexDJW01KSadjBp1M/71o/KR3nD1w==` |
| Socket の供給網スコア | **【未確認】**（入れる前に supply-chain-auditor が `depscore` で確かめる。REVIEW 2.4 の条件②） |

## 4. 試作で分かった、設計の直し

### 4.1 ハッシュはビルドの後にしか作れない
3.2 (a) のとおり。`vercel.json` にハッシュを書く案は成り立たない。ARCH 3.2 の「後処理」で正しい。

### 4.2 ローカルでは `upgrade-insecure-requests` を外す（ARCH:470 への追記）
【事実】最初に試したとき、WebKit だけ JS が動かず「読み込み中…」のままだった。原因は CSP の `upgrade-insecure-requests` で、WebKit は `http://127.0.0.1:4173` の部品まで `https://127.0.0.1:4173/_next/static/…` に書きかえて読みにいき、つながらなかった（`The network connection was lost.`）。Chromium は 127.0.0.1 を書きかえない。
→ `serve-static.mjs` は http でしか動かないので、**この1項目だけローカルで外す**（コメントに理由を書いた）。本番は https だけなので、本番では何も変わらない【推論】。E2E の結果を読むときは「ローカルのヘッダー＝本番のヘッダーから `upgrade-insecure-requests` を除いたもの」と覚えておく。

### 4.3 meta CSP の位置は `<meta charSet>` のすぐ後
【事実】Next は `<head>` の最初に `<meta charSet="utf-8"/>` を出す。HTML の決まりでは文字コードの宣言はファイルの最初の 1024 バイトに入っている必要がある【事実（HTML 仕様。今回は原文を開き直していない）】。meta CSP はハッシュが増えると長くなるので、先頭に入れると文字コードの宣言を押し出す恐れがある。
→ `charSet` の後に入れる。CSP が効かないといけない `script`・`link`・`style` より前にあることは `verify-out.mjs` で必ず確かめる。

### 4.4 `.vercel/` のコピーに注意
`apps/road-review/.vercel/project.json` は本物のプロジェクト `road-review` を指している。試作やコピーを作るときに `.vercel/` を一緒に持っていくと、`vercel deploy` が本物のプロジェクトに出してしまう。試作では消した。6章の手順でも、別の名前のプロジェクトを使う。

## 5. Vercel の上での確認（2026-10-08 に実施）

CEO の承認（2026-10-08、6章どおり）を受けて、使い捨てのプロジェクト `road-review-spike-static` に出して確かめた。本物のプロジェクト `road-review`・その環境変数・本番には触れていない（`vercel project ls` で `road-review` の更新日時が「21h」のまま変わっていないことを確認）。

- デプロイ ID: `dpl_3bYQAbUn7WGqZTuQa9LiUCRHCASD`
- デプロイの URL: `https://road-review-spike-static-cqeppdabn-<team-slug>.vercel.app`（保護あり。V-9）
- 別名（alias）: `https://road-review-spike-static.vercel.app`（**保護なしで誰でも見られる**。下の「想定と違ったこと」の1）
- 検査は、2つの URL が同じデプロイを指していることを `vercel inspect road-review-spike-static.vercel.app` で確かめたうえで、別名のほうで行った

### 5.1 想定と違ったこと（先に）

1. **`--prod` を付けなかったのに、本番扱いのデプロイになった。**【事実】`vercel deploy --yes --logs` の出力は `▲ Production https://road-review-spike-static-cqeppdabn-…vercel.app`、`"target": "production"` で、`https://road-review-spike-static.vercel.app` という別名が付いた。新しく作ったばかりで Git 連携のないプロジェクトでは、最初のデプロイが本番扱いになるようだ【推論】。影響があるのは使い捨てのプロジェクトだけで、本物の `road-review` の本番には影響しない。ただし、この別名は**ログインなしで誰でも開ける**。中身は試作の静的ページだけ（データ・鍵なし）。保護の設定は変えていない（指示どおり）。片付けるかどうか（プロジェクトの削除）は、CEO の別の承認を待つ。
   - **教訓（決まりにする）**: Vercel CLI でデプロイするときは、**必ず `--target preview` を付ける**。`--prod` を付けないだけでは Preview になるとは限らない（新しいプロジェクトの最初のデプロイは本番扱いになり、誰でも開ける別名が付いた）。`vercel deploy --help` に `--target <TARGET>` があることは確認済み。
   - 後始末: CEO の承認（2026-10-08）を受けて、プロジェクトごと削除した（7章）。誰でも開ける状態だった時間は、デプロイ（23:49Z ごろ）から削除までの約10分。
2. **`/roads` → `/` の転送が効かなかった（V-3 の一部が不合格）。**【事実】`/roads` は `308 location: /roads/` になり、`/roads/` は `404` だった。Vercel は `trailingSlash` の転送（`/roads` → `/roads/`）を `redirects` より先に行うため、`"source": "/roads"` に届かない【推論。3.3 の `convertTrailingSlash` のとおりの動き】。
   - 直し方（段階7 で入れる。今回はもう一度デプロイはしていない）: `"redirects": [{ "source": "/roads/", "destination": "/", "permanent": false }]` にする。ローカルの `serve-static.mjs` も Vercel と同じ順番（trailingSlash → redirects）に直す。今のローカルのサーバーは順番が逆だったので、この不具合を見つけられなかった。

### 5.2 結果の一覧

| # | 確かめたこと | 結果 | 証拠 |
|---|---|---|---|
| V-1 | Vercel の上で後処理つきの `pnpm build` が動き、後処理した `out/` がそのまま配られるか | **合格** | Build Logs: `> next build && node scripts/csp/inject-meta-csp.mjs out && node scripts/csp/verify-out.mjs out` → `[inject-meta-csp] … 3 inline script hash(es)` ×6 → `[verify-out] OK: 6 HTML file(s) carry a hash-only meta CSP` → `Build Completed in /vercel/output [27s]`。配られた HTML: `GET / 200 metaCsp=1`、`/roads/view/ 200 metaCsp=1`、`/map/ 200 metaCsp=1`、`/no-such-page/ 404 metaCsp=1`。**Vercel から取った HTML 4つに `verify-out.mjs` をかけて `[verify-out] OK: 4 HTML file(s) …`（exit=0）** ＝ Vercel は HTML の中身を変えていない |
| V-2 | `vercel.json` の `headers` が付くか | **合格** | `curl -sI /`: `content-security-policy: … frame-ancestors 'none'; upgrade-insecure-requests`、`strict-transport-security: max-age=63072000; includeSubDomains`、`x-frame-options: DENY`、`x-content-type-options: nosniff`、`referrer-policy: strict-origin-when-cross-origin`、`permissions-policy: geolocation=(), camera=(), microphone=(), payment=()`、`cross-origin-opener-policy: same-origin`。404 のページにも CSP ヘッダーが付く |
| V-3 | 転送 | **一部不合格** | `/map` → `308 /map/` 〇、`/roads/view` → `308 /roads/view/` 〇、`/map/index.html` → `200`（`cleanUrls` なしなので転送なし。想定どおり）、**`/roads` → `308 /roads/` → `404` ×**（5.1 の2） |
| V-4 | ない URL で 404.html が 404 で返り、meta CSP がある | **合格** | `GET /no-such-page/ status=404 metaCsp=1` |
| V-5 | HSTS が二重にならないか | **合格** | 別名では `strict-transport-security` は1行だけで、`vercel.json` の値だった。保護のかかったデプロイの URL では、Vercel 自身の値（`max-age=63072000; includeSubDomains; preload`）が1行だけ出た（保護のページは Vercel が返すため） |
| V-6 | プロジェクト側で Next.js と判定されても `framework: null` が優先されるか | **合格** | `vercel link` は `Detected Next.js` と表示したが、Build Logs は `vercel.json` の `buildCommand`・`installCommand` で動き、配られたのは後処理済みの `out/`（V-1）。Next 用のサーバーの部品は出ていない |
| V-7 | 本物の https で CSP 違反0件 | **合格（自動の確認）** | `BASE_URL=https://road-review-spike-static.vercel.app node scripts/verify-browser-remote.mjs` → Chromium・WebKit（390×844）の全ページで `violations:0`、`useSearchParams` の ID 表示 〇、リンクでの画面の切り替え 0件、対照実験（ハッシュのあるテーマ用スクリプトは動く／ハッシュのないスクリプトは `script-src-elem` で止まる）〇、タイルの通信先は `cyberjapandata.gsi.go.jp` だけ、`RESULT: PASS`。https では WebKit で `upgrade-insecure-requests` があっても問題なし（4.2 の推論が当たっていた）。画面写真: `scratchpad/screens-vercel/`。**CEO の iPhone での1枚は未実施**（REVIEW 段階0 の写真。別名の URL で見られる） |
| V-8 | 組み立て機の Node・pnpm | **合格（注意1つ）** | `Detected pnpm-lock.yaml version 9 generated by pnpm@10.x from package.json#packageManager pnpm@10.29.2`、`pnpm install --frozen-lockfile` → `Done in 14.5s using pnpm v10.29.2`。注意: `Warning: Detected "engines": { "node": ">=22.0.0" } … will automatically upgrade when a new major Node.js Version is released`。プロジェクトの Node は 24.x（`vercel project ls`）。段階1 で `engines` を `22.x` か `24.x` に固定するか決める |
| V-9 | 保護で `curl` が止まるか | **止まる（デプロイの URL）** | デプロイの URL は全ページ `302 location: https://vercel.com/sso-api?…`（Vercel Authentication）。保護の設定は変えていない。別名（本番扱い）には保護がかからないので、検査はそちらで行った |

### 5.3 判定

- **ハッシュ CSP を後から HTML に入れる方式は、Vercel（`framework: null`＋`outputDirectory: "out"`）で効く。**ARCH 3.2 の【要検証】(a)(b) はどちらも成り立った。CEO 決定2（効くまで公開しない）の条件は、技術的には満たした。
- 残り: `/roads` の転送の直し（段階7）、CEO の iPhone での1枚、使い捨てプロジェクトの片付け（CEO の承認待ち）。

### 5.4 使ったコマンド

```bash
SPIKE=/private/tmp/claude-501/-Users-hiro-dev-collection/2ab04b8c-1720-4813-b6f8-2c054c1ad711/scratchpad/spike-static
ls -a "$SPIKE" | grep -E '^\.vercel'                         # 0) 出力なし ＝ つながっていない
vercel project ls                                            # road-review-spike-static が無いことを確認
vercel link --cwd "$SPIKE" --yes --project road-review-spike-static   # → Linked <team-slug>/road-review-spike-static
vercel deploy --cwd "$SPIKE" --yes --logs                    # → READY（target は production だった。5.1）
bash scratchpad/vchecks.sh https://road-review-spike-static.vercel.app   # V-1〜V-5
node scripts/csp/verify-out.mjs fetched                      # Vercel から取った HTML に関所をかける
BASE_URL=https://road-review-spike-static.vercel.app node scripts/verify-browser-remote.mjs ../screens-vercel   # V-7
```

## 6. Preview に出す手順（CEO が 2026-10-08 に承認。実行済み。結果は5章）

**方針**: 本物のプロジェクト `road-review` は**使わない**。使い捨ての別プロジェクト `road-review-spike-static` を作り、試作のフォルダだけを CLI で出す。理由は2つ: ①本物のプロジェクトの設定（枠組み・環境変数）を変えずに済む ②`feat/road-review-v2` を GitHub に push すると、Git 連携で**本物のアプリの Preview** が自動で作られてしまう【推論：budget-app と同じ設定なら】ので、push で試すのは避ける。本番（`--prod`）は使わない。

試作の `vercel.json`（このまま使う）:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm build",
  "outputDirectory": "out",
  "trailingSlash": true,
  "redirects": [{ "source": "/roads", "destination": "/", "permanent": false }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://cyberjapandata.gsi.go.jp; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Permissions-Policy", "value": "geolocation=(), camera=(), microphone=(), payment=()" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains" }
      ]
    }
  ]
}
```

`.vercelignore`: `node_modules` / `.next` / `out` / `.env*`（`!.env.example`）/ `.vercel`（ソースだけを上げ、Vercel の上でビルドさせる。V-1 を確かめるため、手元の `out/` は上げない）。

実行するコマンド（CEO の承認の後に devops-engineer が行う）:

```bash
SPIKE=/private/tmp/claude-501/-Users-hiro-dev-collection/2ab04b8c-1720-4813-b6f8-2c054c1ad711/scratchpad/spike-static
# 0) 本物のプロジェクトにつながっていないことを確かめる（何も出なければよい）
ls "$SPIKE/.vercel" 2>/dev/null
# 1) 使い捨てのプロジェクトを新しく作ってつなぐ（本物の road-review とは別）
vercel link --cwd "$SPIKE" --yes --project road-review-spike-static
# 2) Preview に出す（--prod は付けない）。URL を控える
vercel deploy --cwd "$SPIKE" --yes --logs
```

確かめるコマンド（`URL` は 2) で出た Preview の URL）:

```bash
for p in / /roads/view/ /map/ /no-such-page/; do
  echo "== $p"; curl -s "$URL$p" -o /tmp/page.html -w 'status=%{http_code}\n'
  grep -o '<meta http-equiv="Content-Security-Policy"[^>]*>' /tmp/page.html | cut -c1-120
done
curl -sI "$URL/" | grep -iE 'content-security-policy|strict-transport|x-frame|permissions-policy|referrer|x-content-type'
curl -sI "$URL/map"   | grep -iE '^HTTP|^location'     # 308 → /map/
curl -sI "$URL/roads" | grep -iE '^HTTP|^location'     # 307 → /
```

加えて、ローカルの `verify-out.mjs` を、Preview から取った HTML にもかける（取った HTML を `out/` の形に並べて実行）と、Vercel が中身を変えていないことまで確かめられる。

合格の条件（REVIEW 段階0 の受入条件）: 全ページに meta CSP が1つ／ヘッダーに `frame-ancestors 'none'` と HSTS／ブラウザのコンソールに CSP 違反0件／CEO の iPhone で Preview のトップを1枚。

## 7. 元に戻す方法（ロールバック）

- **Preview の試し（6章）を片付ける → 2026-10-08 に実施済み（CEO の承認あり）**。
  1. `vercel project ls` で、消す相手がちょうど `road-review-spike-static` であり `road-review` ではないことを確かめた。
  2. `vercel project remove road-review-spike-static`（確認の質問にはこの名前のときだけ `y` で答えた）→ `> Success! Project road-review-spike-static removed [1s]`。
  3. 確かめ【事実】: `vercel project ls` の一覧は `budget-app` と `road-review` だけになった。`curl -sI https://road-review-spike-static.vercel.app/` → `HTTP/2 404`・`x-vercel-error: DEPLOYMENT_NOT_FOUND`（消した直後の1回目だけは 200 が返った。端の保存（キャッシュ）が残っていたと見られる【推論】。もう一度で 404）。保護のかかったデプロイの URL は、消した後もログイン画面への 302 を返す。ログインの壁が先に返るので、中身が消えたかは外からは見えない【未確認】。ただしプロジェクトごとデプロイも消える、と CLI が表示した（`It will also delete everything under the project including deployments.`）。
  4. 本物の `road-review` は変わっていない（`vercel project ls` の更新日時は消す前も後も「21h」）。
  5. 手元の試作フォルダの `.vercel/` も消した（もう一度デプロイしても、どこにもつながらない）。
- **本物のアプリに入れた後（段階2・7 以降）でだめと分かったとき**: 本番は凍結中で、v2 は main に合流するまで本番に出ない（REVIEW 4章の決定3）。合流前なら、ブランチを戻すだけでよい。合流後に本番で問題が出たら、Vercel の画面で**1つ前の本番（今の v1）に戻す**（Instant Rollback）。ただし v1 は Supabase を使うので、Supabase の本番プロジェクトは **v2 が本番で動くのを確かめるまで消さない**（REVIEW 4章の決定3 と同じ）。
- **ハッシュ CSP が Vercel で効かないと分かったとき**: 公開しない（CEO 決定2）。`'unsafe-inline'` で出すことも、nonce 方式（サーバー描画）に戻すことも、CEO の判断なしには行わない。

## 8. 次にすること

1. ~~CEO が 6章の Preview を承認する → 実行して V-1〜V-9 を追記する~~ → **2026-10-08 に実施済み**（5章）。V-1・V-2・V-4〜V-8 合格。V-3 は `/roads` の転送だけ不合格。V-9 はデプロイの URL に保護がかかっていた（設定は変えていない）。
2. **CEO の iPhone で1枚**: 使い捨てプロジェクトを消したので、今は開ける URL がない。段階7 の後に、本物のアプリの Preview（`--target preview`。CEO の承認が要る）で撮る（REVIEW 段階0 の写真）。
3. ~~使い捨てプロジェクトの片付け~~ → **2026-10-08 に削除済み**（7章）。
4. 段階7 で試作のスクリプト（`scripts/csp/*`・`serve-static.mjs`）を本物のアプリへ移す。そのときに直すこと:
   - `vercel.json` の転送を `"source": "/roads/"` にする（5.1 の2）
   - `serve-static.mjs` を Vercel と同じ順番（trailingSlash → redirects）にし、`/roads` → `/roads/` → `/` をテストする
   - `verify-out.mjs` と `serve-static.mjs` に単体テストを付ける（わざと meta を外すと赤、など）
5. 段階1 の CI: `engines.node` を固定するか決める（V-8 の注意。Vercel のプロジェクトは Node 24.x）。デプロイのコマンドには `--target preview` を明示する（5.1 の1）。
6. 状態を「採用」にするかは CTO が決める（iPhone の1枚は段階7 の後に回す）。
7. ARCH に反映: 3.2 の「最初の子要素」→「`<meta charSet>` の直後」、4.1 に `vercel.json` の `trailingSlash: true` と `/roads/` の転送、10章に「ローカルでは `upgrade-insecure-requests` を外す」、12章の CI に「`build` の中に後処理を `&&` でつなぐ（`postbuild` にしない）」。
