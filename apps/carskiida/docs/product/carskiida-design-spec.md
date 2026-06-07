# carskiida ビジュアル設計書（ui-ux-designer）

> 作成: 2026-06-07 / 担当: ui-ux-designer（CPO委譲）
> 制約: 車両写真・メーカーロゴはMVP不使用。出典必須。データ密度が高い「図鑑」。Next.js + Tailwind CSS + Atomic Design。

## 1. アートディレクション

**コンセプト（1行）**
> **「整備記録（サービスマニュアル）の精度と、自動車専門誌の格式で、車を"製図する"百科事典」**

**ムード（採用案C）: テクニカル・ブループリント × 活版エディトリアル**

- 案A ネオン・ダッシュボード（HUD/サイバー）→ 不採用（陳腐・信頼感と矛盾・いかにもAI/SaaS）
- 案B ラグジュアリーカー広告（黒地金・写真主役）→ 不採用（写真禁止の制約と衝突）
- 案C（採用）整備士のサービスマニュアル＋専門誌の組版 → 製図線・断面図・諸元表・型式番号・出典脚注という「車の一次資料の美しさ」をUIの素材に。写真ゼロでも"本物のドキュメント"の重み。データ密度の高さが主役になる。

**記憶に残る一点**: 「ブループリント・グリッド」— 紺×シアンの製図方眼を全面に薄く敷き、その上に諸元・断面・世代年表を設計図のように配置。スクロールで方眼上を寸法線が走り、数値に矢印が引かれる。

**避けたい既視感（禁止）**: 白地に紫グラデ／Inter・Roboto・Noto Sans単独／角丸大きめのふわっとカード／絵文字アイコン／パステルSaaSダッシュボード／ヒーローの大きな車レンダリング画像／ベタ塗り背景。

## 2. デザイントークン

### 2-1. カラーパレット

支配色=製図紺、アクセント=シアン計測線＋朱の指示線。

**ライトテーマ（既定）= "Paper Blueprint"（生成りの製図用紙）**

| 役割 | トークン | HEX |
|---|---|---|
| 背景ベース | `--ck-bg` | `#F4F1EA` |
| 面（カード） | `--ck-surface` | `#FBFAF6` |
| 沈み | `--ck-surface-sunken` | `#ECE8DD` |
| 方眼線 | `--ck-grid` | `#D8D2C3` |
| ボーダー | `--ck-border` | `#C9C2B0` |
| ボーダー強 | `--ck-border-strong` | `#1B2A4A` |
| テキスト主 | `--ck-text` | `#1A1A18` |
| テキスト副 | `--ck-text-muted` | `#5A5648` |
| 支配色（紺） | `--ck-primary` | `#1B2A4A` |
| 支配色濃 | `--ck-primary-deep` | `#0E1B33` |
| アクセント・シアン | `--ck-accent` | `#0E7C86` |
| アクセント・朱 | `--ck-mark` | `#C0392B` |
| 出典バッジ | `--ck-source` | `#3A6B35` |
| 良/正 | `--ck-positive` | `#2F6B3C` |
| 注意/欠損 | `--ck-warn` | `#B36A12` |

コントラスト: text on bg ≈14:1(AAA)、primary on bg ≈11:1(AAA)、accent on surface ≈4.6:1(AA)、mark on surface ≈4.9:1(AA)。

**ダークテーマ = "Cyanotype"（青写真）**

| 役割 | トークン | HEX |
|---|---|---|
| 背景ベース | `--ck-bg` | `#0C1A33` |
| 面 | `--ck-surface` | `#13284A` |
| 沈み | `--ck-surface-sunken` | `#0A1428` |
| 方眼線 | `--ck-grid` | `#1E3A63` |
| ボーダー | `--ck-border` | `#2C4D7E` |
| ボーダー強 | `--ck-border-strong` | `#7FB7C4` |
| テキスト主 | `--ck-text` | `#E8EEF5` |
| テキスト副 | `--ck-text-muted` | `#9DB4CE` |
| 支配色 | `--ck-primary` | `#7FB7C4` |
| アクセント・シアン | `--ck-accent` | `#37D0DB` |
| アクセント・朱 | `--ck-mark` | `#FF7A5C` |
| 出典バッジ | `--ck-source` | `#8FC98A` |
| 良/正 | `--ck-positive` | `#7FD18C` |
| 注意/欠損 | `--ck-warn` | `#E0A451` |

コントラスト: text on bg ≈14:1(AAA)、accent on bg ≈8:1(AAA)、mark on bg ≈6.5:1(AA以上)。

**配色運用**: 支配色は構造線・見出しに集中。アクセント朱は「差分・注記・指示」だけに限定（1画面で数点）。色だけで意味を伝えない（差分は朱の下線＋▲/▼記号＋太字を併用）。

### 2-2. タイポグラフィ

