# 原価電卓（genka-dentaku）ビジュアルデザイン仕様書

- **日付**: 2026-07-09
- **担当**: CPO → ui-ux-designer
- **役割**: 本書は **frontend-developer がそのまま実装に移せるデザイン指示書**である。ui-ux-designer はコードを書かない。トークン値・レイアウト・状態・コンポーネント目録を確定し、実装は CTO 経由で frontend-developer に委譲する。
- **入力文脈**: `docs/marketing/genka-dentaku-gtm.md`（ペルソナ・H1・トーン）／`docs/finance/genka-dentaku-costs.md`（Free/Pro 価格）／`docs/strategy/restaurant-cost-calculator-brief.md`（wedge・ポジショニング）／`apps/genka-dentaku/docs/strategy/genka-dentaku-market-analysis.md`（競合UI）／`CLAUDE.md`（Atomic Design 規約・技術スタック）
- **技術前提**: Next.js (App Router) 静的エクスポート + React + TypeScript + **Tailwind CSS v4**（`@theme`）。完全クライアントサイド・ローカル完結（localStorage）。デプロイは Cloudflare Pages。

---

## 0. サマリー（最重要判断の要約）

| 判断 | 決定 | 一言根拠 |
|---|---|---|
| ベースカラー | **深いネイビー（支配色）＋温かみのあるニュートラル（サーフェス）＋チャコール（インク）** | 「電卓＝信頼できる計算の道具」を表す。ネイビー＝台帳・会計・精密機器の信頼色。温かいニュートラルは食のコンテキストに合い、冷たいSaaS/AI感と「白地に紫グラデ」の常套句を回避。厨房照明下で純白より眩しくない |
| 記憶に残る一点 | **「生きた原価率」** — 大きな等幅数字がネイビー地の中で緑→黄→赤にスナップし、仕入値を1つ直すと全メニューを**波及（リップル）カウントアップ**で即再計算する瞬間 | H1「仕入れ値を1つ直すだけで、全メニューの原価率が即再計算。」を画面上の体験そのものに翻訳 |
| セマフォ意味論 | **緑＝低原価率＝良好 / 黄＝注意 / 赤＝高原価率＝危険（反転厳禁）** | 原価率は低いほど利益大。閾値既定: 緑<30% / 黄30〜35% / 赤>35%（設定で変更可） |
| 色以外の状態表現 | 全ステータスを **色＋アイコン形状（○/△/⬢）＋テキストラベル（良好/注意/危険）＋位置（悪い順ソート）** で四重符号化 | 赤緑色覚のユーザーでも状態が判別可能。色は「強調」であって唯一の手掛かりにしない |
| タイポ | 日本語ゴシック（システムファースト、Noto Sans JP 自己ホストは post-MVP 任意）＋**主役数字は等幅（tabular）**。**v1 はヒーロー数字もシステム等幅スタックを既定**とし、IBM Plex Mono の採用は任意（post-MVP） | 個性は「奇抜なフォント」ではなく「数字とステータス体系」から出す。厨房での可読性・低ロードを最優先 |
| モバイルファースト | 親指到達域（画面下部）に主要アクション、タッチターゲット最小48px、入力フォント≥16px（iOSズーム防止） | ペルソナは厨房でスマホ操作 |

---

## 1. アートディレクション

### 1.1 トーン（1つに断定）

**「精密機器（プロ用調理器具／台帳）のような、静かで信頼できる計算の道具」。**

- **おもちゃっぽさの排除**: 漫画的イラスト・ネオン・過度な角丸・ポップな多色・弾むアニメーションを禁止。装飾はすべて「数字を読みやすくする」ために存在する。
- **数字が主役**: UIクロームは沈黙し（ネイビー／ニュートラル／チャコール）、彩度の高い色は**セマフォ（緑黄赤）とネイビーのみ**。原価率の数字だけが「大きく・色を持ち・動く」ことを許される。
- **温度感**: 完全なグレー無機質を避け、サーフェスにわずかな暖色を混ぜる（食＝厨房の温かみ、紙の台帳の質感）。ただし彩度は極小に抑え「プロの落ち着き」を保つ。
- **信頼のビジュアル契約**: 「データは端末内のみ」を常時見えるトラストバッジ（錠前アイコン＋文言）で明示。ヘッダー常設＋オンボーディング＋料金ページで反復。

### 1.2 記憶に残る一点（The one memorable thing）

**「生きた原価率」= ライブ再計算リップル。**

- レシピエディタや食材マスタで**仕入価格を1つ変更**すると、影響を受けた数値（各メニューの原価率・粗利、ダッシュボードのKPI）が **カウントアップ/ダウン（数値トゥイーン）** し、変化した数値に **セマフォ色の一瞬のハイライト** が走る。
- ダッシュボードでは行を**上から下へ40msずつ遅延**させて波及させ、「1つ直しただけで全部が動いた」という因果を視覚化する。
- これがwedge（食材価格変更→全メニュー即時再計算）とH1を体感に変える署名演出。**`prefers-reduced-motion` 時は即時スナップ**（後述 6.6）。

### 1.3 背景・質感（平坦さの回避、ただし抑制的に）

このプロダクトはマキシマルではなく**ミニマル×精度**の方向。装飾は最小限で、奥行きは以下の抑えた手段で作る:

- **層状のニュートラル**: 暖色オフホワイトのページ地（`--bg`）に、純白カード（`--surface`）を薄いシャドウで浮かせる。純白が暖色地の上で静かに際立ち、平坦さを回避（グラデーション不要）。
- **サンクン（沈み）面**: 入力ウェル・テーブルヘッダを一段暗いニュートラル（`--surface-sunken`）にして情報階層を作る。
- **ヘアライン**: 区切りは暖色ニュートラルの1pxヘアライン。強い黒罫線は使わない。
- **ネイビーの面**: ヒーロー／主要サマリー領域に濃紺の面を1箇所だけ使い、白＋セマフォの数字を最大コントラストで置く「計器パネル」を演出。多用しない（1画面1面まで）。
- **禁止**: 紫グラデ、放射グラデ、装飾的な大シャドウ、写真の上の文字、絵文字アイコン。

---

## 2. デザイントークン（提案値・Tailwindマップ可能）

> すべて **CSS カスタムプロパティ** として定義し、Tailwind v4 の `@theme` にマップする（実装指示は §9）。値は 16進 / rem / px の確定値。

### 2.1 カラー — サーフェス & インク（暖色ニュートラル）

