# ライブスコア API 連携 評価ドキュメント

- **対象**: worldcup-kickoff（全 SSG の Next.js アプリ、source of truth は openfootball 静的データ）
- **目的**: 試合中のライブスコアを反映するための外部 API の比較・選定（GitHub issue #30）
- **作成**: cost-analyzer（CFO 配下）
- **調査日**: 2026-06-06
- **前提**: `WorldCupRepository` 抽象化（`src/lib/data/repository.ts`）により、現状の `static-repository` を後付けで差し替え／合成可能。**オッズ・賭博系データは評価対象外（不使用）。**

> ⚠️ 料金・規約は変動する。本書の数値は調査日時点の公式／公開情報に基づく。導入前に各 URL を再確認すること。

---

## 1. 結論（要約）

| 項目 | 結論 |
|------|------|
| **第一候補** | **API-Football（api-sports.io）の Pro プラン $19/月** |
| **フォールバック** | **football-data.org の Livescores アドオン €12/月**（10〜20 RPM・遅延少）、または **無料枠での擬似ライブ**（順位・確定スコアのみ） |
| **不採用** | worldcupapi.com（**€499/月** と高額。個人/小規模アプリには不適） |

**理由の核心**: football-data.org の **無料(Free)プランはライブスコアが「遅延」配信で、リアルタイムのライブスコアは有料の Livescores（€12/月〜）が必須**。一方 API-Football は **無料枠(100 req/日)から全エンドポイントにアクセス可**で、$19/月の Pro プラン(7,500 req/日)なら **15 秒間隔のライブ更新**にポーリング設計で十分耐える。W杯本番の試合数・ポーリング頻度・価格のバランスで API-Football が最良。

---

## 2. 3 API 比較表

| 項目 | **football-data.org** | **API-Football (api-sports.io)** | **worldcupapi.com** |
|------|----------------------|----------------------------------|---------------------|
| **無料枠** | あり（Free Forever） | あり（Free Forever） | 7日間トライアルのみ |
| **無料枠の上限** | **10 req/分**（登録済）／非認証は 100 req/24h・一覧のみ | **100 req/日** | トライアル後は有料のみ |
| **無料枠でライブスコア** | ❌ **遅延配信**（リアルタイム不可。要 Livescores 有料） | ⭕ 可（全エンドポイント開放。ただし 100/日で実運用は厳しい） | ⭕（トライアル中） |
| **ライブ更新間隔** | Livescores 有料時のみ準リアルタイム | **15 秒間隔**（in-play: スコア/イベント/ラインナップ/スタッツ） | 準リアルタイム（sub-second 応答を謳う） |
| **2026 W杯カバレッジ** | ⚠️ **無料枠の "Worldcup" は要確認**（カバレッジ表では FIFA World Cup が有料ティア 49€〜 表記。本番試合のライブは Livescores 有料が現実的） | ⭕ **W杯2026 対応明記**（48チーム/16会場、league/season で取得。試合・スコア・順位・得点者） | ⭕ **W杯2026 専用**（試合/イベント/コメンタリ/ラインナップ/順位/得点者/1930〜の歴史） |
| **最安の実用有料プラン** | **Livescores €12/月**（20 RPM・12コンペ） | **Pro $19/月**（7,500 req/日） | **€499/月**（200,000 req/日、超過 €0.0009/req） |
| **上位プラン** | Standard €49（60 RPM/30コンペ）, Advanced €99, Pro €199 | Ultra $39（75,000/日）, Mega $99（150,000/日） | 単一プランのみ（公開情報上） |
| **商用利用** | ⭕ 有料プランで可 | ⭕ 可（プランに依存） | ⭕（有料） |
| **表示義務(attribution)** | ⭕ **必須**: 「Football data provided by the Football-Data.org API」をフッター等に表示 | 要確認（規約参照。一般に表示義務の言及は弱い） | 未確認 |
| **キャッシュ可否** | キャッシュは推奨される運用（レート制御手段として許容） | 明示規約は要確認（ポーリング前提のため実質キャッシュ前提運用） | 未確認 |
| **資格情報の扱い** | OSS リポジトリへの認証情報コミット禁止（規約明記） | 一般的なキー秘匿（サーバー側保持） | 未確認 |
| **必要キー** | API トークン（X-Auth-Token ヘッダ） | API キー（x-apisports-key ヘッダ or RapidAPI 経由） | API キー |

