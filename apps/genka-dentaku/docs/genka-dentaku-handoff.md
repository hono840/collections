# 原価電卓（genka-dentaku）セッション引き継ぎドキュメント

- **作成日**: 2026-07-09
- **作成セッション**: 「月30万円稼げるアプリをチームで考えて作る」（アイデア選定 → 構築 → レビューまで一気通貫）
- **ブランチ**: `claude/app-300k-monthly-earnings-mmai5s`
- **目的**: 次のセッション（または人間）が文脈ゼロからでも作業を再開できるようにする

---

## 1. 現在の状態（TL;DR）

**MVP完成・全ゲートgreen・デプロイ待ち。** コードに未完了の作業はない。残タスクはすべて「Hiroの手作業（§4）」か「ポストMVPバックログ（§5）」。

| ゲート | 結果 |
|---|---|
| `pnpm exec tsc --noEmit` | exit 0 |
| `pnpm lint` | clean |
| `pnpm test` | **389 passed**（92ファイル） |
| `pnpm e2e` | **12 passed**（Playwright/Chromium、wedge実機検証含む） |
| `pnpm build` | 静的エクスポート成功（14ルート、`out/` 生成） |
| レビュー | code-reviewer / security-auditor / supply-chain-auditor 実施済み、指摘9件すべて修正済み |

## 2. プロダクト要約

- **何**: 個人経営飲食店向けメニュー原価計算ツール。ブラウザ完結・登録不要・データは端末内のみ（localStorage）。
- **wedge**: 食材の仕入値を1つ更新すると、それを使う全メニューの原価率が即時再計算される（派生値を一切保存せず純関数で都度算出する設計が構造的に保証）。
- **収益化**: フリーミアム。Free = メニュー3件・全計算機能。Pro = **¥980/月 / ¥9,800/年（主CTA）** = メニュー無制限＋CSV/PDF出力＋値上げシミュ一括適用。Stripe Payment Link + **Ed25519オフライン署名ライセンスキー**（バックエンド不要）。
- **目標**: 月30万円 ≒ 有料306件。到達見込みは9〜18ヶ月・確度40-50%（SEO複利前提）。誇張しないこと。

## 3. 重要な意思決定の記録（再検討時はここを先に読む）

1. **6候補からC案（原価計算）を採用**。A電帳法=法改正の罠（売上5,000万以下は検索要件免除）/ B職務経歴書・D給与明細・E請求書=大手の無料ロスリーダーに勝てない / Fシフト表=自動作成が短期実装不可。詳細: `docs/strategy/restaurant-cost-calculator-brief.md`（リポジトリルート）。
2. **CFOはF案を財務推奨したが、CSOの実装制約ゲートでC案に裁定**。CFOの「買い切りは毎月ゼロリセットの踏み車」批判はC案のサブスク化で取り込んだ。
3. **ホスティングは Cloudflare Pages 第一**（無料枠で商用可・帯域無制限）。**Vercel Hobbyは商用禁止**（決済リンク設置=商用判定）のため使用不可、使うならPro ¥3,240/月。
4. **ライセンス設計**: キー形式 `GENKA-{payloadB64}-{sigB64}`（Ed25519署名86文字固定長で末尾から決定的パース）。plan/exp/status は**永続化せず毎起動で署名検証**（改ざん耐性）。月額キー≈38日/年額≈373日有効＋期限前7日は猶予バナー→期限後Free降格（データは保持）。時計巻き戻しはソフト検知のみ（善意ユーザーモデルを設計として受容）。
5. **承認ゲート1・2はHiroの明示委任**（「あなたたちだけで考えて作って」）**を承認として通過**。判断はすべて戦略ブリーフとPRD第12章「確定裁定」に記録済み。
6. PRD第0章の計算式・丸め規則が**実装の唯一の正**。変更時はPRD→テスト→実装の順で。

## 4. ローンチ前のHiroの手作業（コード変更不要）

1. **PRをレビューしてmainへマージ**
2. **ドメイン取得**（第一候補 `genka-dentaku.com`、空き・商標は未確認）→ Cloudflare Pages にデプロイ
   - Build: `pnpm build` / Output: `out` / 環境変数 `NODE_VERSION=22`, `NEXT_PUBLIC_SITE_URL=https://<ドメイン>`
3. **本番ライセンス鍵の生成**: `cd apps/genka-dentaku && pnpm mint-key -- keygen`
   - 出力された公開鍵をビルド環境変数 `NEXT_PUBLIC_LICENSE_PUBLIC_KEY` に設定
   - 秘密鍵 `.secrets/genka-ed25519.key` を安全な場所へバックアップ（**git管理外。紛失すると発行済みキーの再発行不能**）
   - リポジトリ内のDEV鍵・DEVライセンスキー（`docs/product/dev-license-key.md`）は本番鍵設定後は無価値になる（想定どおり）