| トークン | 用途 | Light 値 |
|---|---|---|
| `--color-bg` | ページ地（アプリの一番下の面） | `#F4F1EB` |
| `--color-surface` | カード／シート／行の面 | `#FFFFFF` |
| `--color-surface-sunken` | 入力ウェル、テーブルヘッダ、選択前トグル溝 | `#EFEBE3` |
| `--color-ink` | 主要テキスト・主要数字（暖色チャコール） | `#1C1917` |
| `--color-ink-secondary` | 補助テキスト・ラベル | `#57534E` |
| `--color-ink-muted` | キャプション・プレースホルダ・軸ラベル | `#8A857D` |
| `--color-border` | ヘアライン区切り | `#E7E2D9` |
| `--color-border-strong` | 強調区切り・入力枠 | `#D9D2C6` |

- `--color-ink #1C1917` on `#FFFFFF` = 約16:1 / on `#F4F1EB` = 約14:1（AAA）。数字が厨房のグレア下でも明瞭。

### 2.2 カラー — ブランド（ネイビー支配色）

| トークン | 用途 | 値 | コントラスト |
|---|---|---|---|
| `--color-primary` | 主要アクション（塗りボタン）・アクティブナビ・計器パネル地 | `#1E3A5F` | 白文字 **11.5:1**（AAA） |
| `--color-primary-hover` | ホバー | `#152B47` | — |
| `--color-primary-pressed` | プレス | `#0F2136` | — |
| `--color-primary-ink` | 白地上のネイビー文字・リンク・強調 | `#1E3A5F` | on 白 **11.5:1** |
| `--color-primary-subtle` | 選択・ソフト背景（淡ネイビー） | `#E7EDF4` | — |
| `--color-primary-onnavy` | ネイビー面上の淡い区切り/サブ文字 | `#BBD0E8` | on `#1E3A5F` ≥ 4.5:1 |

### 2.3 カラー — Pro プレミアムアクセント（真鍮／ゴールド、控えめ）

Free/Pro の差別化に**上質なゴールド**を「Proの記号」としてごく控えめに使う（王冠アイコン、細いゴールド罫、"PRO" ラベル）。**CTAボタン自体はネイビー**（一貫性）で、ゴールドは装飾記号に限定。

| トークン | 用途 | 値 | 注意 |
|---|---|---|---|
| `--color-pro` | 大きめの"PRO"ラベル・アイコン・ヘアライン（装飾・大文字用） | `#A9791F` | on 白 = 3.86:1 → **大テキスト(≥24px/太字18.66px)・アイコン・罫のみ**。小テキスト不可 |
| `--color-pro-ink` | 小サイズのゴールド文字が必要な場合 | `#7A5A12` | on 白 = 6.37:1（AA） |
| `--color-pro-subtle` | Proバッジ/カードの淡い地 | `#F6EEDC` | — |

- **黄セマフォとの衝突回避**: ゴールドは暗く茶みがかった`#A9791F`で、注意の明るいアンバーとは明度・彩度で判別可能。かつゴールドは**ステータス塗りに一切使わない**（Pro記号専用）。アイコン＋"PRO"ラベルの文脈で混同なし。

### 2.4 カラー — 原価率セマフォ（機能色・意味論固定）

**緑＝良好（低原価率）/ 黄＝注意 / 赤＝危険（高原価率）。反転厳禁。** 各ステータスは3トークン構成:
`-fg`（テキスト・数字用インク）／`-solid`（塗り：ステータス帯・メーターフィル・実塗りバッジの白文字地）／`-bg`（淡いティント：行/ソフトバッジの地）。

| ステータス | アイコン形状 | ラベル | `-fg`（テキスト） | `-solid`（塗り） | `-bg`（淡地） |
|---|---|---|---|---|---|
| 良好 | ○ チェック丸（circle-check） | **良好** | `#166534` | `#15803D` | `#E7F4EC` |
| 注意 | △ 三角警告（triangle-exclaim） | **注意** | `#92400E` | `#B45309` | `#FEF3E2` |
| 危険 | ⬢ 八角/塗り丸警告（octagon-x） | **危険** | `#991B1B` | `#B91C1C` | `#FBEAEA` |

**検証済みコントラスト（手計算・WCAG 相対輝度）**:

| 組み合わせ | 比率 | 判定 |
|---|---|---|
| 良好-fg `#166534` on 白 | 7.13:1 | AAA |
| 注意-fg `#92400E` on 白 | 7.09:1 | AAA |
| 危険-fg `#991B1B` on 白 | 8.31:1 | AAA |
| 各-fg on 暖色地 `#F4F1EB` | ≥ 6.3:1 | AA/AAA |
| 各-fg on 対応`-bg`ティント | ≥ 6.3:1 | AA/AAA（ソフトバッジ可） |
| 白文字 on 良好-solid `#15803D` | 5.01:1 | AA |
| 白文字 on 注意-solid `#B45309` | 5.02:1 | AA |
| 白文字 on 危険-solid `#B91C1C` | 6.47:1 | AA |

- **注意色は純黄ではなくアンバー**を採用。純黄はテキスト/境界で3:1すら満たせない（例: 明黄 on 白 ≈1.8:1）。信号の「黄」は実際アンバーであり、△アイコン＋「注意」ラベルで意味を担保するため問題なし。**メーターフィル・帯は`-solid`、テキスト・数字は`-fg`、地は`-bg`** と役割を固定して運用する。
- **色覚多様性（重要）**: 良好-fg と危険-fg は輝度が近く（L≈0.097 と 0.076）、赤緑色覚では色だけでは判別困難。よって **アイコン形状（○/△/⬢）＋ラベル＋悪い順ソート位置** を必須の判別チャネルとする。`forced-colors`/印刷時はストライプ質感（45°）を帯に付与（後述 6.5）。

### 2.5 タイポグラフィ

**フォントスタック**（`--font-*`）:

```
--font-sans: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Noto Sans JP",
             "Yu Gothic", "YuGothic", "Meiryo", system-ui, sans-serif;
--font-num:  ui-monospace, "SF Mono", "SFMono-Regular", "Consolas", "Menlo", "Hiragino Kaku Gothic ProN", monospace;
```

- **本文/UI**: `--font-sans`。システムファースト（厨房での低ロード・端末互換・ネイティブな信頼感）。ブランド一貫性を全端末で担保したい場合のみ **Noto Sans JP を自己ホスト・サブセット化（weight 400/500/700, `font-display: swap`）** して先頭に追加（frontend-developer 判断、既定はシステムファースト）。
- **数字（署名要素）**: ヒーロー数値（ダッシュボードKPIヒーロー、レシピエディタのライブ合計、シミュのbefore/after）について、**v1 はシステム等幅スタック（`--font-num`）を採用**（等幅で桁が揃い、電卓／レシート／台帳の精密感を出す）。**webフォント（IBM Plex Mono 等）の自己ホストは post-MVP の任意強化**（CTO のゼロ新規依存ポリシー準拠のため v1 はwebフォントを追加しない）。
- **表・行内の数値**: `--font-sans` に `font-variant-numeric: tabular-nums lining;` を必ず付与（桁揃え・カウントアップ時の幅ジャンプ防止）。
- **大きな単独数値**は等幅（tabular）で桁を揃える。逆に見出しなど整列不要の箇所は proportional で可。

