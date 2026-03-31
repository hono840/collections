---
name: monitor
description: Evaluate deployed apps and generate improvement proposals
argument-hint: <app-name> [--full]
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Agent
  - Write
  - mcp__playwright__browser_navigate
  - mcp__playwright__browser_click
  - mcp__playwright__browser_take_screenshot
  - mcp__playwright__browser_console_messages
  - mcp__playwright__browser_snapshot
  - mcp__playwright__browser_network_requests
  - mcp__vercel__list_deployments
  - mcp__vercel__get_deployment
  - mcp__vercel__get_runtime_logs
model: opus
---

# /monitor — デプロイ済みアプリ評価・改善提案（委譲型PDCAモデル）

`/monitor $ARGUMENTS` として実行された場合:

デプロイ済みアプリの健全性を評価し、改善提案を生成します。
`--full` フラグを付けるとC-Suite経由のフル評価を実施します。

## ステップ 1: アプリ状態の収集

### 1a. デプロイ状態の確認
- Vercel MCPで最新のデプロイ状態を確認（`list_deployments` → `get_deployment`）
- デプロイが READY かどうか確認
- ランタイムログでエラーを確認（`get_runtime_logs`）

### 1b. ブラウザE2Eチェック（Playwright MCP）
- 主要ページにアクセスし、ページロードを確認
  - `/login`, `/dashboard`, `/transactions`, `/budgets`, `/categories`, `/reports`, `/settings`
- `browser_console_messages` でコンソールエラー・警告を収集
- `browser_network_requests` で4xx/5xxエラーを確認
- 主要UIの `browser_take_screenshot` を取得

### 1c. コード品質チェック（ローカル）
- TypeScript型エラーの確認: `npx tsc --noEmit`
- リントエラーの確認: `npx eslint . --quiet`（設定があれば）
- テスト実行: `pnpm vitest run`（テストがあれば）

## ステップ 2: ヘルスチェック結果の報告

Hiroに日本語で中間報告:

```
## ヘルスチェック: {app-name}

### デプロイ状態
- ステータス: READY / ERROR
- 最終デプロイ: {timestamp}

### ブラウザ検証
- コンソールエラー: X件
- コンソール警告: X件
- ネットワークエラー: X件
- 異常ページ: (該当ページ一覧)

### コード品質
- TypeScriptエラー: X件
- リントエラー: X件
- テスト結果: X passed / Y failed
```

## ステップ 3: C-Suite評価（`--full` フラグ時のみ）

`--full` が指定された場合、3つのエージェントを**並列**で起動:

1. **CTO エージェント**: 「{app-name} の技術的健全性を評価せよ。
   code-reviewer にコード品質レビューを、security-auditor にセキュリティ監査を委譲し、
   PDCAサイクルを回した上で改善提案を生成すること」

2. **CPO エージェント**: 「{app-name} のUXと機能完成度を評価せよ。
   qa-engineer に受入条件の再検証を委譲し、
   PDCAサイクルを回した上で改善提案を生成すること」

3. **CFO エージェント**: 「{app-name} の運用コストを再評価せよ。
   cost-analyzer に最新の料金を確認させ、
   PDCAサイクルを回した上で最適化提案を生成すること」

## ステップ 4: 改善提案レポート

Hiroに日本語で最終報告:

```
## 改善提案: {app-name}

### 優先度: 高
1. [内容] — 理由、対処方法

### 優先度: 中
1. [内容] — 理由、対処方法

### 優先度: 低
1. [内容] — 理由、対処方法

### 次のアクション
- (具体的に何をすべきか)
```

## `/loop` / `/schedule` との連携

- **軽量チェック（毎日）**: `/loop 24h /monitor {app-name}`
- **フル評価（毎週）**: `/schedule` でcronを設定し `/monitor {app-name} --full` を週1実行
- **手動トリガー**: リリース直後に `/monitor {app-name} --full` を手動実行
