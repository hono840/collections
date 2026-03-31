---
name: strategy
description: C-Suite strategy session with delegation model
argument-hint: <topic or app name>
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - WebSearch
  - WebFetch
  - Agent
model: opus
---

# /strategy — 戦略セッション（委譲型PDCAモデル）

`/strategy $ARGUMENTS` として実行された場合:

CSO、CMO、CFOを統率し、サブエージェントに委譲してPDCAサイクルを回しながら、トピックやアプリのアイデアを複数のビジネス視点から分析します。

## ステップ 1: 並列分析（C-Suite経由の委譲）

3つのエージェントを**並列**で起動:

1. **CSO エージェント**: 「以下の戦略分析を実施せよ: $ARGUMENTS。
   market-researcher に市場調査を、competitive-analyst に競合分析を委譲し、
   PDCAサイクルを回した上で最終分析結果を報告すること。
   あなた自身は直接調査せず、サブエージェントの成果物をレビュー・改善指示すること」

2. **CMO エージェント**: 「以下のマーケティングとポジショニングの観点を分析せよ: $ARGUMENTS。
   content-creator にポジショニングコピーの素案を委譲し、PDCAサイクルを回した上で
   ターゲットユーザー、メッセージング戦略、GTMアプローチを報告すること」

3. **CFO エージェント**: 「以下の財務的実現可能性を分析せよ: $ARGUMENTS。
   cost-analyzer にコスト調査を委譲し、PDCAサイクルを回した上で
   想定コスト、収益モデルの可能性、ROI見通しを報告すること」

## ステップ 2: 統合

3つの視点を統合し、Hiroに日本語で戦略ブリーフを報告:

```
## 戦略ブリーフ: {topic}

### 市場機会 (CSO → market-researcher + competitive-analyst)
(主要な発見事項)

### ポジショニング (CMO → content-creator)
(ターゲットユーザー、メッセージングの方向性)

### 財務見通し (CFO → cost-analyzer)
(コスト、収益ポテンシャル)

### 推奨アクション
1. ...
2. ...
3. ...

### リスク
- ...
```

統合ブリーフを `docs/strategy/{topic}-brief.md` に書き出す。