**タイプスケール**（base 16px。モバイル→sm以上で一部拡大）:

| トークン | 用途 | size / line-height / weight |
|---|---|---|
| `--text-hero` | ヒーロー数値（原価率など） | 44px / 1.05 / 600（sm+: 56px）, tabular, letter-spacing -0.01em |
| `--text-metric-lg` | 行/カードの主要数値（原価率） | 22px / 1.1 / 700, tabular |
| `--text-metric` | 副数値（粗利・売価・有効単価） | 18px / 1.2 / 600, tabular |
| `--text-h1` | 画面タイトル | 24px / 1.4 / 700 |
| `--text-h2` | セクション見出し | 20px / 1.4 / 700 |
| `--text-h3` | カードタイトル | 17px / 1.5 / 700 |
| `--text-body` | 本文・入力値（**≥16px 厳守**） | 16px / 1.75 / 400 |
| `--text-body-sm` | 補助文 | 14px / 1.7 / 400 |
| `--text-label` | フォームラベル・ボタン | 14px / 1.4 / 500 |
| `--text-caption` | キャプション・法務・メタ | 12px / 1.6 / 400 |

- 日本語は行間を広めに（body 1.75）。数字は詰める（1.05〜1.2）。
- ボタン・ラベルは `--text-label`（500）。数字は基本 700（ヒーローのみ 600 で上品に）。

### 2.6 スペーシング（4px 基準・Tailwind 既定と一致）

`0, 4(1), 8(2), 12(3), 16(4), 20(5), 24(6), 32(8), 40(10), 48(12), 64(16)` px。

- **画面左右ガター**: 16px（`px-4`）。
- **カード内パディング**: 16px（狭所は12px）。
- **セクション間**: 24px。
- **リスト行の縦パディング**: 12〜16px（タップ域確保）。
- **フォーム項目間**: 16px。
- **タップ域の最小間隔**: 8px。

### 2.7 角丸 / シャドウ / ボーダー / z-index

```
--radius-sm: 6px;     /* 入力・小バッジ */
--radius-md: 10px;    /* カード・ボタン */
--radius-lg: 16px;    /* ボトムシート・モーダル */
--radius-pill: 9999px;/* セマフォピル・トグル・チップ */

/* 暖色チャコール基調の控えめな影（純黒を避ける） */
--shadow-sm: 0 1px 2px rgba(28,25,23,0.06);
--shadow-md: 0 2px 8px rgba(28,25,23,0.08);   /* カード */
--shadow-lg: 0 8px 24px rgba(28,25,23,0.12);  /* シート・モーダル */
--shadow-bar: 0 -2px 12px rgba(28,25,23,0.10);/* 下部固定バー（上向き影） */

--border-hairline: 1px solid var(--color-border);

/* z-index */
--z-base: 0; --z-sticky-header: 10; --z-bottom-nav: 20;
--z-dropdown: 30; --z-recalc-toast: 40;
--z-overlay: 50; --z-sheet: 60; --z-toast: 70;
```

- 角丸は**中庸（10px）**。極端な丸みは幼く、0pxは硬い。プロの落ち着きの中間点。
- 影は**静か**に。数字を主役にするため、面の分離は影よりヘアライン＋サーフェス差を優先。

### 2.8 タッチターゲット & フォーカスリング（アクセシビリティ）

```
--tap-min: 48px;         /* 全インタラクティブ要素の最小高さ/幅 */
--tap-min-compact: 44px; /* 密度が必要な副次操作の下限 */
--input-min-h: 48px;     /* 入力欄。font-size は必ず ≥16px */

/* フォーカス: ネイビーの明瞭なリング。offset で塗りボタン上でも視認 */
--focus-ring: 0 0 0 3px rgba(30,58,95,0.45);
--focus-outline: 2px solid var(--color-primary);
--focus-offset: 2px;
/* ネイビー面上のフォーカスは淡色リングに切替 */
--focus-ring-onnavy: 0 0 0 3px rgba(255,255,255,0.65);
```

- `:focus-visible` で必ず可視化。塗りボタンは outline + offset で境界外に出す。数値ステッパー等の小操作も 44〜48px を確保。

### 2.9 モーション

```
--dur-fast: 120ms;   /* ホバー・プレス */
--dur-base: 200ms;   /* 状態遷移 */
--dur-slow: 320ms;   /* シート/モーダル、カウントアップ */
--dur-count: 480ms;  /* 数値トゥイーン（ライブ再計算） */
--stagger: 40ms;     /* 行ごとの波及遅延 */
--ease-out: cubic-bezier(0.2, 0, 0, 1);
--ease-in:  cubic-bezier(0.4, 0, 1, 1);
```

- **高インパクトの瞬間に集中**（ライブ再計算、シート出現、Pro解錠成功）。散発的マイクロインタラクションは避ける。
- 詳細は §6.6（`prefers-reduced-motion` 必須対応）。

---

## 3. 情報アーキテクチャ & アプリシェル（モバイルファースト）

- **下部タブバー（親指到達域, `--z-bottom-nav`）**: `[ダッシュボード] [食材] [設定]` の3タブ。アクティブはネイビー、非アクティブは `--color-ink-muted`。各タブ 48px 以上、アイコン＋ラベル（色のみに依存しない）。
- **FAB（ダッシュボードのみ）**: 右下・下部ナビの上に「＋ 新規メニュー」。ネイビー塗り、`--shadow-lg`。親指到達域。
- **ヘッダー（上部固定, `--z-sticky-header`）**: 画面タイトル＋右に文脈アクション。**TrustBadge（錠前＋「データは端末内のみ」）を常設**（狭い画面ではアイコンのみ＋タップで文言、料金/オンボーディングでは全文）。
- **シミュレーション**: メニュー行アクション or レシピエディタの「値上げをシミュレーション」からボトムシートで開く（文脈起動）。Freeは単品、Proはダッシュボードのツールバーから一括起動（§7）。
- **料金/アップグレード**: 設定内「Proにアップグレード」＋各ゲートバナーから遷移。
- **セーフエリア**: 下部ナビ/FAB/固定バーは `env(safe-area-inset-bottom)` を考慮。

---

## 4. 画面別ビジュアル設計（構成・情報階層・状態）

各画面で **通常 / 空 / エラー / ローディング / Proゲート** を定義。ローディングは localStorage 即時読込のため最小だが、初期ハイドレーション・エクスポート生成・ライセンス照合で発生。

### 4.1 ダッシュボード（ホーム）

**目的**: 「どのメニューが危険か」を一目で。原価率が**悪い順（高い順）**に並ぶ。

