---
name: review
description: Full review cycle with CTO + CPO
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

# /review — フルレビューサイクル

`/review` として実行された場合:

CTOとCPOのサブエージェントを並列で統率し、包括的なレビューを実施します。

## ステップ 1: スコープの特定

最近の変更内容を確認:
- `git diff` を実行（gitリポジトリの場合）、または `apps/` 内の最近変更されたファイルをスキャン
- レビュー対象のアプリと機能を特定

## ステップ 2: 並列レビュー

2つのエージェントを**並列**で起動:

1. **code-reviewer エージェント**: 「apps/ ディレクトリ内の最近のコード変更をすべてレビューせよ。焦点: バグ、パフォーマンス、セキュリティ、型安全性。確信度80%以上の問題のみ報告すること。git diff を使用して変更を特定すること」

2. **qa-engineer エージェント**: 「docs/product/ 内の受入条件に対して最新の実装を検証せよ。指定されたすべての振る舞いが正しく動作することを確認すること。テストカバレッジのギャップを報告すること」

## ステップ 3: ブラウザ検証（開発サーバーが起動中の場合）

Playwright MCP を使ってブラウザレベルの検証を実施:

1. `browser_navigate` で主要ページ（/dashboard, /transactions 等）にアクセス
2. `browser_console_messages` でコンソールエラー・警告を収集
3. `browser_take_screenshot` でUIの状態を記録

コンソールに出ているエラーや警告も統合レポートに含める。

## ステップ 4: 統合レポート

両方のレビュー結果を統合し、Hiroに日本語で報告:

```
## レビュー結果

### コード品質 (code-reviewer)
- 重大: X件
- 重要: X件
- 提案: X件

### 受入条件 (qa-engineer)
- 達成: X/Y
- 未達成: (一覧)
- テストギャップ: (一覧)

### 総合判断
(リリース可 / 修正必要 / 追加テスト必要)
```
