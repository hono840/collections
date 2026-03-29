---
name: standup
description: Daily standup check across all areas
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - mcp__claude_ai_Google_Calendar__gcal_list_events
model: opus
---

# /standup — 進捗チェック

`/standup` として実行された場合:

C-Suite全エリアの簡易進捗チェックを実施します。これは軽量な読み取り専用チェックであり、エージェントの起動は不要です。

## ステップ 1: 最近のアクティビティを確認

1. **コード変更**: `apps/` 内の最近変更されたファイルを確認（`find apps/ -mtime -1` または git初期化済みなら `git log --oneline -10`）
2. **ドキュメント**: `docs/` 内の最近の更新を確認
3. **カレンダー**: Google Calendar で今後7日間のマイルストーンを確認

## ステップ 2: スタンダップレポートの生成

Hiroに日本語で報告:

```
## スタンダップ — {本日の日付}

### 最近の進捗
- (最近の変更・成果物の一覧)

### 今後の予定
- (今後のカレンダーマイルストーン)

### 各エリアの状況
- CTO: (コードの状態)
- CPO: (プロダクト・仕様の状態)
- CSO: (戦略の状態)
- CMO: (マーケティングの状態)
- CFO: (財務の状態)

### アクションアイテム
- (次に対応が必要なこと)
```

簡潔に。30秒で読める内容にすること。
