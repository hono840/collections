# 開発用ライセンスキー（DEV ONLY）

> **警告 — これは開発専用の使い捨て資材です。**
> ここに記載する公開鍵・ライセンスキーは、リポジトリにコミットされた**開発用の鍵ペア**（`scripts/mint-license-key.mts keygen` で生成）に紐づく。
> Hiro が本番用の鍵を生成し `NEXT_PUBLIC_LICENSE_PUBLIC_KEY` を差し替えた瞬間に、**下記のキーはすべて無効（無価値）になる**。E2E テストやローカル確認以外に使わないこと。

## 埋め込み開発用公開鍵（`src/lib/license/keys.ts` の `DEV_PUBLIC_KEY`）

Ed25519 公開鍵（raw 32 バイト・base64）:

```
pAN032oZnt49sLqA9Tr0Evf2f16btpMSY6Qdg4+zazM=
```

- 対応する**秘密鍵**は `.secrets/genka-ed25519.key`（PKCS8 PEM・パーミッション 0600）にあり、`.gitignore` の `/.secrets/` で**コミット対象外**。リポジトリには一切含まれない。
- 検証（`verifyLicenseKey`）は `LICENSE_PUBLIC_KEY_RAW_BASE64 = process.env.NEXT_PUBLIC_LICENSE_PUBLIC_KEY ?? DEV_PUBLIC_KEY` の順で公開鍵を解決する。

## 開発用ライセンスキー（annual・E2E 用）

```
GENKA-eyJwbGFuIjoiYW5udWFsIiwiaXNzIjoiZ2Vua2EtZGVudGFrdSIsImlhdCI6MTc4MzU3NDg2NywiZXhwIjoxODE1ODAyMDY3LCJyZWYiOiJkZXYtbG9jYWwifQ-2I7QYFEKfu0ki_Ct0_jI2oQkeimPoPte_zlxT-XEhFVkdyd9eV3Xlm9p0DmsvJ3zXAYyCAbsu1d-UFY0IUh6DQ
```

- payload: `{ "plan": "annual", "iss": "genka-dentaku", "iat": 1783574867, "exp": 1815802067, "ref": "dev-local" }`
- 有効期限: **2027-07-17**（発行 2026-07-09 + 373 日）。この期間は `verifyLicenseKey` が `active`（Pro）を返す。
- `export-gating.spec.ts` 等の E2E で「Free ロック → このキーで Pro 解錠」を検証するのに使う。

## 本番運用（Hiro が一度だけ実施）

```bash
# 1. 本番鍵ペアを生成（公開鍵が stdout、秘密鍵は .secrets/ に 0600 で保存）
pnpm mint-key -- keygen

# 2. 出力された公開鍵をビルド環境変数に設定（Cloudflare Pages / Vercel）
#    NEXT_PUBLIC_LICENSE_PUBLIC_KEY=<上記 stdout の base64>
#    → keys.ts の DEV_PUBLIC_KEY を上書きし、本番のキーだけが有効になる。

# 3. 購入者向けキーの発行（Stripe 注文 ID を ref に）
pnpm mint-key -- mint --plan annual --ref <stripe_order_id>
pnpm mint-key -- mint --plan monthly --ref <stripe_order_id>
```

- **秘密鍵はリポジトリ・CI・共有ドライブに置かない。** `.secrets/` はローカル専用。
- 鍵をローテーションしたら本ファイルの開発用キーは破棄（無効化済みのため実害はない）。