> 注: football-data.org のカバレッジ表で「Worldcup」が無料セクションに、別途「FIFA World Cup」が有料ティア(49€〜)に併記されている矛盾があり、**無料枠でカバーされるのが本大会のライブか／予選・過去大会のみか**は導入前に公式サポートへ要確認（後述リスク参照）。いずれにせよ**無料枠はライブスコアが遅延**のため、リアルタイム用途では有料前提で考える。

---

## 3. 評価軸ごとの詳細

### 3.1 無料枠の有無と上限

- **football-data.org**: 登録済 Free で **10 req/分**。非認証だと 24h で 100 req かつ一覧系のみ。無料枠でも 12 コンペ（World Cup を含むと記載）にアクセスできるが、**スコアは遅延**。
- **API-Football**: **100 req/日**。全エンドポイントにアクセスできるのが強みだが、1日 100 では W杯当日の複数試合ポーリングには到底足りない（プロトタイプ・検証用）。
- **worldcupapi.com**: 恒常無料枠なし（**7日トライアルのみ**）。

### 3.2 レート制限とライブ更新の現実性（ポーリング耐性）

- **API-Football Pro（$19/月・7,500 req/日）**: 15 秒間隔のデータ更新を謳う。**サーバー側で集約ポーリング**すれば、同時進行試合が多い日でも 7,500/日に収めやすい（後述設計案参照）。これが最有力の理由。
- **football-data.org Livescores（€12/月・20 RPM）**: 20 req/分 = 試合当日のポーリングには十分。ただし無料(10 RPM)＋遅延では同時試合のリアルタイム性が不足。
- **worldcupapi.com（200,000 req/日）**: 上限は潤沢だが価格(€499/月)が見合わない。**超過 €0.0009/req の従量課金**は上限なしで青天井になり得る → コスト急増リスクにフラグ。

### 3.3 2026 W杯カバレッジ

- **API-Football**: W杯2026（48チーム/16会場）を明示対応。league + season 指定で fixtures（試合・スコア）、events、lineups、standings、topscorers を取得可。SSG アプリの「ライブスコア＋順位反映」要件に直接合致。
- **football-data.org**: World Cup の取り扱いはあるが、**本大会ライブは Livescores 有料が現実的**。無料枠カバレッジの正確な範囲は要確認。
- **worldcupapi.com**: W杯専用に最適化。データ品質は高そうだが価格が壁。

### 3.4 商用利用 / 表示義務 / キャッシュ

- **football-data.org**: 商用は有料で可。**attribution 必須**（「Football data provided by the Football-Data.org API」をフッター等の視認できる場所に表示）。OSS への認証情報コミット禁止が規約明記。キャッシュはレート制御手段として許容される運用。
- **API-Football**: 商用可（プラン依存）。表示義務・キャッシュ規約は導入前に最新 ToS を要確認。
- **worldcupapi.com**: ToS の詳細（表示義務・キャッシュ可否）は**未確認**。Stripe 決済・「隠れ料金なし」を謳う点のみ確認。

### 3.5 SSG + 一部 ISR/オンデマンド再検証への適合性

- 本アプリは全 SSG が基本。ライブスコアは**ビルド時に焼き込めない動的データ**なので、ライブ部分のみ **ISR（短い revalidate）／オンデマンド再検証／Route Handler 経由のクライアント取得**に切り出すのが定石。
- どの API でも「**サーバー側（Route Handler）でポーリングし、結果をキャッシュ → クライアントへ配信**」が基本形。これにより無料枠/レート制限内に収めつつ、attribution・キー秘匿・キャッシュ規約を満たせる。`WorldCupRepository` に `getLiveScores()` 等を追加し、`static-repository` と `live-repository` を合成する形が拡張しやすい。

