# 公道レビュー（road-review）

自分が走った道（峠・スカイライン・海岸線・林道など）と、その道の走行記録を、自分だけのために残しておくアプリです。データは本人だけが読み書きできます。

> 現在は Sprint 0（土台づくり）の段階です。画面はまだありません。

## 技術スタック

Next.js 16（App Router）/ React 19 / TypeScript / Tailwind CSS 4 / Supabase（Auth・DB・Storage）/ Leaflet（地図。国土地理院タイル）/ Vitest / Playwright / Vercel / pnpm

詳しい設計は [docs/product/road-review-architecture.md](docs/product/road-review-architecture.md) を見てください。

## はじめかた

```bash
# Node 22.22.0（.node-version）と pnpm 10.29.2 を使う
pnpm install --frozen-lockfile
cp .env.example .env.local   # 値を入れる
pnpm dev
```

## コマンド

| コマンド         | 内容                                                 |
| ---------------- | ---------------------------------------------------- |
| `pnpm dev`       | 開発サーバー                                         |
| `pnpm build`     | 本番ビルド                                           |
| `pnpm lint`      | ESLint（Atomic Design の import 制限を含む）         |
| `pnpm typecheck` | 型チェック                                           |
| `pnpm test`      | 単体・コンポーネントテスト（Vitest / jsdom）         |
| `pnpm test:rls`  | DB・RLS テスト（ローカルの Supabase が必要）         |
| `pnpm test:e2e`  | E2E テスト（Playwright。ローカルの Supabase が必要） |

## 環境変数

`.env.example` を見てください。`SUPABASE_SERVICE_ROLE_KEY` はテスト専用で、Vercel やアプリの実行環境には設定しません。

## インフラの決めごと

- パッケージマネージャーは pnpm だけ（npm / yarn / bun は使えません）。
- `pnpm-workspace.yaml` の `minimumReleaseAge`（公開から7日たっていない版は入れない）で、公開直後の悪いパッケージを避けます。
- `supabase/config.toml` はローカル用です。新規登録はオフ（`enable_signup = false`）で、ログインメールにはリンクと6桁のコードの両方が入ります。
- デプロイは Vercel（Root Directory: `apps/road-review`、Install Command: `pnpm install --frozen-lockfile`）。本番設定は Sprint 5 で行います。