- **上部: KPIサマリー（計器パネル）** — ネイビー面（`--color-primary`）を1枚敷き、白＋セマフォ数字を最大コントラストで配置。
  - **ヒーローKPI: 平均原価率**（`--text-hero`、`--font-num`、セマフォ色。ネイビー地上では各fgを明るめに補正するか、白＋下線セマフォ色バー、または数字白＋セマフォ・ピルを併置。可読性優先で「数字は白、状態はピル＋メーターで色付け」を推奨）。
  - **副KPI（KpiCard×2〜3）**: 「危険メニュー数」（赤カウント）／「登録メニュー数」／任意「平均粗利」。各カードに前回比デルタ（任意）。
- **ツールバー**: 検索（SearchBar）＋ソート（SortControl 既定「原価率が悪い順」、他: 名前順/粗利が低い順）。Proは「一括値上げシミュレーション」ボタンをここに（Freeはロック表示）。
- **メニュー一覧（DashboardMenuList）**: 各行 = **MenuRow**
  - 左端に **3〜4px のステータス帯（`-solid`）**。
  - メニュー名（`--text-h3`）＋売価（副数値）。
  - 右に **CostRatePill**（アイコン＋原価率% `--text-metric-lg` `-fg`色＋ラベル）と **粗利**（チャコール、色付けしない）。
  - 末尾に chevron。行全体 48px 以上でタップ→レシピエディタ。
  - **危険行のみ**任意で `-bg` ごく薄ティント可（多用しない）。
- **凡例導線**: KPI付近に「凡例（i）」→ SemaphoreLegend ポップオーバー（良好/注意/危険＋現在の閾値、設定へのリンク）。

**状態**:
- **空（メニュー0件）**: EmptyState（皿/レシピのラインアイコン＋「まだメニューがありません」＋「サンプルを入れて試す」主CTA＋「新規メニュー」副CTA）。→ オンボーディング（§5）へ接続。
- **空（検索該当なし）**: 「『◯◯』に一致するメニューはありません」＋検索クリア。
- **ローディング**: MenuRow スケルトン3〜4行（ニュートラルのシマー、reduced-motion時は静止）。
- **エラー**: ストレージ利用不可（プライベートモード等）時、上部に警告バナー「この端末では保存できません。計算は使えますが、閉じると消えます」。
- **Proゲート**: 一括シミュレーションボタンにゴールド鍵＋タップで UpgradePrompt。メニュー4件目作成時は §7 のゲート。

### 4.2 食材マスタ（一覧 / フォーム）

**目的**: 有効単価を正しく持たせる（原価計算の土台）。ここでの価格更新が全メニューに波及する。

- **一覧（IngredientListPanel）**: SearchBar ＋ 食材リスト。各項目 = 食材名／**有効単価（ComputedReadout, tabular）**／編集導線。右下に「＋食材を追加」。
  - 有効単価が「この食材を使う全メニューに波及する」ことを、更新時のリップル（§1.2）で示す。
- **フォーム（IngredientForm / IngredientFormSheet）**: ボトムシートで開く。
  - フィールド: 食材名（TextInput）／購入価格（NumberInput ¥）／**税込・税抜トグル（TaxToggle）**／購入量（NumberInput ＋ UnitSelect）／歩留まり率（NumberInput %、既定100）。
  - **有効単価の自動表示（ComputedReadout）**: `有効単価 = 税抜換算価格 ÷（購入量 × 歩留まり率）`。ネイビー淡地（`--color-primary-subtle`）の計算結果ブロックに「有効単価 ◯◯ 円/g」を tabular で大きく表示し、入力に応じ**ライブ更新（カウントアップ）**。
  - 保存/キャンセルはシート下部固定（親指域）。保存はネイビー塗り。

**状態**:
- **空（食材0件）**: EmptyState「食材を登録すると、メニューの原価を自動計算できます」＋「サンプル食材を入れる」＋「食材を追加」。
- **エラー（入力）**: 購入価格・量が0/負、歩留まり0（0除算）→ フィールド下に HelperText（危険色＋△アイコン＋「1以上を入力してください」）。有効単価ブロックは「—」表示。
- **ローディング**: なし（即時）。保存時はボタンにスピナー（一瞬）。
- **Proゲート**: 食材数は Free でも制限しない方針（制限はメニュー3件）。

### 4.3 レシピ（メニュー）エディタ — **wedge体験の中心**

**目的**: 材料を足すと **原価/原価率/粗利がライブ更新**。「価格を1つ変えると全部変わる」を最も強く体感させる。

- **上部**: メニュー名（TextInput）／売価（NumberInput ¥、大きめ）／税設定（TaxToggle、既定は設定準拠）。
- **材料明細（RecipeLineRow のリスト）**: 各行 = 食材ピッカー（IngredientPicker、検索付き）＋使用量（NumberStepper ＋ 単位自動）＋**行原価（tabular, 自動）**＋削除。行追加は「＋材料を追加」。
- **ライブコストサマリー（LiveCostSummary, 画面下部に固定）**: 計器パネル（ネイビー面）で常時見える。
  - **原価率（ヒーロー）**: `--text-hero` `--font-num`、**CostRateMeter**（0〜100%、30/35%に閾値ティック、フィルは`-solid`セマフォ）＋ CostRatePill（アイコン＋ラベル）。
  - 原価（tabular）／粗利（tabular）を併記。
  - **ライブ更新**: 使用量変更・食材価格変更で数値がカウントアップし、変化値にセマフォ・ハイライトが走る（§1.2）。原価率が閾値を跨いだ瞬間、メーターとピルの色＝状態が切替。
  - 「値上げをシミュレーション」ボタン（→ 4.4）。

**状態**:
- **空（材料0件）**: サマリーは「原価 ¥0／原価率 —／材料を追加すると計算されます」。中央に淡い「＋材料を追加」誘導。
- **エラー**: 売価未入力→原価率は「売価を入力してください」。使用量0/負→行にインラインエラー、その行を合計から除外し注記。
- **ローディング**: なし（即時）。
- **Proゲート**: 4件目のメニューを新規作成しようとした時にゲート（§7）。既存3件の編集は常に可能。

### 4.4 値上げシミュレーションパネル

**目的**: 「原価率◯%にするには何円？」を即答。before/after を対比。

- **起動**: ボトムシート（`--radius-lg`, `--shadow-lg`）。
- **入力**: **目標原価率**（SimulationSlider ＋ 数値入力、既定30%）。スライダーのトラックに30/35%閾値マーカー。
- **結果（BeforeAfterStat）**: 「現在 売価¥◯（原価率◯%）→ **推奨売価¥◯**（原価率◯%）」。推奨売価と差額を tabular で大きく。原価率のbefore/afterはセマフォ色＋アイコン。
- **適用**: 「この売価を反映」ボタン→レシピの売価を更新（→リップル再計算）。
- **プランによる出し分け**:
  - **Free**: 単品のみ。シート下に「一括適用はProで」＝ゴールド鍵＋UpgradePrompt（非攻撃的）。
  - **Pro**: ダッシュボードから起動時に「全メニューに目標原価率◯%を一括適用」モード。適用プレビュー（対象メニュー数・平均原価率のbefore/after）→確認→リップルで一括更新。

