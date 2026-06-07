# carskiida コスト見積もり（cost-analyzer）

> 作成: 2026-06-07 / 担当: cost-analyzer（CFO委譲）
> 前提: 趣味/ポートフォリオ → 無料枠で回すことが最優先。read-heavy リファレンス。在庫・価格は扱わない。

## 0. エグゼクティブサマリー

| シナリオ | 想定規模 | 月額（現実値） | 最初に詰まる場所 |
|---|---|---|---|
| **A. MVP/ポートフォリオ** | 〜数百MAU | **$0**（ドメイン除く） | Supabase の自動一時停止（「1週間無アクセスで停止」） |
| **B. 小規模公開** | 数千MAU | **$0〜実質$0**（設計次第） | 最初の課金は Vercel 画像変換5,000/月 or Supabase egress 5GB |
| **C. 成長時** | 数万MAU | **$25〜$45**（Supabase Pro 中心） | DB egress と Vercel Fast Data Transfer |

**結論**: read-heavy・在庫なし・写真最小方針のため、正しく設計すれば数千MAUまで $0 で回せる見込み。ただし「Supabase の1週間一時停止」だけはMVP段階で確実に踏むので対策必須。事実上の固定費はドメイン代 年$10.46 のみ。

## 1. 月額コスト見積もり（3シナリオ）

### シナリオ A: MVP/ポートフォリオ（$0 を検証）

| サービス | プラン | 無料枠 | 判定 |
|---|---|---|---|
| Vercel | Hobby | 100GB転送 / 1M Function / 1M Edge / 4h CPU / 5,000画像変換 / 1GB Blob | **$0** |
| Supabase | Free | DB 500MB / egress 5GB / Storage 1GB / 50K MAU / 2プロジェクト | **$0** |
| データソース | vPIC / Wikidata / Wikipedia | 完全無料・登録不要（実用 10-15req/s、夜間バッチ推奨） | **$0** |
| ドメイン | Cloudflare Registrar `.com` | at-cost $10.46/年 ≒ $0.87/月 | 約$0.87/月 |
| フォント | Noto Sans JP（self-host, OFL） | 無料 | **$0** |
| 分析 | Vercel Web Analytics(2,500ev) or Cloudflare Web Analytics(無料無制限) | 無料 | **$0** |

**A合計: $0（ドメイン年$10.46 = 月約$0.87 のみ）。**

無料枠の制限（必ず明示）:
1. **Supabase Free は「1週間 API 無アクセスで自動一時停止」** — ポートフォリオ最大の落とし穴。データは保持、手動再開要。→ cron 対策必須。
2. Supabase Free はバックアップなし・SLAなし・2プロジェクトまで。
3. **Vercel Hobby は商用利用禁止**（非商用限定）。広告・課金導入の瞬間に Pro $20/月 必須。
4. Vercel Hobby は枠超過時 機能が30日ロック（従量継続不可）。
5. 画像変換は Hobby 5,000/月。next/image 多用で意外に早く減る（写真最小なら問題なし）。

### シナリオ B: 小規模公開（数千MAU）

read-heavy・在庫なしのため、最初に効くのは「課金」でなく「無料枠の頭打ち」。発生順:

| # | 詰まる枠 | 閾値 | 対処 | 追加コスト |
|---|---|---|---|---|
| 1 | Vercel 画像変換 | 5,000/月 | 画像最小・unoptimized・Cloudflare Images退避 | $0（設計回避） |
| 2 | Supabase DB egress | 5GB/月 | SSG/ISR+キャッシュ、DBは生成時のみ | $0（設計回避） |
| 3 | Vercel 分析 events | 2,500/月 | Cloudflare Web Analytics（無料無制限）へ | $0 |
| 4 | Vercel 転送 | 100GB/月 | テキスト中心なら届きにくい | $0 |

最初に実際の課金が出る現実的トリガー = 設計で回避しきれず Supabase 無料枠超過 → **Supabase Pro $25/月**（Free→Proの中間なし）。または商用化で **Vercel Pro $20/月**。

**B: 設計が正しければ $0。回避できず超過なら $25/月。**

### シナリオ C: 成長時（数万MAU）

| サービス | プラン | 月額 | ボトルネック |
|---|---|---|---|
| Supabase | Pro | $25 + 従量 | egress 250GB含む（超過 $0.09/GB）。読み取り中心なので egress が主コスト。SSG/ISRで250GB枠内に収まる可能性大 |
| Vercel | Hobby継続(非商用) or Pro | $0〜$20 | 商用化なら Pro $20 |
| 分析 | Cloudflare Web Analytics | $0 | 無制限無料 |
| ドメイン | Cloudflare | 約$0.87 | 据え置き |

**C目安**: 非商用 約$25/月、商用化 約$45/月。最大ボトルネック=Supabase egress とDB容量。対策は「DBを生成時だけ叩く」設計。

## 2. データ調達コスト

### 2-1. 無料データソース（$0）
- **vPIC**: $0・登録不要。実用10-15req/sでIP一時ブロック、応答遅い（夜間/週末バッチ推奨）。100+フィールド。**米国市場中心**＝日本車・輸入車の網羅性に限界。
- **Wikidata/Wikipedia**: $0。CC-BY-SA/CC0、**帰属表記が義務**。世代史・生産地の一次素材に好適。

### 2-2. メーカー諸元の手転記 = 人的工数（ショーケース層）

| 作業 | 時間/車種 |
|---|---|
| 一次資料収集 | 0.5〜1.0h |
| 諸元転記 | 0.5〜1.0h |
| 世代史・パーツ・生産地の記述 | 1.0〜2.0h |
| 検証・出典付与・校正 | 0.5h |
| **合計** | **約 2.5〜4.5h/車種** |

