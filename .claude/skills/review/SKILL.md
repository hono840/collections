---
name: review
description: Full review cycle with CTO + CPO (delegation model)
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Agent
  - Write
  - mcp__playwright__browser_navigate
  - mcp__playwright__browser_console_messages
  - mcp__playwright__browser_take_screenshot
model: opus
---

# /review — C-Suite経由レビューサイクル（委譲型PDCAモデル）

`/review` として実行された場合:

CTO と CPO を経由して、サブエージェントにレビュー作業を委譲し、PDCAサイクルで品質を高めます。

## ステップ 1: スコープ特定

最近の変更を確認:
- `git diff` または `apps/` 内の最近変更されたファイルをスキャン
- 対象アプリと機能を特定

## ステップ 2: C-Suite経由の並列レビュー

2つのエージェントを**並列**で起動:

1. **CTO エージェント**: 「apps/ 内の最近のコード変更をレビューせよ。
   code-reviewer にコード品質レビューを委譲し、PDCAサイクルを回した上で最終レビュー結果を報告すること。
   必要に応じて security-auditor にセキュリティチェックも委譲すること。
   あなた自身はコードを読んでレビュー指示を出す側に徹すること」

2. **CPO エージェント**: 「docs/product/ 内の受入条件に対して最新の実装を検証せよ。
   qa-engineer にE2E検証を委譲し、PDCAサイクルを回した上で最終QA結果を報告すること。
   あなた自身はテストを実行せず、qa-engineer の成果物をレビュー・改善指示すること」

## ステップ 3: ブラウザ検証（開発サーバーが起動中の場合）

Playwright MCP を使ってブラウザレベルの検証を実施:

1. `browser_navigate` で主要ページにアクセス
2. `browser_console_messages` でコンソールエラー・警告を収集
3. `browser_take_screenshot` でUIの状態を記録

コンソールに出ているエラーや警告も統合レポートに含める。

## ステップ 4: 統合レポート

CTO と CPO のレビュー結果 + ブラウザ検証結果を統合し、Hiroに日本語で報告:

```
## レビュー結果

### コード品質 (CTO → code-reviewer)
- Critical: X件
- Important: X件
- Suggestions: X件

### セキュリティ (CTO → security-auditor)
- 指摘事項: X件

### 受入条件 (CPO → qa-engineer)
- 達成: X/Y
- 未達成: (list)

### ブラウザ検証
- コンソールエラー: X件
- コンソール警告: X件

### 総合判断
(リリース可 / 修正必要 / 追加テスト必要)
```
