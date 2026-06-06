# サプライチェーンセキュリティ運用ガイド

このプロジェクトは、shai-hulud 級のサプライチェーン攻撃（自己増殖型 npm ワーム、悪質パッケージ、CI/CD 注入）から多層で防御する。AI（Claude / 各サブエージェント）が**知らず知らずのうちに悪質パッケージをインストールしない**ことと、**致命的リスクを早期に検知して issue で警鐘を鳴らす**ことを目的とする。

## 7層防御の全体像

```
日次 GitHub Actions cron
  ├─ threat-intel-refresh.yml ── GitHub malware advisory を収集 → .claude/security/threat-intel.json を自動コミット
  └─ supply-chain-security.yml ── pnpm audit + OSV + Socket + ワークフロー注入スキャン
                                    └─ 重大/高 → GitHub issue 起票 (label: security)
ローカル開発
  ├─ PreToolUse hook (guard-install.mjs) ── 既知IOC / npm・yarn・bun を即ブロック
  ├─ pnpm minimumReleaseAge ────────────── 公開直後の新バージョンを受動的に遅延 (cooldown 7日)
  ├─ SessionStart hook (session-security-check.sh) ── 起動時に open な security issue を表示
  └─ /supply-chain スキル ──────────────── 能動巡回 → レポート → issue 起票
```

| 層 | 仕組み | ファイル |
| --- | --- | --- |
| 0. pnpm 統一強制 | `packageManager` / `engines` / `.npmrc` / `preinstall: only-allow pnpm` | `apps/*/package.json`, `.npmrc` |
| 1. cooldown（受動防御の本命） | `minimumReleaseAge`（公開直後の悪質版を遅延） | `apps/*/pnpm-workspace.yaml` |
| 2. インストールガード | 既知IOC・npm/yarn/bun・**Socket supplyChain<20** を即ブロック | `.claude/hooks/guard-install.mjs` |
| 3. 監査エージェント | 依存・lockfile・スクリプト・workflow を監査 | `.claude/agents/supply-chain-auditor.md` |
| 4. 巡回スキル | 3エージェント並列巡回 → issue 起票 | `.claude/skills/supply-chain/SKILL.md` |
| 5. CI/CD監視 + 日次更新 | pnpm audit / OSV / Socket / IOC収集 | `.github/workflows/*.yml`, `.github/scripts/build-threat-intel.mjs` |
| 6. 起動時確認 | open security issue を提示 | `.claude/hooks/session-security-check.sh` |
| 7. ガバナンス | 依存ルール・本ドキュメント | `.claude/rules/dependencies.md` |

## なぜ cooldown が本命なのか

複数のセキュリティベンダーの分析によれば、**「1日待つだけで shai-hulud（検知まで約12時間）も chalk/debug 事件（約2.5時間で解決）も両方ブロックできた」**。悪質バージョンは公開後すぐ検知・削除されるため、新バージョンの取り込みを遅らせる `minimumReleaseAge` が最も費用対効果の高い防御になる。本プロジェクトは安全側に **7日（10080分）** を採用し、適合する古い版にフォールバックする（`minimumReleaseAgeStrict: false`）。

## 日常運用フロー（Hiro向け）

1. **セッション開始時** — open な `security` issue があれば自動表示される。あれば内容を確認。
2. **issue が起票されたら** — `gh issue view <番号>` で詳細確認。致命的なら依存のロールバック/置換を検討し、`/supply-chain` で深掘り。
3. **依存を追加したいとき** — `pnpm add` を使う（npm/yarn/bun はブロックされる）。追加後は `/supply-chain` または supply-chain-auditor で監査。
4. **手動で全体巡回** — `/supply-chain`（`--fix` で自明な修正も適用）。
5. **CI** — PR・push・日次で `supply-chain-security.yml` が自動監視。

## 脅威データ（threat-intel.json）

