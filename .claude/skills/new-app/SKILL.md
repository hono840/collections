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

# /new-app — C-Suite総動員アプリ作成

`/new-app $ARGUMENTS` として実行された場合:

C-Suiteチーム全体を統率し、新しいアプリケーションを作成します。以下の7ステッププロセスを厳密に実行してください。**承認ゲートは絶対にスキップしないこと。**

## ステップ 1: 戦略検証（並列実行）

2つのエージェントを**並列**で起動:

1. **CSO エージェント**: 「以下の市場機会を評価せよ: $ARGUMENTS。競合トップ5社、それぞれの弱点、差別化の切り口を特定すること。結果を docs/strategy/{app-name}-market-analysis.md に書き出すこと」

2. **CPO エージェント**: 「以下の初期プロダクト要件をドラフトせよ: $ARGUMENTS。コアとなるユーザー課題と、何が差別化ポイントになるかに焦点を当てること。docs/product/{app-name}-prd-draft.md に書き出すこと」

両方の完了を待つ。

## ステップ 2: 承認ゲート 1 — 方向性

Hiroに日本語で簡潔なサマリーを提示:

- CSOの市場分析（1段落）
- CPOのドラフト要件（箇条書き）
- 推奨する差別化の切り口
- 確認: 「この方向で進めますか？」

AskUserQuestion を使用。**承認なしに先に進めないこと。**

## ステップ 3: 詳細計画（並列実行）

3つのエージェントを**並列**で起動:

1. **CPO エージェント**: 「{app-name} の要件、ユーザーストーリー、受入条件を確定せよ。ドラフトPRDを活用すること。Google Calendarにスプリントマイルストーンを作成すること。docs/product/{app-name}-prd.md および docs/product/{app-name}-stories.md に書き出すこと」

2. **CTO エージェント**: 「PRDに基づき {app-name} の技術アーキテクチャを設計せよ。context7 を使用してライブラリ選定を検証すること。docs/product/{app-name}-architecture.md に書き出すこと」

3. **CFO エージェント**: 「{app-name} の全コストを見積もれ: ホスティング、API、ドメイン、サードパーティサービス。可能な限り無料枠を活用して最適化すること。docs/finance/{app-name}-costs.md に書き出すこと」

全エージェントの完了を待つ。

## ステップ 4: 承認ゲート 2 — 技術設計

Hiroに以下を提示:

- アーキテクチャの概要（技術スタック、主要な設計判断）
- コスト内訳（月額見積もり）
- スプリント計画（最初に何を作るか）
- 確認: 「技術設計を承認しますか？」

AskUserQuestion を使用。**承認なしに先に進めないこと。**

## ステップ 5: 実装

CTOが実装をリード:

1. `apps/{app-name}/` ディレクトリ構成を作成
2. アプリケーションのスキャフォールド（デフォルト: Next.js + TypeScript + Tailwind）
3. CPOが優先順位付けしたユーザーストーリーに従い機能を実装
4. 主要機能の完了ごとに code-reviewer エージェントで品質チェックを実施

## ステップ 6: 仕上げ（並列実行）

2つのエージェントを**並列**で起動:

1. **CMO エージェント**: 「{app-name} の README.md、アプリ名の提案、ローンチ用コピーを作成せよ。マーケティング成果物を docs/marketing/{app-name}-brand.md に書き出すこと」

2. **QA（CPO経由）**: 「CPO: qa-engineer に委任し、{app-name} の全受入条件を検証せよ。合格項目と修正が必要な項目を報告すること」

## ステップ 7: ローンチ準備

C-Suite全体の視点からステータスをまとめる:

- CTO: コード品質、テストカバレッジ、デプロイ準備状況
- CPO: 受入条件の達成状況
- CMO: READMEおよびマーケティングの準備状況
- CFO: 実際のコスト vs 見積もり
- CSO: 競合に対するポジショニング

最終ステータスをHiroに日本語で報告。
