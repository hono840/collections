---
name: supply-chain
description: Sweep the project for supply-chain risks (deps, lockfile, lifecycle scripts, CI/CD workflows) and file critical findings as GitHub issues
argument-hint: "[app-name] [--fix]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Agent
  - Write
  - WebSearch
  - WebFetch
model: opus
---

# /supply-chain — サプライチェーン能動巡回（委譲型PDCAモデル）

`/supply-chain $ARGUMENTS` として実行された場合:

このプロジェクトが shai-hulud 級のサプライチェーン攻撃に対して安全かを**あらゆる場所で能動的に監視**し、致命的リスクは GitHub issue で警鐘を鳴らします。`$ARGUMENTS` が空ならリポジトリ全体（全 `apps/*` + ルート + `.github`）を対象にします。

## ステップ 0: 脅威データの鮮度確認

- `.claude/security/threat-intel.json` の `updated_at` を確認。7日以上古ければ `node .github/scripts/build-threat-intel.mjs` で更新を試みる（ネットワーク/トークンが必要。失敗時はその旨を記録して続行）。

## ステップ 1: 並列巡回（CTO経由の委譲）

3つのエージェントを**並列**で起動:

1. **supply-chain-auditor エージェント**: 「{対象}のサプライチェーンを監査せよ。
   `pnpm audit`・OSV・`.claude/security/threat-intel.json` のIOC照合・`pnpm-lock.yaml` 差分・ライフサイクルスクリプト・`.github/workflows` への注入(`SHA1HULUD`/`bun_environment.js`等)・パッケージマネージャー統一(pnpm)崩れを確認し、重大度付きで報告すること」

2. **security-auditor エージェント**: 「{対象}のシークレット露出と認証/権限を監査せよ。
   ハードコードされた鍵・トークン、`.github/workflows` の `permissions:` 過剰付与、`.env` の取り扱いを確認し、重大度付きで報告すること」

3. **devops-engineer エージェント**: 「{対象}のCI/CD設定をレビューせよ。
   GitHub Actions が commit SHA でピンされているか、`pull_request_target` 等の危険トリガーがないか、`dependabot.yml` が機能しているか、`pnpm install` が `--frozen-lockfile`/`--ignore-scripts` を使っているかを確認し、重大度付きで報告すること」

## ステップ 2: 統合とレポート出力

3つの結果を統合し、重大度順に整理して `docs/security/audit-{timestamp}.md`（日本語）に書き出す:

```
## サプライチェーン監査レポート: {timestamp}

### サマリ
- 重大: X件 / 高: X件 / 中: X件 / 低: X件
- 脅威データ鮮度: {updated_at}

### 重大（即対応）
### 高（リリース前）
### 中 / 低
### 合格したチェック項目
### 推奨アクション
```

## ステップ 3: 致命的リスクの issue 起票（警鐘）

**重大 / 高** の各検出について、重複を避けつつ GitHub issue を起票:

```bash
gh issue list --label security --state open   # 既存の重複を確認
gh issue create --label security --label "severity:critical" \
  --title "🚨 [Supply Chain] <要約> (YYYY-MM-DD)" \
  --body "<検出内容・影響・対処・参照を日本語で。レポートへのリンクも>"
```

- 同タイトル/同パッケージの open issue が既にあれば**起票しない**（コメント追記に留める）。
- `gh` 未認証時は起票コマンド案をレポート末尾に列挙し、Hiro が実行できるようにする。

## ステップ 4: `--fix` フラグ時（任意）

`--fix` が指定された場合のみ、自明な修正（`pnpm audit --fix`、Actions のSHAピン追加、過剰 `permissions:` の絞り込み）を **devops-engineer / backend-developer に委譲**して適用し、PDCAでレビューする。修正は必ずブランチ上で行い、Hiroの承認を得てからマージする。

## ステップ 5: Hiroへの報告

日本語で簡潔に報告:

```
## サプライチェーン巡回完了: {対象}
- 検出: 重大X / 高X / 中X / 低X
- 起票したissue: #N, #M（または「起票なし」）
- レポート: docs/security/audit-{timestamp}.md
- 次のアクション: (あれば)
```

## トリガー連携

- **定期巡回**: GitHub Actions の `supply-chain-security.yml`（日次）がCI側を監視し、致命的検出を自動でissue化する。`/supply-chain` はその**ローカル/手動の深掘り版**。
- **セッション開始時**: `.claude/hooks/session-security-check.sh` が open な security issue を提示するので、表示されたら `/supply-chain` で深掘りする。
- **週次フル巡回**: `/schedule` で `/supply-chain --fix` を週1スケジュール化することを推奨。