| 役割 | フォント | 変数 | 用途 |
|---|---|---|---|
| 和文見出し | **Zen Old Mincho**（明朝） | `--ck-font-display` | 車種名・大見出し。明朝の格 |
| 和文本文 | **Zen Kaku Gothic New**（ゴシック） | `--ck-font-body` | 本文・UI |
| 欧文・型式/数値 | **IBM Plex Mono** | `--ck-font-mono` | 型式番号・諸元数値・出典ID・寸法（tabular-nums） |
| 欧文ラベル（任意） | **IBM Plex Sans** | `--ck-font-label` | "SPECIFICATIONS"等の英字ラベル |

数値は全てモノスペースに統一:
```css
.ck-num { font-family: var(--ck-font-mono); font-feature-settings: "tnum" 1, "zero" 1; font-variant-numeric: tabular-nums; }
```

**タイプスケール（1.250 Major Third、和文に抑制）**

| トークン | size/line-height | 用途 |
|---|---|---|
| `--ck-text-display` | 44px/1.15 | 車種名（明朝） |
| `--ck-text-h1` | 32px/1.25 | ページ大見出し |
| `--ck-text-h2` | 24px/1.3 | セクション見出し |
| `--ck-text-h3` | 19px/1.4 | サブ見出し |
| `--ck-text-body` | 16px/1.75 | 本文（和文行間広め） |
| `--ck-text-sm` | 14px/1.6 | 表セル・補足 |
| `--ck-text-xs` | 12px/1.5 | 脚注・出典・ラベル |
| `--ck-text-spec` | 18px/1.2 | 諸元数値（mono, tabular） |

和文指針: 本文 line-height:1.75、letter-spacing:0.02em。英字ラベルは大文字+letter-spacing:0.18em。

### 2-3. スペーシング/角丸/シャドウ/ボーダー/モーション

- スペーシング（4px基準）: `1:4 / 2:8 / 3:12 / 4:16 / 5:24 / 6:32 / 8:48 / 12:96`。セクション間は寛大、表行内は密。
- 角丸: `none:0 / sm:2px / md:4px / lg:6px`（**最大6px**。ふわっとSaaSカード禁止。表は2〜4px）。
- ボーダー: `hair:0.5px`（方眼/補助線）/ `thin:1px`（表罫）/ `bold:2px`（見出し枠/現在世代）。色でなく太さでヒエラルキー。
- シャドウ（抑制）: `sm: 0 1px 2px rgba(27,42,74,.06)` / `md: 0 4px 16px rgba(14,27,51,.10)`。グロー/ネオン不使用。
- モーション: `ease: cubic-bezier(.2,.7,.2,1)`（計器の針）/ `fast:120ms / base:240ms / slow:480ms`。高インパクトは「ページロードのステガード・リビール」に集中。`prefers-reduced-motion` で全無効。

### 2-4. データ密度の高い「図鑑」を美しく読ませる指針
1. 数値は mono＋右揃え＋tabular-nums。単位は muted・小さめ。
2. 表は縦罫を省き横罫hair＋zebra。ヘッダー行のみ bold下線。
3. ラベル列は固定幅・キャプス・muted、値列が主役。
4. 「欠損」を堂々と見せる: 空欄でなく `—`(muted)＋ホバー「データ募集中」。
5. 8〜12カラムのベースライングリッドを全画面共有（「一枚の設計図」感の源）。

## 3. キーコンポーネントのビジュアル指針

- **車種詳細ヘッダー（CarModelHeader/organism）**: 写真の代わりに「型式銘板（データプレート）」風。紺の帯に車名（明朝・白）、英字型式（mono）、ボディタイプ・年代を製図の図枠（タイトルブロック）として右下に。背景に極薄方眼＋寸法線。車のシルエットは単線アウトライン（SVGストローク fill無し）を薄く重ねる。
- **世代タイムライン（GenerationTimeline/organism）**: 横スクロールの「年表=計測軸」。水平基線に世代を等間隔ノード、型式コード+年（mono）。現在世代は accent 塗りノード＋指示線でカード接続。工場移管世代に朱マーカー＋「生産地変更」注記。state: default/hover/active/focus。
- **パーツ構造ビュー（PartsAnatomy/organism）**: カテゴリ別アコーディオン＋単線アイコン。ヘッダーは図面セクション見出し風（英字キャプス＋通し番号 01/02 mono）。グレード別搭載をドット・マトリクス（●標準/○OP/—非搭載、記号でA11y）。余裕があれば右に単線断面シェマ＋朱の指示線。
- **スペック表（SpecTable/organism）**: 2列（ラベル｜値）。ラベル=muted小キャプス、値=mono右揃え。横罫hairのみ。各値右端に出典バッジスロット。推定値は `*` ＋warnドット。
- **比較表（CompareTable/organism）**: 列=対象車（2〜4）、列ヘッダーはミニ・データプレート。差分は positive太字＋背景極薄/朱の下線、色＋記号（▲▼）＋太字の3点併用。sticky左ラベル列＋ヘッダー行。
- **出典バッジ（SourceBadge/atom）★信頼の象徴**: 角型バッジ、source枠＋mono小文字で種別記号化（vPIC/Wikidata/OEM/UGC）。ホバーで取得日・URL・信頼度。UGCは破線枠で一次資料と区別。state: default/hover/UGC/missing。
- **用語ツールチップ（TermTooltip/molecule）**: 朱の点線アンダーライン。ポップオーバーは紙カード。aria-describedby、フォーカス開閉、Escで閉じる。