**状態**: 空=対象メニュー未選択時ガイド／エラー=目標原価率>100%等は不可・注記／ローディング=一括適用時に進捗（対象多い場合）／Proゲート=一括モードのロック。

### 4.5 料金ページ（Free vs Pro）

**目的**: 価値の対比とPro解錠導線。財務文書の機能差を反映。

- **ヘッダー**: 「原価電卓 Pro」＋一言価値（「レシピ無制限・PDF/CSV出力・値上げシミュレーション・原価率アラート」）＋ TrustBadge。
- **プラン切替（PlanToggle）**: 月額 / 年額 の SegmentedControl。年額側に **「2ヶ月分お得」バッジ**（¥9,800/年 = 実質¥817/月）。**既定選択＝年額（主CTA）**とする。
- **比較表（PricingTable, PlanFeatureRow のリスト）**: 財務文書に一致。

  | 機能 | Free | Pro |
  |---|---|---|
  | メニュー登録 | 3件まで | 無制限 |
  | 保存（端末内） | ○ | ○ |
  | JSONバックアップ／復元 | ○ | ○ |
  | ライブ再計算 | ○ | ○ |
  | 値上げシミュレーション（単品） | ○ | ○ |
  | 値上げシミュレーション（一括適用） | — | ○ |
  | PDF / CSV 出力 | — | ○ |
  | 原価率アラート（信号色＋悪い順ダッシュボード） | ○ | ○ |

  （Free列の「—」は危険色ではなく `--color-ink-muted` のダッシュ＋鍵アイコン。Pro列の「○」はネイビー、目玉機能行に細いゴールド罫。）
- **価格カード**: Pro ¥980/月 または ¥9,800/年（tabular）。主CTA「Proにアップグレード」（ネイビー塗り、Stripe Payment Linkへ）。
- **Pro解錠（LicenseKeyField）**: 「購入済みの方: ライセンスキーを入力」。TextInput＋「解錠」ボタン。成功時は緑チェック＋祝いの一瞬の演出（控えめ）＋Pro状態バッジ（ゴールド）。失敗時は危険色インラインエラー。
- **信頼補強**: 「登録不要・ブラウザだけ・データは端末内のみ」を再掲。特商法/プライバシー/FAQへのリンク（同一トークン準拠、後述 4.6）。

**状態**: 通常/年額選択時のお得表示／ライセンス照合中（ボタンスピナー）／照合失敗（エラー）／既にPro（CTAを「Pro利用中」バッジ＋管理リンクに置換）。

### 4.6 ランディング（ヒーロー）＋ 法務ページ

- **ヒーロー（MarketingHero, MarketingTemplate）**:
  - **H1（固定）**: 「仕入れ値を1つ直すだけで、全メニューの原価率が即再計算。」（`--text-h1`〜特大、日本語見出しは太字ゴシック）。
  - **サブ**: 「値上げシミュレーションで“原価率30%にするには何円？”がすぐわかる。POS不要・登録不要、ブラウザだけ。レシピと仕入価格は端末の外に出ません。」
  - **CTA**: 「無料で使ってみる」（ネイビー塗り、アプリへ）＋副「料金を見る」。
  - **視覚デモ**: ネイビーの計器パネルで、仕入値スライドに応じ原価率が緑→赤に動くミニデモ（記憶に残る一点の予告。reduced-motion時は静止対比）。
  - **トラスト**: 錠前＋「データは端末内のみ／登録不要」。
- **特商法・プライバシー・FAQ**: MarketingTemplate＋LegalPageLayoutで**同一トークン**（本文16px以上、見出し、ヘアライン、フッターにTrustBadge＋法務リンク）に従う旨をここで一言明記。装飾は最小、可読性最優先。

---

## 5. 空状態・サンプルデータ・オンボーディング

### 5.1 空状態（EmptyState 共通方針）

- 構成: **ラインアイコン（1色, `--color-ink-muted`）＋見出し（何をすると何が起きるか）＋主CTA＋副CTA**。イラストは使わず、抑制的なアイコンのみ（おもちゃっぽさ回避）。
- コピーは「不足」ではなく「次の一歩」を示す（例: ×「データがありません」→ ○「サンプルを入れて、価格を1つ変えてみましょう」）。
- 適用箇所: メニュー0件／食材0件／検索該当なし／シミュ対象未選択。

### 5.2 サンプルデータ & オンボーディング（wedge即体験）

**初回起動フロー（OnboardingSheet）**:

1. **ようこそ（1画面）**: 「原価電卓へ。仕入れ値を1つ直すと、全メニューの原価率が一気に変わります。」＋TrustBadge。CTA「サンプルで試す」／「自分のデータで始める」。
2. **サンプル投入**: 「サンプルで試す」で**プリセット食材（鶏もも/小麦粉/油/米/キャベツ 等）＋サンプルメニュー「唐揚げ定食」1品**を投入。投入されたことをリップルで見せる。
3. **“1つ変える”の魔法（ガイド付き）**: コーチマークで「鶏ももの仕入値を上げてみましょう」→ユーザーがスライド/入力→**唐揚げ定食の原価率が緑→黄→赤にスナップ＋カウントアップ＋ダッシュボードKPIも連動**。ここが「価格を1つ変えると全部変わる」の体感ピーク。
4. 完了「これがあなたの店でも動きます」→「自分のメニューを追加」CTA。

**サンプルの明示とクリア**:
- サンプルデータには **SampleDataBanner**（「これはサンプルです」チップ＋「サンプルを消して自分のデータを入力」）を一覧上部に常設。各サンプル項目に小さな「サンプル」タグ（`--color-ink-muted`）。
- 設定＞データ管理に「サンプルを削除」「全データを消去」を用意（破壊的操作は確認ダイアログ＋危険色）。

**演出方針（変化の可視化）**:
- 変化した数値: `--dur-count` のカウントアップ（tabular で幅固定）＋変化直後に該当セルへ `-bg` セマフォ・ハイライトを乗せ ~600ms でフェードアウト。
- 閾値跨ぎ: メーターとピルの色＋アイコン＋ラベルが同時に切替（色だけでなく形＋語で伝える）。

---

## 6. アラート・凡例・閾値設定・アクセシビリティ

### 6.1 セマフォ凡例（SemaphoreLegend）

- ダッシュボードKPI付近の「凡例（i）」と設定内に常設。良好/注意/危険の**アイコン＋色＋ラベル＋現在の閾値（例: 良好<30% / 注意30〜35% / 危険>35%）**を1行ずつ。設定への「閾値を変更」リンク。

