---
name: strategy
description: C-Suite strategy session (CSO + CMO + CFO)
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

# /strategy — 戦略セッション

`/strategy $ARGUMENTS` として実行された場合:

CSO、CMO、CFOを統率し、トピックやアプリのアイデアを複数のビジネス視点から分析する戦略セッションを実施します。

## ステップ 1: 並列分析

3つのエージェントを**並列**で起動:

1. **CSO エージェント**: 「以下の戦略分析を実施せよ: $ARGUMENTS。市場機会、競合状況、差別化戦略をカバーすること。docs/strategy/{topic}-brief.md に書き出すこと」

2. **CMO エージェント**: 「以下のマーケティングとポジショニングの観点を分析せよ: $ARGUMENTS。ターゲットユーザー、メッセージング戦略、GTM（Go-to-Market）アプローチをカバーすること。結果をレスポンスに含めること」

3. **CFO エージェント**: 「以下の財務的実現可能性を分析せよ: $ARGUMENTS。想定コスト、収益モデルの可能性、ROI見通しをカバーすること。結果をレスポンスに含めること」

## ステップ 2: 統合

3つの視点を統合し、Hiroに日本語で戦略ブリーフを報告:

```
## 戦略ブリーフ: {topic}

### 市場機会 (CSO)
(主要な発見事項)

### ポジショニング (CMO)
(ターゲットユーザー、メッセージングの方向性)

### 財務見通し (CFO)
(コスト、収益ポテンシャル)

### 推奨アクション
1. ...
2. ...
3. ...

### リスク
- ...
```

統合ブリーフを `docs/strategy/{topic}-brief.md` に書き出す。
