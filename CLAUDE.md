# Collection - アプリ開発ハブ

## 概要

Hiroのアプリケーション開発コレクション。Hiroが**CEO/オーケストレーター**として、C-Suiteエージェントチームを指揮し、アプリケーションの設計・構築・リリースを行う。

## チーム構成

```
Hiro (CEO / Orchestrator)
├── CTO  - 技術アーキテクチャ、コード品質、実装
│   ├── code-architect      - コンポーネント設計、アーキテクチャ設計図
│   ├── code-reviewer       - コード品質レビュー（確信度80%以上のみ）
│   ├── devops-engineer     - デプロイ、CI/CD、インフラ
│   └── security-auditor    - 脆弱性スキャン、セキュリティベストプラクティス
├── CPO  - プロダクト設計、要件定義、ユーザーストーリー
│   ├── ux-researcher       - 競合UI分析、UXパターン
│   ├── feature-planner     - 詳細機能仕様、受入条件
│   └── qa-engineer         - テスト計画、品質保証
├── CSO  - 事業戦略、市場/競合分析
│   ├── market-researcher   - 市場データ、トレンド分析
│   └── competitive-analyst - 競合詳細調査、SWOT分析
├── CMO  - マーケティング、ブランディング、UXコピー、アウトリーチ
│   ├── content-creator     - マーケティングコピー、README、ランディングページ
│   └── analytics-specialist - メトリクス計装、アナリティクス戦略
└── CFO  - コスト分析、収益モデル、予算管理
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

- `docs/strategy/`  — CSO成果物（市場分析、競合インテリジェンス）
- `docs/product/`   — CPO成果物（PRD、ユーザーストーリー、仕様書）
- `docs/marketing/` — CMO成果物（コピー、ブランディング、ローンチ計画）
- `docs/finance/`   — CFO成果物（コスト見積もり、価格モデル）

## スキル（スラッシュコマンド）

- `/new-app {name} {description}` — C-Suite総動員アプリ作成
- `/review` — CTO + CPO 並列レビューサイクル
- `/strategy {topic}` — CSO + CMO + CFO 戦略セッション
- `/standup` — C-Suite全エリア進捗チェック

## MCP連携

### 常時有効
- **context7** → CTO, code-architect: ライブラリ/フレームワークのドキュメント参照
- **Gmail** → CMO: アウトリーチ下書き / CFO: 請求リマインダー
- **Google Calendar** → CPO: スプリントマイルストーン / CMO: ローンチスケジューリング
- **Supabase** → CTO, devops-engineer: DB操作、マイグレーション、プロジェクト管理
- **Playwright** → code-reviewer, qa-engineer: ブラウザE2E検証、コンソールエラー検出、スクリーンショット取得。`/review` スキル実行時にブラウザ検証を自動実施。

### オンデマンド利用可能
- Chrome DevTools, PostgreSQL/SQLite, GitHub, Firebase, Linear, Slack, Discord — 各アプリの要件に応じて必要時に連携。

## モデルポリシー

全エージェントは**opus**モデルを使用し、最高品質を維持。コスト削減のためのダウングレードは行わない。
