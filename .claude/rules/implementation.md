---
paths:
  - "apps/**/*.ts"
  - "apps/**/*.tsx"
  - "apps/**/*.css"
---

# 実装ファイルの編集ルール

実装ファイル（.ts, .tsx, .css）は、以下のサブエージェントが編集する。オーケストレーター（Hiro）やC-Suite（CTO, CPO等）が直接編集してはならない。

## 担当サブエージェント

- **frontend-developer** — React/Next.jsコンポーネント、UI、スタイリング
- **backend-developer** — Server Actions、Supabase連携、DB操作
- **test-writer** — テストファイル（*.test.ts, *.test.tsx）
- **devops-engineer** — デプロイ設定、CI/CD関連

## 必須手順

1. 必ず Agent tool を使ってサブエージェントに作業を委譲する
2. C-Suiteは成果物をレビューし、フィードバックする（PDCAサイクル）
3. 直接 Write/Edit tool で実装ファイルを変更しない

## 対象外

- `package.json` — プロジェクト設定のため別ルール
- `CLAUDE.md` — プロジェクト指示のため別ルール
