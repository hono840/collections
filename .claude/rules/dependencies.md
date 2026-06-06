---
paths:
  - "**/package.json"
  - "**/pnpm-lock.yaml"
  - "**/pnpm-workspace.yaml"
  - "**/.npmrc"
---

# 依存関係・パッケージマネージャーのルール

依存やパッケージマネージャー設定を変更するときは、サプライチェーン攻撃（shai-hulud級）対策の方針を必ず守ること。

## パッケージマネージャーは pnpm に統一

- **npm / yarn / bun でのインストールは禁止。** `npm install` / `yarn add` / `bun add` 等は PreToolUse フック（`.claude/hooks/guard-install.mjs`）が即ブロックする。
- 依存の追加・更新・削除はすべて **pnpm** で行う（`pnpm add` / `pnpm update` / `pnpm remove`）。
- `packageManager` フィールド・`engines`・`.npmrc`（`engine-strict=true`）・`preinstall: only-allow pnpm` を外さないこと。

## 依存追加時は supply-chain-auditor レビュー必須

- 新しい依存を追加したら **supply-chain-auditor** に監査を委譲する（`/supply-chain` でも可）。
- 公開直後のバージョンは `pnpm-workspace.yaml` の `minimumReleaseAge`（cooldown, 既定7日）が受動的に遅延させる。**cooldown を 0 にしたり exclude へ安易に追加しない**（緊急の正規セキュリティパッチのみ例外）。
- ライフサイクルスクリプト（postinstall 等）は pnpm の許可制（`onlyBuiltDependencies`）で明示承認する。安易に許可リストへ追加しない。

## ロックファイルの取り扱い

- `pnpm-lock.yaml` の差分は依存導入経路の証跡。差分が大きい/想定外の新規依存が増えた場合は supply-chain-auditor で確認する。
- CI（`.github/workflows/supply-chain-security.yml`）が `--frozen-lockfile --ignore-scripts` で検証し、`pnpm audit` / OSV / Socket / IOC照合を行う。lockfile を手で書き換えない。

## 既知の悪質パッケージ

- `.claude/security/threat-intel.json`（日次更新）の denylist に載るパッケージはインストール不可。一致した場合は **インストールを中止し、`security` ラベルで issue 起票**して Hiro に報告する。

## 担当

- 設定変更の実作業: **devops-engineer**（CI/インフラ）/ 依存追加に伴うコード: backend/frontend-developer。
- 監査・判定: **supply-chain-auditor**（CTO配下）。
- C-Suite / オーケストレーターは直接編集せず、委譲してレビューする（PDCA）。