4. **Stripe Payment Link を2本作成**（月額¥980 / 年額¥9,800）→ `NEXT_PUBLIC_STRIPE_LINK_MONTHLY` / `NEXT_PUBLIC_STRIPE_LINK_ANNUAL` に設定（未設定時は「準備中」表示のまま安全に動く）
5. **特商法ページの【要記入】18箇所を記入**: `src/app/legal/tokushoho/page.tsx`（販売者名・所在地・連絡先等。**有料販売開始の法的必須要件**）
6. 購入対応（当面手動）: 購入通知を受けたら `pnpm mint-key -- mint --plan annual --ref <注文ID>` → キーを購入者へメール送付

## 5. ポストMVPバックログ（優先度順）

1. **フルフィルメント自動化**: Cloudflare Worker + Stripe webhook（checkout.session.completed）で mint→メール送付を自動化（アーキテクチャ§6.5に設計済み。クライアント改修不要）
2. **GTM実行**: 90日オーガニック獲得プラン（note柱記事4本→X→アウトリーチ）。`docs/marketing/genka-dentaku-gtm.md` が実行台本
3. CSP metaタグ導入（security-auditor L-2。Next.jsのインラインスクリプトと衝突しない書き方の検証が必要なため見送り中）
4. 税込ベース丸めオプション（PRD 7.2バックログ・CPO裁定3で v1 は税抜固定）
5. PWAインストール用アイコン（manifest.icons は安定資産の導入時に追加）
6. 上位プラン ¥1,480（メニュー表PDF・仕入記録）によるARPU引き上げ（CSOリスク対策1）
7. postcss moderate脆弱性（GHSA-qx2v-qp2m-jg93）は next 16.2.6 のpin由来 — nextのバージョンアップで自然解消（ビルド時ツールのため実影響低）
8. `importState('merge')` は現状UI未使用のデッドパス — 使うか消すか判断

## 6. 既知の課題・別件（このアプリの外）

- **[Issue #86](https://github.com/hono840/collections/issues/86)**: ①CI `supply-chain-security.yml` が `APP_DIR: apps/budget-app` ハードコードで**他アプリのlockfileを監視していない**（matrix化が必要・devops-engineer担当想定） ②`threat-intel-refresh.yml` が2026-07-03以降毎日失敗し脅威データが stale（denylistは実質シードのみ）
- CIボットが毎日「重大な依存リスク」issueを量産中（#73〜#85…）— audit ゲートの閾値・重複抑止の見直し推奨
- 本セッションでは **Supabase / socket-mcp のMCPが未認証**で使用不可だった（本アプリは不要な設計にしたため影響なし）。必要になったら claude.ai のコネクタ設定で認証

## 7. リポジトリ地図

```
apps/genka-dentaku/
├── README.md                     # 店主向け＋運用者向け二層構成（デプロイ・収益化手順あり）
├── docs/
│   ├── product/genka-dentaku-prd.md            # 唯一の正（第0章=計算式、第12章=確定裁定）
│   ├── product/genka-dentaku-design-spec.md    # トークン・コンポーネント目録
│   ├── product/genka-dentaku-architecture.md   # 型契約・純関数・ライセンス・デプロイ設計
│   ├── product/dev-license-key.md              # DEV専用キー（本番鍵で無価値化）
│   ├── strategy/genka-dentaku-market-analysis.md
│   ├── finance/genka-dentaku-costs.md          # 正本はルート docs/finance/
│   └── genka-dentaku-handoff.md                # 本ドキュメント
├── scripts/mint-license-key.mts  # keygen / mint（Node 22・依存ゼロ）
├── src/lib/domain/               # 計算エンジン（純関数・テスト網羅）
├── src/lib/{storage,state,license,backup,export,hooks}/
├── src/components/{atoms,molecules,organisms,templates}/  # Atomic Design
└── tests/e2e/                    # wedge / export-gating / marketing

リポジトリルート docs/
├── strategy/restaurant-cost-calculator-brief.md  # 6候補比較・C-Suite裁定の全記録
├── marketing/genka-dentaku-gtm.md                # ペルソナ・コピー・SEO・90日プラン
└── finance/genka-dentaku-costs.md                # コストシート正本
```

## 8. 次セッションの再開手順

```bash
cd apps/genka-dentaku
pnpm install          # pnpm必須（npm/yarn/bunはフックでブロックされる）
pnpm test             # 389本
pnpm e2e              # 12本（Chromium同梱環境ならそのまま動く）
pnpm dev              # http://localhost:3000
```

- まず本ドキュメント→PRD第0章・第12章→アーキテクチャ§13の順で読むと最短で文脈復元できる
- E2Eの `playwright.config.ts` はプリインストールChromium（`/opt/pw-browsers/chromium-1194`）に `executablePath` を固定してある（`existsSync` ガード付きなので他環境では自動フォールバック）
- E2EのPro解錠テストはDEVキー（有効期限 2027-07-17）を使用。期限後は `pnpm mint-key -- mint --plan annual` でフィクスチャを再生成し `tests/e2e/helpers.ts` を更新
- 依存追加時は `.claude/rules/dependencies.md` 遵守（cooldown 7日・supply-chain-auditorレビュー必須）
