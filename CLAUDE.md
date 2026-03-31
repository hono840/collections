# Collection - アプリ開発ハブ

## 概要

Hiroのアプリケーション開発コレクション。Hiroが**CEO/オーケストレーター**として、C-Suiteエージェントチームを指揮し、アプリケーションの設計・構築・リリースを行う。

## 組織モデル: 委譲型PDCAサイクル

**C-Suiteは直接手を動かさない。** サブエージェントに作業を委譲し、成果物をレビュー・フィードバックしてPDCAサイクルで品質を高める。最終成果物はHiroが評価する。

```
PDCA サイクル:
  Plan → C-Suiteが作業方針と品質基準を決定
  Do   → サブエージェントが実行
  Check → C-Suiteが成果物をレビュー
  Act  → フィードバック → サブエージェントが改善（最大2回）
```

## チーム構成

```
Hiro (CEO / Orchestrator)
├── CTO  - 技術アーキテクチャ、コード品質、実装の指揮（レビュー専任）
│   ├── code-architect      - 設計専任（アーキテクチャ、ファイル構成）
│   ├── frontend-developer  - フロントエンド実装（React/Next.js、UI）
│   ├── backend-developer   - バックエンド実装（Server Actions、DB）
│   ├── test-writer         - テスト作成（Vitest、Playwright）
│   ├── code-reviewer       - コード品質レビュー（確信度80%以上のみ）
│   ├── devops-engineer     - デプロイ、CI/CD、インフラ
│   └── security-auditor    - 脆弱性スキャン、セキュリティベストプラクティス
├── CPO  - プロダクト設計、要件定義、ユーザーストーリー（レビュー専任）
│   ├── ux-researcher       - 競合UI分析、UXパターン
│   ├── feature-planner     - 詳細機能仕様、受入条件
│   └── qa-engineer         - テスト計画、品質保証
├── CSO  - 事業戦略、市場/競合分析（レビュー専任）
│   ├── market-researcher   - 市場データ、トレンド分析
│   └── competitive-analyst - 競合詳細調査、SWOT分析
├── CMO  - マーケティング、ブランディング、UXコピー、アウトリーチ（レビュー専任）
│   ├── content-creator     - マーケティングコピー、README、ランディングページ
│   ├── analytics-specialist - メトリクス計装、アナリティクス戦略
│   └── seo-specialist      - SEO戦略、キーワード調査、メタタグ最適化
└── CFO  - コスト分析、収益モデル、予算管理（レビュー専任）
    ├── cost-analyzer       - API料金、ホスティングコスト調査
    └── pricing-strategist  - マネタイズモデル、価格設計
```

## コミュニケーションプロトコル

- **Hiroへの報告**: 日本語で簡潔に
- **エージェント間 / コード**: English
- **意思決定**: 重要な方向転換は必ずHiroの承認を得る（承認ゲート）

## デフォルト技術スタック

- **フロントエンド**: Next.js (App Router), React, TypeScript, Tailwind CSS
- **バックエンド**: Supabase (Auth, Database, Storage)
- **テスト**: Vitest, Playwright (E2E)
- **デプロイ**: Vercel
- **パッケージマネージャー**: pnpm

上記はデフォルト設定であり、各アプリの要件に応じて変更可能。

## アプリ規約

各アプリケーションは `apps/{app-name}/` に格納し、以下を含む:

- `package.json`
- `README.md`
- ソースコード

## 出力ディレクトリ

- `docs/strategy/` — CSO成果物（市場分析、競合インテリジェンス）
- `docs/product/` — CPO成果物（PRD、ユーザーストーリー、仕様書）
- `docs/marketing/` — CMO成果物（コピー、ブランディング、ローンチ計画）
- `docs/finance/` — CFO成果物（コスト見積もり、価格モデル）

## スキル（スラッシュコマンド）

- `/new-app {name} {description}` — C-Suite総動員アプリ作成（委譲型PDCA）
- `/review` — CTO + CPO 並列レビューサイクル（委譲型PDCA）
- `/strategy {topic}` — CSO + CMO + CFO 戦略セッション（委譲型PDCA）
- `/standup` — C-Suite全エリア進捗チェック
- `/monitor {app-name} [--full]` — デプロイ済みアプリの健全性評価・改善提案

## MCP連携

### 常時有効

- **context7** → CTO, code-architect: ライブラリ/フレームワークのドキュメント参照
- **Gmail** → CMO: アウトリーチ下書き / CFO: 請求リマインダー
- **Google Calendar** → CPO: スプリントマイルストーン / CMO: ローンチスケジューリング
- **Supabase** → CTO, devops-engineer: DB操作、マイグレーション、プロジェクト管理
- **Playwright** → code-reviewer, qa-engineer: ブラウザE2E検証、コンソールエラー検出、スクリーンショット取得。`/review` スキル実行時にブラウザ検証を自動実施。

### オンデマンド利用可能

- Chrome DevTools, PostgreSQL/SQLite, GitHub, Firebase, Linear, Slack, Discord — 各アプリの要件に応じて必要時に連携。

## ドキュメント管理ルール

以下の変更が入った場合、関連ドキュメントの更新を必ず検討すること:

| 変更内容                     | 更新が必要な可能性があるドキュメント               |
| ---------------------------- | -------------------------------------------------- |
| エージェントの追加/削除/変更 | README.md, CLAUDE.md（チーム構成、エージェント数） |
| スキルの追加/削除/変更       | README.md, CLAUDE.md（スキル一覧）                 |
| MCP連携の追加/削除           | CLAUDE.md（MCP連携セクション）                     |
| アプリの追加                 | README.md（アプリケーション一覧）                  |
| 技術スタックの変更           | README.md, CLAUDE.md, 該当アプリのREADME           |
| ディレクトリ構成の変更       | README.md（ディレクトリ構成）                      |

PostToolUse hook により、Write/Edit 実行時に自動でドキュメント更新の必要性が判定される。

## モデルポリシー

全エージェントは**opus**モデルを使用し、最高品質を維持。コスト削減のためのダウングレードは行わない。