### 6.2 原価率アラート（Free）

- 原価率アラート（信号色＋悪い順ダッシュボード＋危険サマリーバナー）は **Free で提供**（PRD 5.1 準拠、無料体験の核）。危険閾値超過メニューをダッシュボード上部に集約バナー（危険色＋⬢アイコン＋「危険な原価率のメニューが◯件」＋該当へジャンプ）で提示する。

### 6.3 閾値設定（ThresholdSetting, 設定画面）

- 「良好の上限（既定30%）」「注意の上限（既定35%）」を NumberInput 2つで設定。入力に応じ **プレビューメーター**（CostRateMeter）が色帯を即更新。整合バリデーション（良好上限<注意上限）＋リセット。税の既定（税込/税抜）もここで設定。

### 6.4 設定画面（SettingsPanel）その他

- データ管理: **エクスポート（PDF/CSV, Pro）／インポート／全消去（危険）／サンプル削除**。Proステータス／ライセンス管理。法務リンク（特商法・プライバシー・FAQ）。TrustBadge再掲。

### 6.5 アクセシビリティ（最低線の厳守）

- **コントラスト**: 本文AA 4.5:1、大テキスト/UI境界3:1。本書の全セマフォ`-fg`はAAA、`-solid`白文字はAA（§2.4検証表）。ゴールドは大/装飾限定。
- **色以外の状態表現**: ステータスは常に **色＋アイコン形状（○/△/⬢, 形で区別）＋テキストラベル＋ソート位置**。色単独禁止。
- **`forced-colors`/印刷/重度CVD**: セマフォ帯に **45°ストライプ質感**（良好/注意/危険で角度・密度を変える）を予備チャネルとして用意（既定オフ、`forced-colors`・印刷・アクセシビリティ設定でオン）。
- **タッチ**: 全操作 48px（下限44px）、間隔8px、主要操作は親指域。
- **フォーカス**: `:focus-visible` を全操作で可視（§2.8）。ネイビー面上は淡色リング。
- **入力**: フォント≥16px（iOSズーム防止）、`inputmode="decimal"` を数値に、ラベルと入力の関連付け（`<label for>`）、エラーは `aria-describedby` で読み上げ。
- **スクリーンリーダー**: 原価率セルは「原価率32%、注意」のように色＋状態語をテキストで提供（`aria-label`）。リップルの数値変化は視覚演出のみで、確定値はDOMに即反映（読み上げ阻害しない、`aria-live` は多用しない）。

### 6.6 モーションの配慮（`prefers-reduced-motion`）

- reduced-motion 指定時: **カウントアップ無効（最終値へ即スナップ）**、行の波及stagger無効、ハイライトのフェード演出を1フレームの静的表示 or 省略、シート/モーダルはフェードのみ（スライド抑制）。機能フィードバックは色＋アイコン＋テキストで担保（動きに依存しない）。

---

## 7. アップグレード誘導（非攻撃的・説得的）

**原則**: 妨害せず、価値の文脈で提示。ダークパターン禁止。ゴールドの鍵/王冠を「Proの記号」として一貫使用。

- **メニュー3件上限到達（4件目作成時）— UpgradeGateBanner**:
  - モーダルではなく、作成アクション位置にインラインで展開。「無料プランはメニュー3件まで。Proでレシピ無制限に。」＋現在の3件は安全（消えない）と明記＋CTA「Proにする（¥980/月〜）」＋「あとで」。攻撃的な全画面ブロックにしない。
- **PDF/CSV出力・一括シミュ・原価率アラートに触れた時 — UpgradePrompt（インライン）**:
  - 当該ボタンにゴールド鍵。タップで小さなポップオーバー/シート「この機能はProです」＋そのユーザーの実データでの価値（例: 「今すぐ全12メニューの原価表をPDFで出せます」）＋CTA＋dismiss。
- **料金への一貫導線**: どのゲートからも料金ページ（§4.5）へ。年額の「2ヶ月分お得」を提示。
- **トーン**: 焦らせない・誇張しない。「原価ミス1品で消える額（¥980/月）」の価値訴求はコピーで（CMO連携）、UI装飾は控えめに。

---

## 8. コンポーネント目録（Atomic Design）

CLAUDE.md 規約に厳密準拠: `src/components/{atoms|molecules|organisms|templates}/{PascalCase}/` に `Component.tsx` / `Component.test.tsx` / `index.ts`。**依存方向 atoms ← molecules ← organisms ← templates（逆依存禁止）**。ページ(`app/`)は templates を用い organisms/molecules で構成（ページ自体は階層外）。

### 8.1 atoms（最小単位・単体で意味を持つ）

| コンポーネント | 役割 | 主要 props（想定） | 使用箇所 |
|---|---|---|---|
| `Button` | 主要操作 | `variant('primary'|'secondary'|'ghost'|'danger')`, `size`, `fullWidth`, `loading`, `iconStart` | 全画面 |
| `IconButton` | アイコン操作（48px） | `icon`, `label(aria)`, `variant`, `size` | ステッパー・ナビ・閉じる |
| `Icon` | SVGアイコン | `name`, `size`, `title` | セマフォ○/△/⬢・錠前・王冠・＋等 |
| `TextInput` | テキスト入力 | `value`, `onChange`, `error`, `inputMode` | 名称・ライセンスキー |
| `NumberInput` | 数値入力（tabular） | `value`, `unit`, `min`, `step`, `error`, `inputMode='decimal'` | 価格・量・率 |
| `UnitSelect` | 単位選択（g/kg/ml/L/個/枚/本/合＋カスタム） | `value`, `onChange`, `allowCustom` | 食材・材料行 |
| `Select` | 汎用セレクト | `options`, `value`, `onChange` | ソート・単位基盤 |
| `SegmentedControl` | 2〜3択セグメント | `options`, `value`, `onChange` | 税込/税抜・月額/年額 |
| `Toggle` | スイッチ | `checked`, `onChange`, `label` | 設定トグル |
| `Slider` | レンジ | `value`, `min`, `max`, `ticks`, `onChange` | シミュ目標率 |
| `Checkbox` | チェック | `checked`, `onChange`, `label` | 一括選択等 |
| `Badge` | 汎用ラベル | `tone('neutral'|'info'|'pro')`, `children` | 「サンプル」「お得」「PRO」 |
| `StatusDot` | ステータス点（形状差付き） | `status('good'|'caution'|'danger')` | 凡例・小表示 |
| `Label` | フォームラベル | `htmlFor`, `required` | 全フォーム |
| `HelperText` | 補助/エラー文 | `tone('muted'|'danger')`, `children` | フォーム下 |
| `Spinner` | 読込 | `size` | ボタン・照合 |
| `Skeleton` | スケルトン | `w`, `h`, `radius` | 一覧ローディング |
| `Divider` | 区切り | `inset` | セクション間 |
| `Chip` | タグ/フィルタ（削除可） | `label`, `onRemove`, `tone` | サンプルタグ・フィルタ |

