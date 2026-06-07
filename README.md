# Collections

Hiroのアプリケーション開発コレクション。

Claude Code の C-Suite エージェントチームを活用し、企画から設計・実装・デプロイまでを一気通貫で行うモノレポです。

## チーム構成

```
Hiro (CEO / Orchestrator)
├── CTO  — 技術統括（レビュー専任、TDD指揮）
│   ├── code-architect, frontend-developer, backend-developer
│   ├── test-writer, code-reviewer, devops-engineer, security-auditor
│   ├── supply-chain-auditor
├── CPO  — プロダクト設計（レビュー専任）
│   ├── ux-researcher, ui-ux-designer, feature-planner, qa-engineer
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
| [worldcup-kickoff](./apps/worldcup-kickoff) | ルール・選手・国を知らない初心者でも楽しめる 2026 W杯 観戦ガイド | Next.js, TypeScript, Tailwind CSS（全SSG・localStorage・DBなし） | MVP完成 |
| [carskiida](./apps/carskiida) | 車種を「世代史 × パーツ構造 × 生産地」で立体的に引ける日本語の自動車百科事典 | Next.js, TypeScript, Supabase, Tailwind CSS（SSG/ISR・PGroonga・全フィールド出典付き） | MVP完成（Sprint 1-4：詳細/比較/検索/用語/回遊/お気に入り）・データはシード稼働 |

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
│   ├── agents/          # C-Suite + サブエージェント定義 (24体)
│   ├── skills/          # スラッシュコマンド (6つ)
│   ├── hooks/           # PreToolUse インストールガード / SessionStart セキュリティ確認
│   ├── security/        # 脅威インテリジェンス (threat-intel.json)
│   └── rules/           # パス固有ルール
├── apps/
│   ├── budget-app/      # 家計簿アプリ
│   │   ├── src/         # ソースコード
│   │   ├── supabase/    # マイグレーション
│   │   └── docs/        # 設計ドキュメント
│   ├── worldcup-kickoff/ # 2026 W杯 初心者向け観戦ガイド
│   │   ├── src/         # ソースコード（Atomic Design）
│   │   └── docs/        # PRD・設計・マーケティング
│   └── carskiida/       # 自動車百科事典（世代史 × パーツ構造 × 生産地）
│       ├── src/         # ソースコード（Atomic Design）
│       ├── supabase/    # マイグレーション（スキーマ・RLS・keep-alive）
│       └── docs/        # 市場分析・PRD・アーキ・デザイン仕様・コスト
├── docs/
│   └── security/        # サプライチェーン監査レポート・運用ガイド
├── .github/
│   ├── workflows/       # CI/CD（セキュリティ監視・脅威データ日次更新ほか）
│   └── scripts/         # build-threat-intel.mjs（脅威データ収集）
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
| `/supply-chain [app-name] [--fix]` | サプライチェーン能動巡回（依存/lockfile/CI注入を監査 → 致命的リスクをissue起票） |

## MCP 連携

| MCP             | 用途                           |
| --------------- | ------------------------------ |
| Supabase        | DB管理、マイグレーション       |
| Socket (socket-mcp) | 依存の供給網スコア取得（`depscore`）・悪質パッケージ検出。キー不要 |
| Playwright      | ブラウザ E2E 検証              |
| Chrome DevTools | コンソール検出、パフォーマンス |
| Vercel          | デプロイ、ログ確認             |
| context7        | ライブラリドキュメント参照     |
| Gmail           | アウトリーチ、通知             |
| Google Calendar | スプリント管理                 |

## 自動化ワークフロー（GitHub Actions）

| ワークフロー | スケジュール | 内容 |
| --- | --- | --- |
| [Supabase Keep-Alive](.github/workflows/supabase-keep-alive.yml) | 毎日 JST 9:00 | Supabase 無料プランの7日間非アクティブ停止を防ぐ ping |
| [App Health Check](.github/workflows/health-check.yml) | 毎日 JST 10:00 | デプロイ済みアプリの死活監視（失敗時は issue を自動作成） |
| [Supply Chain Security](.github/workflows/supply-chain-security.yml) | PR / push / 毎日 JST 9:00 | pnpm audit・OSV・Socket・ワークフロー注入スキャン（致命的検出で issue 起票） |
| [Threat Intel Refresh](.github/workflows/threat-intel-refresh.yml) | 毎日 JST 3:00 | GitHub malware advisory から脅威データ（denylist）を更新・自動コミット |

> サプライチェーン攻撃（shai-hulud 級）対策の全体像は [`docs/security/README.md`](./docs/security/README.md) を参照。

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