## 4. 装飾・モーション・図版方針（写真ゼロで高級感）

- **背景・質感**: 全ページにブループリント方眼（主96px+補助24pxの2層、grid色）。極薄ペーパーグレイン（SVG feTurbulence opacity 3〜5%）を最前面。ベタ塗り禁止。セクション境界に寸法線装飾。
- **アイコノグラフィ**: 全アイコン単線（1.5px stroke, fill無し）。Lucideベースに stroke-width:1.5・角張り調整 or 専用SVGセット。絵文字禁止。
- **図版（写真の代替）**: 車両=単線アウトライン（サイドビュー/断面）のSVG（権利クリア）。生産地=単線の日本/世界地図＋工場ノード（P2地図の布石）。MVPは代表ボディタイプ数種の汎用シルエットで足りる。
- **モーション**: 初回ロードのステガード・リビール（帯→年表基線が左から stroke-dashoffset で引かれる→数値が段差フェードイン、0〜600ms）。マイクロは世代切替クロスフェード・行hover罫線変化・出典バッジ塗り・ツールチップフェードのみ。`prefers-reduced-motion` で停止。

## 5. トーン&ボイス整合
- 文体: 信頼感のある専門誌調（「〜である/〜だ」基調、説明は「〜です・ます」で初心者に開く二段構え）。誇張・煽り禁止。
- 推定・欠損は隠さず明示。ラベルは日本語＋英字キャプス併記（諸元 / SPECIFICATIONS）。
- マイクロコピー例: 空状態「このグレードのデータは収録準備中です。出典が確認でき次第追加します。」／欠損「— 出典未確認」。

## 6. frontend-developer への実装指示
1. `apps/carskiida/src/styles/theme.css` に Tailwind v4 `@theme` でトークン定義（カラー/フォント/スペーシング/radius/shadow/ease。ライト既定、`[data-theme="dark"]` で上書き）。
   ```css
   @theme {
     --color-ck-bg:#F4F1EA; --color-ck-primary:#1B2A4A;
     --color-ck-accent:#0E7C86; --color-ck-mark:#C0392B;
     --font-display:"Zen Old Mincho",serif;
     --font-body:"Zen Kaku Gothic New",sans-serif;
     --font-mono:"IBM Plex Mono",monospace;
     --radius-lg:6px; --ease-ck:cubic-bezier(.2,.7,.2,1);
   }
   [data-theme="dark"]{ --color-ck-bg:#0C1A33; /* ダーク群 */ }
   ```
2. フォントは `next/font/google` で Zen Old Mincho / Zen Kaku Gothic New / IBM Plex Mono を読み込みCSS変数化（display:swap、本文ゴシック優先プリロード）。
3. ブループリント背景＋グレイン: templates層ルートに方眼（2層 linear-gradient）＋グレイン（SVGノイズ opacity 0.04）を疑似要素、`pointer-events:none`。
4. 数値ユーティリティ `.ck-num`（mono+tabular-nums）を全諸元・比較・型式に適用。
5. Atomic Design 配置:
   - atoms: SourceBadge / SpecValue / TermMark / LineIcon / GenerationNode
   - molecules: SpecRow / TermTooltip / PartMatrixCell
   - organisms: CarModelHeader / GenerationTimeline / PartsAnatomy / SpecTable / CompareTable
   - templates: EncyclopediaTemplate（方眼＋グレイン＋8〜12カラムグリッド土台）
6. モーション: ロードのステガードは animation-delay 段差（CSSのみ可）。寸法線は SVG stroke-dasharray/offset。必ず prefers-reduced-motion 分岐。

**A11y/整合**: 新規アプリのため `ck-` プレフィックスで名前空間分離。本文・主要UIは AA(4.5:1)。差分・状態・出典種別は必ず色以外の手がかり併用。全インタラクティブ要素に可視フォーカスリング（accent 2px, offset 2px）。ライト/ダークはユーザー切替＋prefers-color-scheme。

## 7. CPO/Hiro 確認事項
- 車両の単線アウトラインSVG（サイドビュー/断面）を MVP でどこまで用意するか（汎用ボディタイプ数種で始めるか、看板車種だけ作り込むか）。制作工数に直結。