### 8.2 molecules（atoms の組合せ・機能単位）

| コンポーネント | 構成 | 主要 props | 使用箇所 |
|---|---|---|---|
| `FormField` | Label + input + HelperText | `label`, `error`, `hint`, `required` | 全フォーム |
| `NumberStepper` | NumberInput + ± IconButton | `value`, `step`, `unit`, `onChange` | 使用量入力 |
| `TaxToggle` | SegmentedControl(税抜/税込) | `value`, `onChange` | 食材・レシピ |
| `IngredientForm` | FormField 群 + ComputedReadout | `initial`, `onSave`, `onCancel` | 食材追加/編集 |
| `ComputedReadout` | ラベル+大tabular値（ネイビー淡地） | `label`, `value`, `unit`, `animate` | 有効単価・小計 |
| `IngredientPicker` | 検索付きセレクト | `ingredients`, `value`, `onSelect` | 材料行 |
| `RecipeLineRow` | IngredientPicker + NumberStepper + 行原価 + 削除 | `line`, `onChange`, `onRemove` | レシピエディタ |
| `CostRatePill` | Icon + 原価率%(tabular,`-fg`) + ラベル | `rate`, `status` | 行・サマリー |
| `CostRateMeter` | トラック + `-solid`フィル + 30/35%ティック | `rate`, `thresholds` | サマリー・設定プレビュー |
| `KpiCard` | ラベル + ヒーロー/大tabular値 + delta + 任意trend | `label`, `value`, `delta`, `status` | ダッシュボードKPI |
| `MenuRow` | ステータス帯 + 名称/売価 + CostRatePill + 粗利 + chevron | `menu`, `onOpen` | ダッシュボード一覧 |
| `SimulationSlider` | Slider + 目標率NumberInput | `target`, `onChange` | シミュ |
| `BeforeAfterStat` | before→after + 差額（tabular） | `before`, `after`, `metric` | シミュ結果 |
| `PlanFeatureRow` | 機能名 + Free表示 + Pro表示 | `feature`, `free`, `pro` | 料金表 |
| `PlanToggle` | SegmentedControl(月額/年額) + お得Badge | `cycle`, `onChange` | 料金 |
| `SearchBar` | TextInput + 検索/クリア | `value`, `onChange`, `placeholder` | 一覧 |
| `SortControl` | Select/Segment（原価率が悪い順 他） | `value`, `onChange` | ダッシュボード |
| `EmptyState` | Icon + 見出し + 説明 + CTA×2 | `icon`, `title`, `desc`, `primary`, `secondary` | 各空状態 |
| `TrustBadge` | 錠前Icon + 「データは端末内のみ」 | `variant('compact'|'full')` | ヘッダー/料金/オンボ |
| `UpgradePrompt` | 価値文 + CTA + dismiss（ゴールド鍵） | `feature`, `onUpgrade`, `onDismiss` | 各ゲート |
| `LicenseKeyField` | TextInput + 解錠Button + 状態 | `onVerify`, `status` | 料金/設定 |
| `ThresholdSetting` | NumberInput×2 + プレビューMeter | `thresholds`, `onChange` | 設定 |
| `SampleDataBanner` | Chip「サンプル」+ クリアCTA | `onClear` | 一覧上部 |
| `Toast` | メッセージ + 任意アクション | `message`, `action`, `tone` | 全体通知 |

### 8.3 organisms（独立セクション）

| コンポーネント | 構成 | 主要 props | 使用箇所 |
|---|---|---|---|
| `AppHeader` | タイトル + TrustBadge + 文脈アクション | `title`, `actions` | 全画面上部 |
| `BottomNav` | 3タブ（ダッシュボード/食材/設定） | `active`, `onNavigate` | AppShell |
| `KpiSummary` | ネイビー計器パネル + KpiCard群（平均原価率ヒーロー等） | `metrics` | ダッシュボード |
| `DashboardMenuList` | SortControl + SearchBar + MenuRow 一覧（悪い順） + 空状態 | `menus`, `sort`, `onOpen` | ダッシュボード |
| `IngredientListPanel` | SearchBar + 食材項目一覧 + 追加ボタン + 空状態 | `ingredients`, `onAdd`, `onEdit` | 食材画面 |
| `IngredientFormSheet` | ボトムシート + IngredientForm | `open`, `initial`, `onSave`, `onClose` | 食材追加/編集 |
| `RecipeEditor` | 名称/売価/TaxToggle + RecipeLineRow群 + 材料追加 + LiveCostSummary | `recipe`, `onChange` | レシピ画面 |
| `LiveCostSummary` | ネイビー計器パネル: 原価率ヒーロー + CostRateMeter + CostRatePill + 原価/粗利 + シミュ起動 | `cost`, `rate`, `margin`, `status` | レシピエディタ |
| `SimulationPanel` | ボトムシート: SimulationSlider + BeforeAfterStat + 反映CTA（Pro一括対応） | `mode('single'|'bulk')`, `target`, `onApply` | シミュ |
| `PricingTable` | PlanToggle + Free/Pro 2列 + PlanFeatureRow群 + CTA | `cycle` | 料金 |
| `UpgradeGateBanner` | 3件上限/機能ゲートのインライン展開 | `reason`, `onUpgrade`, `onDismiss` | 各ゲート |
| `OnboardingSheet` | ようこそ→サンプル投入→“1つ変える”ガイド→完了 | `onLoadSample`, `onStartBlank`, `onFinish` | 初回起動 |
| `SemaphoreLegend` | 良好/注意/危険 + 現在閾値 + 設定リンク | `thresholds` | ダッシュ/設定 |
| `SettingsPanel` | ThresholdSetting + 税既定 + データ管理 + Pro/ライセンス + 法務リンク | `settings`, `onChange` | 設定 |
| `RecalcIndicator` | ライブ再計算の一過性表示（「全メニュー再計算しました」） | `count`, `visible` | 価格更新時 |
| `MarketingHero` | H1 + サブ + CTA + ミニデモ + TrustBadge | — | ランディング |
| `FaqAccordion` / `LegalPageLayout` | FAQ/特商法/プライバシー本文レイアウト | `sections` | 法務ページ |

### 8.4 templates（レイアウト構造・データ非依存）

| コンポーネント | 役割 | スロット/props |
|---|---|---|
| `AppShell` | モバイルアプリ枠: AppHeader + main(スクロール) + BottomNav + FABスロット + シート/トースト用ポータル + セーフエリア | `header`, `children`, `fab`, `activeNav` |
| `MarketingTemplate` | ランディング/法務/FAQ: ヒーロースロット + セクション + フッター（TrustBadge + 法務リンク） | `hero`, `children`, `footer` |

