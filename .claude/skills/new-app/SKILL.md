---
name: new-app
description: Start a new app with full C-Suite orchestration
argument-hint: <app-name> <brief description>
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - WebSearch
  - WebFetch
  - Agent
  - mcp__context7__resolve-library-id
  - mcp__context7__query-docs
  - mcp__claude_ai_Google_Calendar__gcal_create_event
  - mcp__claude_ai_Google_Calendar__gcal_list_events
model: opus
---

# /new-app — C-Suite総動員アプリ作成（委譲型PDCAモデル）

`/new-app $ARGUMENTS` として実行された場合:

C-Suiteチーム全体を統率し、新しいアプリケーションを作成します。
**各C-Suiteは自分で手を動かさず、サブエージェントに委譲してPDCAサイクルを回します。**
**承認ゲートは絶対にスキップしないこと。**

## ステップ 1: 戦略検証（並列実行 + 内部PDCA）

2つのエージェントを**並列**で起動:

1. **CSO エージェント**: 「以下の市場機会を評価せよ: $ARGUMENTS。
   market-researcher と competitive-analyst に委譲し、PDCAサイクルを回した上で、
   最終的な市場分析を apps/{app-name}/docs/strategy/{app-name}-market-analysis.md に書き出すこと。
   あなた自身は直接調査せず、サブエージェントの成果物をレビュー・改善指示すること」

2. **CPO エージェント**: 「以下の初期プロダクト要件をドラフトせよ: $ARGUMENTS。
   feature-planner に委譲し、PDCAサイクルを回した上で、
   ドラフトPRDを apps/{app-name}/docs/product/{app-name}-prd-draft.md に書き出すこと。
   必要に応じて ux-researcher にもUX調査を委譲すること。
   あなた自身はPRDを書かず、サブエージェントの成果物をレビュー・改善指示すること」

両方の完了を待つ。

## ステップ 2: 承認ゲート 1 — 方向性

Hiroに日本語で簡潔なサマリーを提示:

- CSOの市場分析（1段落）
- CPOのドラフト要件（箇条書き）
- 推奨する差別化の切り口
- 確認: 「この方向で進めますか？」

AskUserQuestion を使用。**承認なしに先に進めないこと。**

## ステップ 3: 詳細計画（並列実行 + 内部PDCA）

3つのエージェントを**並列**で起動:

1. **CPO エージェント**: 「{app-name} の要件、ユーザーストーリー、受入条件を確定せよ。
   feature-planner に詳細仕様を、ux-researcher にUX調査を委譲し、PDCAサイクルを回した上で
   確定版を apps/{app-name}/docs/product/ に書き出すこと。
   Google Calendarにスプリントマイルストーンを作成すること」

2. **CTO エージェント**: 「PRDに基づき {app-name} の技術アーキテクチャを設計せよ。
   code-architect にアーキテクチャ設計を委譲し、PDCAサイクルを回した上で
   確定版を apps/{app-name}/docs/product/{app-name}-architecture.md に書き出すこと」

3. **CFO エージェント**: 「{app-name} の全コストを見積もれ。
   cost-analyzer にコスト調査を委譲し、PDCAサイクルを回した上で
   確定版を apps/{app-name}/docs/finance/{app-name}-costs.md に書き出すこと」

全エージェントの完了を待つ。

## ステップ 4: 承認ゲート 2 — 技術設計

Hiroに以下を提示:

- アーキテクチャの概要（技術スタック、主要な設計判断）
- コスト内訳（月額見積もり）
- スプリント計画（最初に何を作るか）
- 確認: 「技術設計を承認しますか？」

AskUserQuestion を使用。**承認なしに先に進めないこと。**

## ステップ 5: 実装（TDD + 委譲型）

**CTO エージェント** を起動:
「{app-name} を TDD（テスト駆動開発）で実装せよ。
 機能単位で以下のサイクルを繰り返すこと:

 1. code-architect に設計を委譲 → レビュー → 承認
 2. Red: test-writer に受入条件+設計図に基づきテストを先に書かせる（テストは失敗する状態）
 3. Green: frontend-developer / backend-developer にテストを通す最小限の実装を委譲
 4. Refactor: code-reviewer にリファクタリング提案を委譲 → テストが通り続けることを確認
 5. セキュリティ関連は security-auditor に監査を委譲
 6. デプロイ準備は devops-engineer に委譲

 すべてPDCAサイクルを回し、品質基準を満たした成果物のみ承認すること」

## ステップ 6: 仕上げ（並列実行 + 内部PDCA）

2つのエージェントを**並列**で起動:

1. **CMO エージェント**: 「{app-name} の README.md、アプリ名の提案、ローンチ用コピーを作成せよ。
   content-creator にコピー制作を委譲し、PDCAサイクルを回した上で確定版を書き出すこと。
   seo-specialist にSEO最適化を委譲すること」

2. **CPO エージェント**: 「{app-name} の全受入条件を検証せよ。
   qa-engineer にE2Eテストを委譲し、PDCAサイクルを回した上で結果を報告すること」

## ステップ 7: ローンチ準備

C-Suite全体の視点からステータスをまとめる:

- CTO: コード品質、テストカバレッジ、デプロイ準備状況
- CPO: 受入条件の達成状況
- CMO: READMEおよびマーケティングの準備状況
- CFO: 実際のコスト vs 見積もり
- CSO: 競合に対するポジショニング

最終ステータスをHiroに日本語で報告。
