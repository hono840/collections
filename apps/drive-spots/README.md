# ドライブスポット帳（drive-spots）

行きたい道（峠・絶景ロードなど）を自分用にメモして、行ったら「行った」に移すスマホ向けアプリです。

- **公開先**: https://hono840.github.io/collections/drive-spots/ （GitHub Pages）
- **仕様**: [`docs/product/spec.md`](docs/product/spec.md)（受入条件 AC1〜AC40。AC23〜AC29 はメモの編集、AC30〜AC40 は古い版の守り・バックアップ・名前の統一）
- **次の実装の計画（案）**: [`docs/product/plan-v2.md`](docs/product/plan-v2.md)（メモの編集・ユーザーごとのデータベース保存）
- **デザイン原本**: [`docs/design/Main.dc.html`](docs/design/Main.dc.html)

## データの保存場所

データは**使っている端末のブラウザの中（localStorage）だけ**に保存します。

- ログインはありません。サーバーにも外部のサービスにも送りません（外部への通信・トラッキングはゼロ）。
- そのため、別の端末やブラウザとは共有されません。ブラウザのデータを消すとスポットも消えます。
- 保存キーは `drive-spots:v1` です（形は仕様の AC13 を参照）。
- 保存データが壊れていたときは、元の文字列を `drive-spots:v1:backup` に残してから初期データで始めます（AC14）。残せなかったときは元の文字列を上書きしません（この端末では保存しない扱いになります）。
- 同じブラウザの別のタブや、「戻る/進む」で戻った画面とも同じデータを使います。保存の直前に最新のデータを読み直してから変更を加えるので、別のタブで保存した内容は消えません。別のタブで保存されたら表示も最新になります（AC22）。
- **バックアップ**: 一覧の「バックアップ」から、データを JSON ファイルに書き出したり、書き出したファイルを読み込んで元に戻したりできます（AC31〜AC37）。書き出しも読み込みも端末の中だけで行い、どこにも送りません。最後に書き出した日時は `drive-spots:v1:last-backup` に残します。
- **古い版の守り**: 保存データの `version` が 1 より大きいとき（新しい版のアプリが保存したデータ）は、このページでは何も書き込みません（AC30）。データの形を変えるときは、キー `drive-spots:v1` のまま `version` を上げます。

## 技術構成

| 項目 | 内容 |
| --- | --- |
| 画面 | Next.js（App Router）+ React + TypeScript + Tailwind CSS 4 |
| 出力 | 静的書き出し（`output: 'export'`、サーバーなし）。`out/` に HTML・JS・CSS・フォントができる |
| 配置パス | `basePath: '/collections/drive-spots'`（GitHub Pages の配下パスに合わせる） |
| フォント | `next/font/google` で Barlow Condensed と Zen Kaku Gothic New をビルド時に取り込む。表示時に Google へは通信しない |
| セキュリティ | ビルド後に各 HTML へ CSP（読み込んでよいものの許可リスト）を `<meta>` タグで埋め込む（下記） |
| テスト | Vitest + Testing Library（jsdom） |
| パッケージ管理 | pnpm のみ（npm / yarn / bun は使えない） |

## 開発のしかた

Node.js 22.22.0（`.node-version`）と pnpm 10.34.7（`package.json` の `packageManager`）を使います。

```bash
cd apps/drive-spots
pnpm install          # 依存のインストール（pnpm 以外はブロックされる）
pnpm dev              # 開発サーバー → http://localhost:3000/collections/drive-spots/
pnpm lint             # ESLint
pnpm typecheck        # 型チェック（tsc --noEmit）
pnpm test             # テストを1回実行（vitest run）
pnpm test:watch       # テストを監視モードで実行
pnpm build            # 本番ビルド（下記の3段階）
pnpm start            # out/ を本番と同じパスで配信 → http://127.0.0.1:3000/collections/drive-spots/
```

`pnpm dev` / `pnpm start` とも、URL の末尾は `/collections/drive-spots/` です（`/` だけでは開きません。`pnpm start` は `/` から自動で移動します）。

## ビルドの中身（`pnpm build`）

1. `next build` … `out/` に静的ファイルを書き出す
2. `scripts/csp/inject-meta-csp.mjs` … 各 HTML の中にあるスクリプトの指紋（SHA-256 ハッシュ）を計算し、CSP の `<meta>` タグを `<head>` の先頭に入れる
3. `scripts/csp/verify-out.mjs` … 次のどれかがあればビルドを失敗させる
   - CSP が無い・2つある・スクリプトより後ろにある
   - 指紋が登録されていないインラインスクリプトがある
   - CSP が自分のサイト以外（外部のドメイン、`https:`、`*` など）を許可している
   - HTML や CSS が `/collections/drive-spots/` の外のファイルを読みに行く、または読みに行くファイルが `out/` に無い

GitHub Pages はレスポンスヘッダー（サーバーが返す追加情報）を設定できないため、この `<meta>` の CSP がこのアプリの唯一の CSP です。仕組みは road-review と同じです。

## デプロイ（GitHub Pages）

`.github/workflows/drive-spots.yml` が自動で行います。

- **PR**: lint → typecheck → test → build で確認するだけ（公開はしない）
- **main への push**: 上の確認に通ったら、`out/` を `_site/drive-spots/` に置き、`_site/index.html`（`./drive-spots/` へ移動するだけのページ）と一緒に GitHub Pages へ公開
  - `out/404.html` は `_site/404.html`（サイトのいちばん上）にもコピーする。GitHub Pages は、存在しないページ（`/collections/` の下ならどこでも）に対して、サイトのいちばん上の `404.html` しか返さないため。中の URL はすべて `/collections/drive-spots/` から始まるので、どの場所で表示されても崩れない
- 手動実行（workflow_dispatch）も可能。公開は main ブランチのときだけ

初回だけ、リポジトリの Settings → Pages → Build and deployment → Source を「GitHub Actions」にする必要があります（人が行う）。

注意: GitHub Pages の公開は**サイト全体の置き換え**です。将来ほかのアプリも Pages に載せる場合は、1つのワークフローでまとめて `_site/` を作る形に変えてください。

## ディレクトリ構成

```
apps/drive-spots/
├── docs/                  # 仕様・デザイン原本
├── scripts/
│   ├── csp/               # CSP の埋め込み・検査（ビルドの一部）とそのテスト
│   ├── serve-static.mjs   # pnpm start 用の配信サーバー（GitHub Pages と同じパス構成）
│   └── site-config.mjs    # 配置パス（BASE_PATH）。next.config.ts の basePath と同じ値
├── src/app/               # 画面（Next.js App Router）
├── tests/setup.ts         # テストの共通設定
├── next.config.ts
└── package.json
```
