# Budget App

**5秒で支出を記録。プライバシーファーストの家計簿アプリ。**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

![Dashboard](./docs/screenshots/dashboard.png)

---

## なぜ Budget App なのか

家計簿アプリは数多くありますが、そのほとんどが「高機能すぎて続かない」か「データが第三者に渡る不安」を抱えています。Budget App は**記録のハードルを極限まで下げ**、あなたのデータを**あなただけのもの**にします。

## 主な特徴

| 特徴 | 説明 |
|------|------|
| **5秒入力** | フローティングボタンから金額とカテゴリを選ぶだけ。レシートを見ながら片手で完了 |
| **プライバシーファースト** | Supabase の Row Level Security により、データは本人のみアクセス可能 |
| **カテゴリ別予算管理** | 食費、交通費、娯楽費など12カテゴリに月次予算を設定し、使いすぎを防止 |
| **ビジュアルレポート** | 円グラフ・棒グラフで月別の支出傾向を一目で把握 |
| **ダークモード** | システム設定に連動。手動切り替えにも対応 |
| **PWA 対応** | ホーム画面に追加すれば、ネイティブアプリのような操作感 |
| **多通貨対応** | 日本円 (JPY) と 米ドル (USD) をサポート |

## 技術スタック

| レイヤー | 技術 | 用途 |
|----------|------|------|
| フレームワーク | Next.js 16 (App Router) | SSR / RSC / ルーティング |
| 言語 | TypeScript 5 | 型安全性 |
| UI | Tailwind CSS 4 | スタイリング |
| アイコン | Lucide React | アイコンセット |
| 認証 / DB | Supabase | Auth, PostgreSQL, RLS |
| フォーム | React Hook Form + Zod | バリデーション |
| チャート | Recharts | データ可視化 |
| 仮想化 | TanStack Virtual | 大量リストの高速描画 |
| テスト | Vitest + Playwright | ユニット / E2E |
| デプロイ | Vercel | ホスティング |

## クイックスタート

### 前提条件

- Node.js 20+
- pnpm 9+
- Supabase アカウント（[supabase.com](https://supabase.com) で無料作成）

### 1. インストール

```bash
cd apps/budget-app
pnpm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local` を編集し、Supabase のプロジェクト情報を設定します。

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Supabase のセットアップ

```bash
# Supabase CLI でローカル開発環境を起動
pnpm supabase start

# マイグレーションを適用
pnpm supabase db push
```

### 4. 開発サーバーの起動

```bash
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## プロジェクト構成

```
src/
├── app/
│   ├── (auth)/           # 認証関連ページ (ログイン / サインアップ / パスワードリセット)
│   ├── (app)/            # 認証済みユーザー向けページ
│   │   ├── dashboard/    # ダッシュボード (月次サマリー / カテゴリ別予算)
│   │   ├── transactions/ # 取引一覧 (フィルター / ページネーション)
│   │   ├── budgets/      # 予算設定
│   │   ├── categories/   # カテゴリ管理
│   │   ├── reports/      # レポート (チャート / 月次比較)
│   │   └── settings/     # 設定 (通貨 / テーマ)
│   └── layout.tsx        # ルートレイアウト
├── components/
│   ├── ui/               # 汎用 UI (Dialog / Toast / Skeleton)
│   ├── layout/           # レイアウト (Sidebar / Header / BottomNav)
│   ├── transactions/     # 取引関連 (クイック入力 / 一覧 / 編集)
│   ├── dashboard/        # ダッシュボード (サマリー / 予算進捗)
│   ├── budgets/          # 予算関連 (フォーム / カテゴリ別設定)
│   ├── categories/       # カテゴリ関連 (アイコン選択 / 管理)
│   ├── reports/          # レポート (円グラフ / 棒グラフ / 月次ナビ)
│   └── settings/         # 設定
├── lib/
│   ├── supabase/         # Supabase クライアント (client / server / middleware)
│   ├── validations/      # Zod バリデーションスキーマ
│   ├── constants/        # 定数 (カテゴリ / 通貨)
│   ├── hooks/            # カスタムフック
│   └── utils/            # ユーティリティ (フォーマット / 予算計算)
└── types/                # 型定義 (アプリ / データベース)
```

## デプロイ

### Vercel へのデプロイ

1. [Vercel](https://vercel.com) にリポジトリを接続
2. ルートディレクトリを `apps/budget-app` に設定
3. 環境変数を設定:

| 変数名 | 値 |
|--------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

4. デプロイを実行

```bash
# Vercel CLI を使う場合
vercel --prod
```

## 開発コマンド

```bash
pnpm dev          # 開発サーバー起動
pnpm build        # プロダクションビルド
pnpm start        # プロダクションサーバー起動
pnpm lint         # ESLint によるコード検査
```

## ライセンス

[MIT](./LICENSE)
