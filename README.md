# Collections

Hiroのアプリケーション開発コレクション。

Claude Code の C-Suite エージェントチームを活用し、企画から設計・実装・デプロイまでを一気通貫で行うモノレポです。

## チーム構成

```
Hiro (CEO / Orchestrator)
├── CTO  — 技術統括（レビュー専任、TDD指揮）
│   ├── code-architect, frontend-developer, backend-developer
│   ├── test-writer, code-reviewer, devops-engineer, security-auditor
├── CPO  — プロダクト設計（レビュー専任）
│   ├── ux-researcher, feature-planner, qa-engineer
├── CSO  — 事業戦略（レビュー専任）
│   ├── market-researcher, competitive-analyst
├── CMO  — マーケティング（レビュー専任）
│   ├── content-creator, analytics-specialist, seo-specialist
└── CFO  — コスト分析（レビュー専任）
    ├── cost-analyzer, pricing-strategist
```

C-Suite は直接手を動かさず、サブエージェントに委譲 → レビュー → フィードバックの **PDCAサイクル** で品質を高めます。

## アプリケーション

| アプリ                          | 説明                                 | 技術スタック                                | ステータス            |
| ------------------------------- | ------------------------------------ | ------------------------------------------- | --------------------- |
| [budget-app](./apps/budget-app) | プライバシーファーストの家計簿アプリ | Next.js, TypeScript, Supabase, Tailwind CSS | MVP完成・デプロイ済み |

## デフォルト技術スタック

| レイヤー               | 技術                                                  |
| ---------------------- | ----------------------------------------------------- |
| フロントエンド         | Next.js (App Router), React, TypeScript, Tailwind CSS |
| バックエンド           | Supabase (Auth, Database, Storage)                    |
| テスト                 | Vitest, Playwright                                    |
| デプロイ               | Vercel                                                |
| パッケージマネージャー | pnpm                                                  |

## ディレクトリ構成

```
collections/
├── .claude/
│   ├── agents/          # C-Suite + サブエージェント定義 (22体)
│   └── skills/          # スラッシュコマンド (5つ)
├── apps/
│   └── budget-app/      # 家計簿アプリ
│       ├── src/         # ソースコード
│       ├── supabase/    # マイグレーション
│       └── docs/        # 設計ドキュメント
├── CLAUDE.md            # プロジェクトオーケストレーション定義
└── .mcp.json            # MCP サーバー設定
```

## スキル（スラッシュコマンド）

| コマンド                        | 説明                                           |
| ------------------------------- | ---------------------------------------------- |
| `/new-app {name} {description}` | C-Suite 総動員でアプリを新規作成（TDD + PDCA） |
| `/review`                       | CTO + CPO による並列コードレビュー（委譲型）   |
| `/strategy {topic}`             | CSO + CMO + CFO の戦略セッション（委譲型）     |
| `/standup`                      | 全エリアの進捗チェック                         |
| `/monitor {app-name} [--full]`  | デプロイ済みアプリの評価・改善提案             |

## MCP 連携

| MCP             | 用途                           |
| --------------- | ------------------------------ |
| Supabase        | DB管理、マイグレーション       |
| Playwright      | ブラウザ E2E 検証              |
| Chrome DevTools | コンソール検出、パフォーマンス |
| Vercel          | デプロイ、ログ確認             |
| context7        | ライブラリドキュメント参照     |
| Gmail           | アウトリーチ、通知             |
| Google Calendar | スプリント管理                 |

## セットアップ

```bash
git clone git@github.com:hono840/collections.git
cd collections

# アプリごとにセットアップ
cd apps/budget-app
pnpm install
cp .env.example .env.local
# .env.local に Supabase の URL と anon key を設定
pnpm dev
```

## ライセンス

MIT