---

## 4. 推奨と根拠

### 第一候補: API-Football Pro（$19/月）

1. **無料枠で全エンドポイントを検証可能** → 開発・PoC を無料で進め、本番直前に Pro($19/月)へ昇格できる。
2. **15 秒のライブ更新 × 7,500 req/日** が、サーバー集約ポーリング設計と相性が良い（無料枠では 100/日で不足のため、本番は Pro 想定）。
3. **W杯2026 を明示サポート**（試合・スコア・イベント・順位・得点者）。要件をワンストップで満たす。
4. 月額が低く、**年額でも $228/年**と小規模アプリで負担可能。

### フォールバック A: football-data.org Livescores（€12/月）

- **attribution 表示を許容できるなら最安級**（年額 €144）。Premier League など他リーグへ将来拡張する場合の汎用性も高い。
- ただし**無料枠はライブが遅延**のため「無料でリアルタイム」は不可。無料枠は順位・確定スコアの**準静的反映**に留める使い方なら有用。

### フォールバック B: 無料枠での擬似ライブ（コストゼロ運用）

- football-data.org Free（10 RPM）や API-Football Free（100/日）で、**ライブの秒単位更新は諦め、数分間隔で確定スコア・順位のみ更新**する割り切り。SSG + ISR(例: 60〜120 秒) で「ほぼライブ」を演出。コスト最優先ならここから始め、反響を見て有料へ昇格。

### 不採用: worldcupapi.com

- データは充実だが **€499/月（年額 €5,988）** は本アプリの規模に対し過大。**超過従量課金（€0.0009/req）が上限なし**でコスト急増リスクもあり、見送り。

---

## 5. リスク（規約／表示義務／コスト）

| リスク | 内容 | 対応 |
|--------|------|------|
| **football-data.org の attribution 義務** | フッター等に指定文言の表示が必須。未表示は規約違反 | 採用時は UI に「Football data provided by the Football-Data.org API」を常設 |
| **無料枠カバレッジの不確実性** | football-data.org の無料 "Worldcup" が本大会ライブか予選/過去のみか不明瞭。カバレッジ表では FIFA World Cup が有料 49€〜 表記 | 導入前に公式サポート／カバレッジ詳細で要確認（未確認） |
| **無料枠ではリアルタイム不可** | football-data.org Free はスコア遅延。API-Football Free は 100 req/日で当日運用に不足 | 本番リアルタイムは有料前提で予算化 |
| **API-Football の日次上限リセット** | 7,500 req/日を試合日に使い切ると **UTC 0時まで失敗**し続ける | サーバー集約ポーリング＋キャッシュで消費を抑制、当日見込みリクエストを試算 |
| **worldcupapi の従量課金** | 200,000 req/日 超過で €0.0009/req（上限なし）→ 想定外の請求 | 不採用で回避 |
| **キャッシュ・ToS の未確認項目** | API-Football / worldcupapi のキャッシュ・表示規約の詳細は未確認 | 採用候補の最新 ToS を導入前に精読（下記 URL） |
| **キー漏洩** | クライアント直叩きはキー露出。football-data.org は OSS への認証情報コミットを規約で禁止 | **必ずサーバー側（Route Handler / Server Component）でキーを保持**し、クライアントへはスコアのみ返す |

---

## 6. ポーリング設計案（推奨: API-Football Pro 前提）