- 設定・料金画面は `AppShell` を再利用（専用テンプレートは作らない）。

---

## 9. frontend-developer への実装指示

### 9.1 反映先ファイルと手順

1. **`apps/genka-dentaku/src/styles/theme.css`（新規）** に本書 §2 の CSS カスタムプロパティを **`:root` で全定義**。Tailwind v4 の `@theme` にマップして Tailwind ユーティリティから参照可能にする。例（抜粋・値は §2 準拠）:

   ```css
   @import "tailwindcss";

   @theme {
     /* surfaces / ink */
     --color-bg: #F4F1EB;
     --color-surface: #FFFFFF;
     --color-surface-sunken: #EFEBE3;
     --color-ink: #1C1917;
     --color-ink-secondary: #57534E;
     --color-ink-muted: #8A857D;
     --color-border: #E7E2D9;
     /* brand navy */
     --color-primary: #1E3A5F;
     --color-primary-hover: #152B47;
     --color-primary-subtle: #E7EDF4;
     /* pro gold */
     --color-pro: #A9791F;
     --color-pro-ink: #7A5A12;
     /* semaphore (fg / solid / bg) */
     --color-good-fg: #166534;  --color-good-solid: #15803D;  --color-good-bg: #E7F4EC;
     --color-caution-fg: #92400E; --color-caution-solid: #B45309; --color-caution-bg: #FEF3E2;
     --color-danger-fg: #991B1B; --color-danger-solid: #B91C1C; --color-danger-bg: #FBEAEA;
     /* radius / font */
     --radius-md: 10px; --radius-lg: 16px;
     --font-sans: "Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP","Yu Gothic","Meiryo",system-ui,sans-serif;
     --font-num: ui-monospace,"SF Mono","SFMono-Regular","Consolas","Menlo",monospace;
   }
   ```

   （Tailwind v3 を使う場合は `tailwind.config.ts` の `theme.extend.colors/fontFamily/borderRadius/boxShadow` に同値をマップし、`:root` の CSS変数を併設して参照する。）

2. **`apps/genka-dentaku/docs/product/genka-dentaku-design-tokens.md`（任意）** または **`design-tokens.json`** に §2 の全トークンを機械可読で複製したい場合は、本書の値をソース・オブ・トゥルースとして生成すること（重複時は本書が優先）。

3. **セマフォのユーティリティ運用ルール**（重要・遵守）:
   - テキスト/数字 = `-fg`、ステータス帯/メーターフィル/実塗りバッジ地 = `-solid`（白文字）、行/ソフトバッジ地 = `-bg`。この対応を崩さない（コントラスト保証が崩れるため）。
   - 状態は必ず **色 + アイコン(○/△/⬢) + テキストラベル** の3点セットでレンダリング（`CostRatePill`/`StatusDot` に内蔵）。色のみのレンダリング禁止。

4. **モーション**: §2.9 のトークンで実装。カウントアップ/リップルは `LiveCostSummary`・`MenuRow`・`KpiCard`・`ComputedReadout` に適用。`@media (prefers-reduced-motion: reduce)` で §6.6 のとおり無効化（最終値へ即スナップ）。

5. **フォント**: **v1 は追加webフォントなし**（本文＝システム日本語ゴシック、数値＝システム等幅スタック `--font-num`）。CTO のゼロ新規依存ポリシー準拠。**post-MVP の任意強化**として、ブランド統一のため Noto Sans JP／ヒーロー数値の IBM Plex Mono を self-host＋サブセット＋`font-display: swap` で追加してよい（Cloudflare Pages 静的配信、CLS/ロード最小化）。

6. **Atomic Design**: §8 の階層・ディレクトリ規約（1コンポーネント=1ディレクトリ、`Component.tsx`/`.test.tsx`/`index.ts`、PascalCase、依存方向厳守）に一致させる。ページは `AppShell`/`MarketingTemplate` を用いる。

### 9.2 注意点（整合・A11y の担保）

- **既存トークンとの整合**: 本アプリはグリーンフィールド（既存 theme/tokens なし）。本書がトークンの起点。以後の色追加は必ず本書のパレット内から取り、場当たりの新色を足さない。新ステータス/機能色が必要なら ui-ux-designer に差し戻す。
- **A11y の担保**: 本書 §2.4 の検証済みコントラストを崩す改変（例: `-fg` を明るくする、注意に純黄を使う、ゴールドを小テキストに使う）を禁止。フォーカスリング（§2.8）・タッチ48px・入力16px・`inputmode`・`aria-label`（原価率セルの色＋状態語）を実装で担保。
- **セマフォ意味論**: 緑=低原価率=良好、赤=高原価率=危険。**逆にしない。** 閾値は設定で変更可（既定 緑<30/黄30-35/赤>35）だが色と語の対応は固定。
- **プライバシーの視覚契約**: TrustBadge をヘッダー常設＋オンボーディング＋料金＋フッターで反復。外部送信を示唆するUI（クラウド同期アイコン等）を置かない。

---

## 10. 主要デザイン判断の根拠（レビュー用サマリー）

1. **ベースカラー = ネイビー×暖色ニュートラル×チャコール**: 「電卓＝信頼できる計算の道具」を色で体現。ネイビーは会計・台帳・精密機器の信頼色で、白文字11.5:1（AAA）と厨房グレアに強い。暖色ニュートラル地は食のコンテキストに馴染み、冷たいSaaS/AI感と「白地に紫グラデ」の常套句を回避。彩度の高い色をセマフォとネイビーに限定し、**原価率の数字を唯一の主役**にできる。
2. **セマフォ 3トークン制（fg/solid/bg）＋アンバー採用**: 純黄はテキスト/境界で3:1すら満たせないため、注意はアンバー（`-fg #92400E`=7.09:1）を採用。全`-fg`がAAA、全`-solid`白文字がAAで、役割（テキスト/塗り/地）ごとに使い分けてコントラストを保証。緑と赤は輝度が近く色単独では赤緑色覚に不利なため、**○/△/⬢の形状＋ラベル＋悪い順ソート**で四重符号化。
3. **フォント**: 厨房での可読性・低ロードを最優先しシステムファーストの日本語ゴシック。個性は奇抜なフォントでなく**等幅の主役数字**から出す。**v1 はシステム等幅スタック**で桁を揃え、ブランド名「電卓」の比喩を数字の見た目で回収する（IBM Plex Mono の採用は post-MVP の任意強化）。
4. **記憶に残る一点 = ライブ再計算リップル**: 「仕入れ値を1つ直すと全メニューが即再計算」というwedge/H1を、カウントアップ＋セマフォ・ハイライト＋行の波及演出で体感に変換。オンボーディングの「1つ変える魔法」で初回から刺す。

---

*本書は frontend-developer 実装用の確定指示。トークン改変・新色追加・セマフォ意味論の変更は ui-ux-designer レビューを要する。*