- `malicious_packages`: インストール即ブロック対象（誤検知でビルドを壊さないよう確実なものだけ）。`build-threat-intel.mjs` が GitHub malware advisory から日次投入。`source: seed`/`manual` のエントリは保持される。
- `indicators` / `campaigns`: 文字列・ファイル痕跡。ワークフロー注入スキャンと監査エージェントが参照（インストールブロックには使わない）。
- 手動で恒久的に denylist へ追加したい場合は、エントリに `"source": "manual"` を付ける（日次更新で消えない）。

## Socket 連携の2系統（混同しやすい）

Socket は**用途の違う2つ**の連携があり、本プロジェクトは両方使う:

| 系統 | 誰が動かす | ダッシュボードを開く必要 | 何をする |
| --- | --- | --- | --- |
| **Socket GitHub App** | GitHub（自動・PR時） | スキャン状況の確認時のみ | PRの依存を自動スキャンしコメント。SSO/OAuthで導入、キー不要 |
| **Socket MCP**（`socket-mcp`, `https://mcp.socket.dev/`） | **Claude**（スキル/エージェント/フック） | **不要** | Claudeが `depscore` で依存を直接採点。`/supply-chain` でデータ取得→実依存と照合→issue起票。`guard-install.mjs` も supplyChain<20 を水際ブロック |

ポイント: **「自分で Socket.dev を開いてスキャン開始」する必要があるのは GitHub App 側のUI運用だけ**。Socket MCP 経由なら Claude が API を直接叩くので、ダッシュボードを開かずに自動で照合・issue化できる。`depscore` はホスト版がキー不要（自己ホストのみ `SOCKET_API_TOKEN` が必要）。

ガードフックの Socket ゲートは環境変数で調整可能: `SOCKET_GATE_THRESHOLD`（既定20）/ `SOCKET_GATE_TIMEOUT_MS`（既定8000・fail-open）/ `SOCKET_GATE_DISABLE=1`（無効化）。

## 手動セットアップ（要対応）

| 項目 | 内容 |
| --- | --- |
| **Socket.dev（推奨: App のみ・キー不要）** | [github.com/apps/socket-security](https://github.com/apps/socket-security) で **Socket GitHub App** を対象リポジトリに導入するだけ（SSO/OAuth、**APIキー不要**）。PR時の依存スキャンとコメントが自動で有効になる。 |
| Socket.dev（任意: CI内CLIゲート） | 上記に加えて Actions 内で `SocketDev/action`（CLIモード）を回したい場合**のみ** secrets に `SOCKET_SECURITY_API_KEY` を追加。未設定なら CI の Socket ステップは自動スキップ（CIは失敗しない）。GitHub App を入れていれば通常は不要。 |
| **gh CLI 認証** | SessionStart の issue 表示・ローカルからの issue 起票に必要。`gh auth status` で確認。 |
| **cooldown 日数** | 既定7日。変更は `apps/*/pnpm-workspace.yaml` の `minimumReleaseAge`（分単位）。 |

## 任意の追加策

- **Socket Firewall Free (`sfw-free`)**: APIキー・設定不要のパッケージマネージャーラッパー。Socket の脅威インテリジェンスで悪質パッケージのインストールを直接ブロックする（本プロジェクトの `guard-install.mjs` と同系統だが、Socket の全データを利用）。ローカルやCIで `pnpm` をラップして使える。参照: https://github.com/SocketDev/sfw-free

## チューニング

- **cooldown を緩める**: `minimumReleaseAge` を 1440（1日）へ。pnpm 11 ではこれが既定。
- **denylist の取得期間**: `THREAT_INTEL_WINDOW_DAYS`（既定180）を変更。
- **CI の audit 厳格度**: `supply-chain-security.yml` の `pnpm audit --audit-level`。

## 参照

- pnpm サプライチェーン対策: https://pnpm.io/supply-chain-security
- Socket for GitHub Actions: https://docs.socket.dev/docs/socket-for-github-actions
- shai-hulud 解説（Datadog）: https://securitylabs.datadoghq.com/articles/shai-hulud-2.0-npm-worm/