### 方針
- **クライアントから直接 API を叩かない。** Next.js の Route Handler（`app/api/live/route.ts` 等）または Server Component 内でサーバー集約ポーリングし、**キャッシュした結果をクライアントへ配信**。キー秘匿・レート節約・規約遵守を同時に満たす。
- `WorldCupRepository` に `getLiveScores()` / 動的 `getGroupStandings()` を追加し、`live-repository`（API）と既存 `static-repository`（openfootball）を**合成**。試合が無い時間帯は静的データにフォールバック。

### 更新間隔とキャッシュ
- **試合中（in-play）**: サーバー側ポーリング **30〜60 秒間隔**（API 自体は 15 秒更新だが、表示用途は 30〜60 秒で十分。レート節約）。
- **キックオフ前後/前後半・終了直後**: 一時的に短縮（例 20〜30 秒）可。
- **試合が無い時間帯**: ポーリング停止 → 静的データ＋ISR で配信。
- **クライアント**: SWR/ポーリング or ISR(`revalidate: 30`)。サーバーキャッシュ済みエンドポイントを叩くため、外部 API 消費は増えない。

### 無料枠／レート制限に収める工夫
- **集約**: 1 回のサーバーポーリングで「当日の全試合 fixtures」をまとめて取得し、1 リクエストで複数試合を更新（試合ごとに叩かない）。
- **アクティブ時間帯のみ稼働**: 試合スケジュール（既存の openfootball 静的データ）から **キックオフ±数時間のウィンドウだけ**ポーリングを有効化。
- **指数バックオフ**: 429/レート超過時はバックオフし、当日上限の枯渇を防止。
- **概算消費（API-Football Pro / 7,500 req/日）**: 試合日に同時刻帯の試合を 1 リクエストで集約取得し 30 秒間隔 → 1 試合枠あたり ~120 req/時。W杯の 1 日あたり試合枠を踏まえても **数百〜千 req/日に収まり、7,500/日の上限に十分な余裕**。グループステージの多試合日でも集約取得なら破綻しにくい。

### フォールバック構成
1. ライブ API がエラー/上限 → 直近のサーバーキャッシュを返す。
2. キャッシュも無効 → openfootball 静的データ（確定済みスコア/予定）を返す。
3. UI に「ライブ更新中／最終更新時刻」を明示し、遅延・停止時もユーザー体験を維持。

---

## 7. 次アクション（導入前チェックリスト）

- [ ] **football-data.org**: 無料 "Worldcup" が **本大会ライブを含むか** を公式サポート／カバレッジ詳細で確認（未確認）。
- [ ] **API-Football**: 最新 ToS でキャッシュ可否・表示義務を確認。W杯2026 の league/season ID をドキュメントで特定。
- [ ] 採用 API の**試合日リクエスト消費を実測/試算**し、プラン上限と突き合わせ。
- [ ] attribution 表示（football-data.org 採用時）を UI 要件に追加。
- [ ] キーは**サーバー側のみ**で保持する実装方針を CTO 配下に共有（`live-repository` 設計）。

---

## 参照（調査日: 2026-06-06）

- football-data.org Pricing — https://www.football-data.org/pricing
- football-data.org Coverage — https://www.football-data.org/coverage
- football-data.org API policies — https://docs.football-data.org/general/v4/policies.html
- football-data.org FAQ/Help（attribution・規約） — https://www.football-data.org/documentation/faq
- football-data.org Free Tier 分析（2026, TheStatsAPI） — https://www.thestatsapi.com/blog/football-data-org-free-tier-limits-2026
- API-Football Pricing — https://www.api-football.com/pricing
- API-Sports Football（製品情報） — https://api-sports.io/sports/football
- API-Football ratelimit 解説 — https://www.api-football.com/news/post/how-ratelimit-works
- API-Football「FIFA World Cup 2026 Guide」（HTTP 403 で本文未取得、検索結果で W杯2026 対応を確認） — https://www.api-football.com/news/post/fifa-world-cup-2026-guide-to-using-data-with-api-sports
- worldcupapi.com Pricing — https://worldcupapi.com/pricing
- worldcupapi.com（製品情報） — https://worldcupapi.com/