- ショーケース 50車種 = 約125〜225h（3.5〜6人週）。100車種 = 250〜450h。
- これがプロジェクト最大の"隠れコスト"。**MVPは10〜20車種（25〜90h）に絞るのが費用対効果◎**。残りは自動収録層で見せ幅。
- UGC導入で分散できるがモデレーション工数が発生。

### 2-3. 有料 商用車両DB API（参考・不採用前提）
- Auto.dev VIN Decode: 無料1,000calls/月、超過 $0.004/call。$0スタートのpay-as-you-go。
- Edmunds Vehicle API: 一般提供終了（候補外）。
- 市場相場 Vehicle Database系: single-user 約$3,950〜（趣味には過剰）。
→ 推奨は有料API不使用。必要時のみ Auto.dev を従量で部分利用。

## 3. その他コスト

| 項目 | 推奨 | コスト |
|---|---|---|
| 独自ドメイン | Cloudflare Registrar `.com` | $10.46/年（≒$0.87/月）。事実上唯一の固定費 |
| 日本語Webフォント | Noto Sans JP self-host（OFL） | $0（サブセット化で容量削減・外部リクエスト回避） |
| 画像CDN | 写真最小方針→基本不要 | $0（必要時のみ Cloudflare Images。ロゴ/図はSVG） |
| 分析 | Cloudflare Web Analytics | $0（無制限無料）。詳細要れば Plausible $9/月 |

## 4. コスト最適化と危険信号

### 推奨アクション（優先度順）
1. **【最優先】Supabase 自動一時停止を回避**: 外部cron（GitHub Actions schedule / Vercel Cron）で毎日1回軽量クエリ keep-alive。$0でMVP最大の落とし穴を潰す。
2. **DBを"生成時だけ叩く"設計（SSG/ISR+on-demand revalidation）**: egress と Function 呼出を桁違いに削減。数万MAUを$25内に収める鍵。
3. 画像は最小・SVG優先・next/image の使用箇所限定。
4. フォントは self-host + 日本語サブセット化。
5. 分析は最初から Cloudflare Web Analytics。
6. データ調達は MVP=ショーケース10〜20車種に限定。
7. CC-BY-SA / vPIC の帰属表記をテンプレ化（後からの全件修正＝隠れコスト回避）。

### 危険信号（早期警戒）
| 指標 | しきい値 | アクション |
|---|---|---|
| Supabase DB egress | 月3.5GB超(70%) | SSG/ISR強化。放置でPro $25 |
| Supabase DB サイズ | 350MB超(70%) | データ増確認。Pro $25 視野 |
| Vercel 画像変換 | 月3,500超(70%) | SVG化/外部CDN退避 |
| Vercel 転送 | 月70GB超(70%) | フォント/JS/画像最適化 |
| Vercel 分析 events | 月2,500到達 | Cloudflare へ移行 |
| 商用要素追加(広告/課金) | 発生した瞬間 | Vercel Hobby規約違反→Pro $20必須。要Hiro承認 |
| vPIC バッチ | 10-15req/s超 | 夜間/週末分散、レート制御 |
| 手転記ショーケース | 計画工数超過ペース | スコープ絞る/UGC振替 |

## 5. 年額換算サマリー

| シナリオ | 月額 | 年額 |
|---|---|---|
| A. MVP/ポートフォリオ | $0(+ドメイン$0.87) | 約 $10.46/年（ドメインのみ） |
| B. 小規模（設計良好） | $0(+ドメイン) | 約 $10.46/年 |
| B'. 無料枠超過時 | $25 | 約 $310/年 |
| C. 成長・非商用 | 約$25 | 約 $310/年 |
| C'. 成長・商用化 | 約$45 | 約 $550/年 |

**最有力: MVP〜小規模は実質 年$10.46（ドメインのみ）。** Supabase keep-alive cron と SSG/ISR 設計が $0 運用の生命線。

## 出典
- [Vercel Hobby](https://vercel.com/docs/plans/hobby) / [Vercel Pricing](https://vercel.com/pricing) / [Functions Limits](https://vercel.com/docs/functions/limitations)
- [Supabase Pricing](https://supabase.com/pricing) / [Billing Docs](https://supabase.com/docs/guides/platform/billing-on-supabase) / [Egress Docs](https://supabase.com/docs/guides/platform/manage-your-usage/egress)
- [NHTSA vPIC API](https://vpic.nhtsa.dot.gov/api/) / [vPIC FAQ](https://vpic.nhtsa.dot.gov/api/home/index/faq)
- [Auto.dev Pricing](https://www.auto.dev/pricing) / [Edmunds Developer API](https://developer.edmunds.com/)
- [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) / [Noto Sans JP](https://fonts.google.com/noto/specimen/Noto+Sans+JP)
- [Cloudflare Web Analytics vs Plausible](https://plausible.io/vs-cloudflare-web-analytics) / [Vercel Web Analytics Pricing](https://vercel.com/docs/analytics/limits-and-pricing)

## CFO申し送り
無料枠で完結する見込み（固定費はドメイン年$10.46のみ）。技術設計の2点 —(1)Supabase keep-alive cron、(2)SSG/ISRでDB直アクセス最小化— が $0 運用の必須条件（CTO/devops-engineer に共有）。最大の隠れコストは金銭でなく**ショーケース手転記の人的工数（1車種2.5〜4.5h）**。MVPは10〜20車種に絞ることを強く推奨。商用化はVercel Pro $20への強制移行のため、導入時はHiro承認ゲートが必要。
