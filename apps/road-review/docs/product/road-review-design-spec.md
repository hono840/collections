# 公道レビュー（road-review）ビジュアル設計書 v1.1

- 作成: ui-ux-designer（CPOの配下）。CPOがPRD v1.1・UX文書と照らし合わせて統合した
- 対象: アプリ全体（スマホ向けは360pxから。ライト/ダーク両対応）
- 実装担当: frontend-developer（この文書は値と見た目の仕様まで。コードは書かない）
- 注意: コントラスト比はすべて、WCAGの相対輝度の式による手計算。実装した後に DevTools などで測り直すこと。

---

## 1. アートディレクション

### トーン
**「書棚の道路地図帳 / 道の図鑑」。静かで精度の高いフィールドガイド。**

紙の地図帳を開いたときの落ち着きをめざす。紙の地色、製図インクの藍と墨、等高線の茶色、地名の注記のような明朝の見出しを使う。「速さ」ではなく「土地を知る」楽しさを伝える。

### 記憶に残る一点
**道ごとの「等高線の表札」。** 道詳細の見出しの場所に、その道の種別に合った地形の等高線を敷き、道の名前を大きな明朝で組む。

| 種別 | 等高線の図柄 |
|---|---|
| 峠 | 2つの山頂の閉じた等高線の間に、鞍部（尾根の低くくぼんだ所）ができる形 |
| スカイライン | 尾根に沿って細長い楕円が伸びる形 |
| 海岸線 | 汀線（海と陸の境目）に沿って、平行な曲線が並ぶ形 |
| 林道 | 谷へV字に食い込む、密な等高線 |
| その他 | 間隔の広い、ゆるやかな等高線 |

5本に1本の線を太くする（地形図の「計曲線」にならう）。ほかの画面は静かに抑える。

### Do（やること）
- 紙の地色の上に、藍と墨で情報を置く。
- 見出しと道の名前は明朝、操作と本文はUD（ユニバーサルデザイン）ゴシックにする。
- 等高線は、見出しの場所・空状態・コレクション画面・ログイン画面だけで使う。
- 状態は、色・形・言葉の3つで伝える。
- 角の丸みは役割ごとに変える。
- 動きは、意味のある所だけにする。

### Don't（やらないこと）
- レースを思わせる表現: チェッカーフラッグ、速度計、タコメーター、赤×黒の配色、斜体のスピード線、炎、タイヤ痕、ゴールテープ、ストップウォッチ。
- 速さを思わせる動き: 横に流れるブラー、勢いのあるスライドイン、バウンス、点滅、カードが次々に現れる動き。
- 評価に、星や信号色のグラデーションを使うこと。交通量に良い・悪いの色を付けること。
- 安全バナーを、赤や警告色で強く出すこと。
- 紙のノイズ・ざらつきの質感画像。
- ボタンやリンクの文字の末尾に付ける「→」。
- 地図上で、開始ピンと終了ピンを直線でつなぐこと（実際の道筋だと誤解されるため）。
- AIデザインの定番の見た目: クリーム色の地にテラコッタ、白地に紫のグラデーション、英語の大文字ラベル、中黒でつないだ補足の文字。

---

## 2. デザイントークン

### 2-1. 色（意味ごとのトークン。Tailwindの名前）

| Tailwind名 | ライト | ダーク | 用途 |
|---|---|---|---|
| canvas | #EEF0EA | #1B2329 | 画面の地 |
| surface | #F8F9F5 | #222C33 | セクション・リストの地 |
| surface-raised | #FFFFFF | #2B3740 | カード・入力欄・シート |
| surface-sunken | #E3E6DE | #151B20 | 区切りの帯・切り替えの溝・道の情報カード |
| ink | #1E2A32 | #E6E8E1 | 本文・見出し |
| ink-muted | #4F5B60 | #A9B1AE | 補足 |
| ink-subtle | #646E72 | #8A938F | 入力例・押せない文字（ライトでは surface-sunken の上に置かない。ダークでは surface-raised の上に置かない） |
| line | #C9CEC4 | #36424A | 飾りの区切り線 |
| line-strong | #7D877F | #77837E | 入力欄・未選択セルの枠（3:1以上） |
| primary | #2B5179 | #8FB3DA | 主ボタン・選択・リンク・評価・進み具合 |
| primary-hover | #23446A | #A9C6E6 | ホバー |
| primary-active | #1B3757 | #BCD3EC | 押した瞬間 |
| on-primary | #FFFFFF | #14202B | primary の上の文字 |
| primary-subtle | #DCE5EE | #24364A | 選択中の淡い地 |
| accent | #8C5A2E | #D3A374 | 等高線と峠の記号だけ（UIの強調には使わない） |
| success | #2F6B45 | #7FC197 | 保存の完了 |
| warning | #7A5500 | #E2B85C | 確認日が古い・林道の「注意」 |
| warning-subtle | #F5ECD3 | #3A3220 | 同じく、その地 |
| danger | #A3392E | #F0968A | 削除・エラー |
| danger-hover | #8A2F26 | #F4ADA3 | 削除ボタンのホバー |
| danger-subtle | #F6E3DF | #3D2624 | エラーの地 |
| on-danger | #FFFFFF | #14202B | danger の上の文字 |
| info | #2E6470 | #86C0CC | 安全バナー・注記 |
| info-subtle | #E1ECEE | #1F3439 | 同じく、その地 |
| focus | #1F5FAD | #9CC3F0 | キーボード操作の枠 |
| inverse / on-inverse | #1E2A32 / #EEF0EA | #E6E8E1 / #1B2329 | トースト |
| scrim | rgba(20,28,34,0.48) | rgba(0,0,0,0.60) | シートの背後 |
| pin-ring / pin-outline / pin-selected / cluster | #FFFFFF / rgba(30,42,50,0.45) / #1E2A32 / #F8F9F5 | 同じ | 地図のピン（地図はどちらのモードでも紙のまま） |

### 2-2. コントラスト比（手計算）
**ライト**:
| 組み合わせ | 比 |
|---|---|
| ink / canvas | 12.8 |
| ink / surface-raised | 14.7 |
| ink / surface-sunken | 11.6 |
| ink-muted / canvas | 6.1 |
| ink-muted / surface-raised | 7.0 |
| ink-muted / surface-sunken | 5.6 |
| ink-subtle / canvas | 4.55 |
| ink-subtle / surface-raised | 5.2 |
| on-primary / primary | 8.2 |
| primary / canvas | 7.2 |
| primary / primary-subtle | 6.4 |
| accent / canvas | 5.1 |
| success / canvas | 5.5 |
| warning / warning-subtle | 5.7 |
| on-danger / danger | 6.6 |
| danger / danger-subtle | 5.3 |
| info / info-subtle | 5.5 |
| line-strong / canvas | 3.2 |
| line-strong / surface-raised | 3.7 |
| focus / canvas | 5.5 |

**ダーク**:
| 組み合わせ | 比 |
|---|---|
| ink / canvas | 12.9 |
| ink / surface-raised | 9.9 |
| ink-muted / canvas | 7.3 |
| ink-muted / surface-raised | 5.6 |
| ink-subtle / canvas | 5.0 |
| ink-subtle / surface | 4.5 |
| on-primary / primary | 7.6 |
| primary / canvas | 7.3 |
| accent / canvas | 7.0 |
| success / canvas | 7.6 |
| warning / warning-subtle | 6.8 |
| on-danger / danger | 7.4 |
| danger / danger-subtle | 6.3 |
| info / info-subtle | 6.5 |
| line-strong / surface-raised | 3.1 |
| focus / canvas | 8.7 |

### 2-3. 道の種別カラー（必ず記号とセットで使う）
| 種別 | 記号 | ライト | ダーク | バッジ地（ライト / ダーク） |
|---|---|---|---|---|
| 峠 | 峠記号「)(」（外向きの弧2本が背中合わせ） | #B06A22 | #E8B57A | #F3E6D6 / #3A2E22 |
| スカイライン | なだらかな山形の折れ線と、その上の1本の線 | #6A4C93 | #B7A6E0 | #ECE6F4 / #2F2B40 |
| 海岸線 | 陸側の直線と、その下の波線2本 | #008577 | #3E9E8E | #DDF0EC / #1E3532 |
| 林道 | 針葉樹（三角と短い幹） | #3F6326 | #6E9A4E | #E4ECDB / #26321F |
| その他 | 中心に点のある輪 | #5F6669 | #A3ABA8 | #E7E9E6 / #2A3134 |

- **種別の色は、記号・ピン・枠だけに使う。文字には使わない。** バッジの文字はいつも ink にする。
- 記号・ピンのコントラストは、どれも3:1以上（ライトの canvas の上で、峠3.7〜林道6.0）。
- 色の見え方が違う人（色覚多様性）への配慮:
  - Okabe-Ito配色（色の見え方が違っても見分けやすい8色）をもとにする。
  - 黄みに見える組（峠・林道）と、青みに見える組（スカイライン・海岸線）の中で、明るさを変える。
  - 「その他」は色味のない灰色にする。
  - いちばん大事なのは、記号の形と文字ラベルで区別すること。
- 実装した後に、Chrome DevTools の色覚シミュレーションで4つの条件を確かめる。

### 2-4. 評価の色
- 評価には **primary 1色だけ**を使う。塗ったマスは primary、空のマスは line-strong の1pxの枠線だけ。
- 点数が高いか低いかで、色を変えない。数字と言葉をいつも添える。

### 2-5. 文字
| 役割 | 書体 | 太さ |
|---|---|---|
| 見出し・道の名前・コレクションの大きな数字 | Shippori Mincho B1（next/font、preloadなし） | 600 |
| 本文・操作 | BIZ UDPGothic（next/font、preloadあり） | 400 / 700 |
| 日付・件数・評価の数字 | BIZ UDGothic（等幅版）と tabular-nums | 400 / 700 |

- 代わりの書体（フォールバック）:
  - ゴシック: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", Meiryo, sans-serif
  - 明朝: "Hiragino Mincho ProN", "Yu Mincho", serif
- 3書体とも display:swap にする。明朝の太さは600の1つだけ。
- LCPが2.5秒を超えたら、まず明朝のWebフォントをやめ、端末に入っている明朝に切り替える。

**文字サイズ（1rem = 16px）**
| トークン | サイズ / 行の高さ | 書体 | 用途 |
|---|---|---|---|
| text-xs | 13 / 1.5 | sans | メタ情報（地図の出典だけは12pxでもよい） |
| text-sm | 14 / 1.6 | sans | 補足・バナー |
| text-base | 16 / 1.75 | sans | 本文・入力欄・ボタン |
| text-lg | 18 / 1.55 | mincho 600 | カードの道の名前 |
| text-xl | 21 / 1.45 | mincho 600 | セクションの見出し |
| text-2xl | 24 / 1.4 | mincho 600 | 画面のタイトル |
| text-3xl | 30 / 1.3 | mincho 600 | 道詳細の道の名前（md以上は36px） |
| text-4xl | 40 / 1.15 | mincho 600 | コレクションの数字 |
| text-5xl | 56 / 1.05 | mincho 600 | コレクションの合計（md以上） |

- 明朝の見出しには palt（かなの詰め）と、字間0.04emを付ける。本文には palt を使わない。
- 本文1行の長さは、全角で36字まで。
- 日付は、一覧・情報の行で YYYY-MM-DD にする。詳細の走行日は「2026年9月14日（日）」。

### 2-6. 余白（4px単位。Tailwind の --spacing は 4px）
- 段階: 0 / 2 / 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80（px）
- 画面の左右: 16px（768px未満）/ 20px（768px以上）/ 24px（1024px以上）
- セクションの間: 32px（スマホ）/ 48px（md以上）
- タップできる大きさ: 最小44×44px

### 2-7. 角の丸み
| トークン | 値 | 用途 |
|---|---|---|
| radius-xs | 2px | 評価のマス・小さな記号 |
| radius-sm | 6px | ボタン・入力欄・バナー・トースト |
| radius-md | 10px | カード・道の情報カード |
| radius-lg | 16px | シートの上の角・ダイアログ |
| radius-full | 9999px | バッジ・ラベル・まとめピン |

写真のサムネイルだけは4pxにする。

### 2-8. 影
| トークン | ライト | ダーク |
|---|---|---|
| shadow-0 | なし | なし |
| shadow-1（カード） | 0 1px 0 rgba(30,42,50,0.06), 0 1px 2px rgba(30,42,50,0.08) | inset 0 1px 0 rgba(255,255,255,0.04) |
| shadow-2（固定のバー・選択中の切り替え・トースト） | 0 2px 4px rgba(30,42,50,0.08), 0 6px 16px rgba(30,42,50,0.08) | 0 2px 6px rgba(0,0,0,0.35) |
| shadow-3（シート・ダイアログ） | 0 -2px 8px rgba(30,42,50,0.10), 0 16px 40px rgba(30,42,50,0.18) | 0 -2px 10px rgba(0,0,0,0.45), 0 16px 40px rgba(0,0,0,0.55) |
| shadow-pin | 0 1px 2px rgba(0,0,0,0.35) | 同じ |

### 2-9. 線の太さ
| 太さ | 用途 |
|---|---|
| 1px | 区切り・入力欄・カード |
| 1.5px | 選択中の切り替え・写真を足すマスの破線 |
| 2px | フォーカス（外側に2px空ける）・エラー |
| 3px | アップロードの進み具合 |

### 2-10. 画面幅の区切り（ブレークポイント）
| 名前 | 幅 | 組み方 |
|---|---|---|
| base | 768px未満 | 1カラム。下にタブバー（56pxと safe-area）。道一覧は「リスト｜地図」の切り替えで、地図は画面いっぱいに出す |
| md | 768px以上 | 道一覧は、リスト2fr（最小320px）と地図3fr（画面に固定）。道詳細は2カラム（左7fr: 見出し・林道の注意・評価のまとめ・走行記録 / 右5fr: 道の情報・地図・写真。スクロールで付いてくる） |
| lg | 1024px以上 | 下のタブの代わりに左のサイドナビ（240px）を置く |
| xl | 1280px以上 | 本文の最大幅は1200pxで、中央に寄せる |

### 2-11. 動き
| トークン | 値 | 用途 |
|---|---|---|
| duration-instant | 80ms | 押した瞬間 |
| duration-fast | 140ms | ホバー・選択 |
| duration-base | 200ms | トースト・ダイアログ |
| duration-sheet | 280ms | シート |
| duration-slow | 320ms | 表札・進み具合のバー |
| duration-draw | 900ms | コレクションの等高線を描く動き（初回だけ） |

- 動きの速さの変化（イージング）:
  - ease-standard = cubic-bezier(0.2,0,0,1)
  - ease-exit = cubic-bezier(0.4,0,1,1)
  - ease-ink = cubic-bezier(0.65,0,0.35,1)
- **見せ場は1つだけ**: コレクション画面の見出しの等高線を、900msかけて一度だけ描く。
- カードなどが次々に現れる動きは使わない。
- `prefers-reduced-motion: reduce` のときは、すべての時間を0.01msにする。等高線は最初から描いた状態で表示し、シートは透明度の変化（fade）だけにする。

---

## 3. 飾りと空間

### 3-1. 等高線を使ってよい所
| 場所 | 使えるか | 指示 |
|---|---|---|
| 道詳細の見出し（表札） | 使える（主役） | 高さ160px（md以上は200px）。右側60%に置き、文字の後ろには通さない（mask） |
| コレクション画面の見出し | 使える | 全種別を重ねた等高線。初回だけ描く |
| 空状態・ログイン画面 | 使える | 薄く |
| 共通のバー・フォーム・一覧・カード・道の情報・写真・ダイアログ・地図の上 | **使えない** | 情報の多い所と入力の所には飾りを入れない |

- 線の仕様:
  - 普通の線は1px、計曲線は1.75px。
  - 色は accent で、不透明度はライト0.22、ダーク0.20。
  - 塗りもぼかしも使わない。
- ファイル: 静的なSVGを `public/patterns/contour-{pass|skyline|coast|forest|other|overview}.svg` に置く。1つ4KB以下（overviewは8KB以下）。`aria-hidden="true"` を付ける。
- 紙のノイズ画像は使わない。

### 3-2. 空状態のイラスト
- 大きさは160×120px（SVG、6KB以下）。
- 図柄は、ゆるやかな等高線（accent、不透明度0.3）の間を、1本の道（ink、1.5px）が通り抜けるもの。
- 人・車・バイク・矢印は描かない。
- 写真0枚・記録0件など、画面の中の小さな空状態では、イラストを使わず、文字とボタンだけにする。

---

## 4. 部品ごとの見た目

**共通**:
- キーボード操作の枠: `:focus-visible` のときだけ、2pxの focus 色を、2px離して付ける。
- ホバー: `@media (hover: hover)` の中だけで指定する。
- 日付・数字は num の書体にする。

### 4-1. ボタン
| 大きさ | 高さ | 左右の余白 | 文字 |
|---|---|---|---|
| md | 48px | 20px | 16px / 700 |
| sm | 40px（タップ範囲は44px） | 14px | 14px / 700 |

| 種類 | 通常 | ホバー | 押した瞬間 |
|---|---|---|---|
| primary | primary の地に on-primary の文字 | primary-hover | primary-active |
| secondary | surface-raised の地、1px line-strong、ink の文字 | surface-sunken | — |
| ghost | 地なし、primary の文字 | primary-subtle | — |
| danger | danger の地に on-danger の文字 | danger-hover | — |

- **押せない状態**:
  - surface の地、1px line、ink-subtle の文字（約4.9:1）で表す。透明度を下げるだけの表現は使わない。
  - `aria-disabled` と `cursor-not-allowed` を付け、押せない理由を近くに文字で書く。
  - WCAG 1.4.3 は押せない部品を基準の対象外にしているが、このアプリでは読めることを優先する。
- 保存中は「保存中…」と表示し、`aria-busy="true"` を付ける。幅は変えない。
- ボタンの文字は、すること（「道を登録」「記録を保存」「削除する」）にする。末尾に「→」を付けない。

### 4-2. 評価の入力（1〜5、縮尺バー形式）
- 星は使わない。地図の縮尺バーに見立てて、5つのマスを横に並べる（各44×44px、間は6px。幅360pxでも244pxなので収まる）。
- `role="radiogroup"` にし、各マスは `role="radio"` で、読み上げ名は「4、良い」の形にする。矢印キーで選び直せる（roving tabindex）。
- 両端に言葉を置く（13px、ink-muted）。下に「選択中: 4（良い）」（14px、ink、`aria-live="polite"`）を出す。

| 状態 | 見た目 |
|---|---|
| 未選択 | surface-raised の地、1px line-strong、数字は ink-muted |
| 値Nを選択 | 1〜Nは primary の地に on-primary の数字。Nのマスの下に、3pxの ink の目印を付ける |
| ホバー | 指したマスの枠を ink にする |
| エラー（総合が未選択） | 未選択のマスの枠を2pxの danger にし、下に「総合評価を選んでください」（danger、先頭に「!」） |

- 任意の項目には、右上に「選択を解除」（ghost sm）を置く。
- 各値の言葉:
  - 総合・景観: いまひとつ / やや物足りない / ふつう / 良い / とても良い
  - 路面状態: 荒れている / やや荒れ / ふつう / 良好 / とても良好
  - 走りやすさ: 走りにくい / やや走りにくい / ふつう / 走りやすい / とても走りやすい
- **表示だけの場合（RatingMeter）**:
  - マスの大きさ: カードでは12×6px・間2px、詳細では20×8px・間3px。角は radius-xs。
  - 塗ったマスは primary、空のマスは1px line-strong の枠だけ。
  - 塗るマスの数は、**小数1桁に丸めた表示値を、さらに四捨五入した数**（0.5は切り上げ）。例: 4.3なら4マス、4.5なら5マス、2.5なら3マス。生の平均からは計算しない（表示「4.5」なのに4マス、というずれを防ぐため）。
  - 1件の記録の評価（整数）は、その値の数だけ塗る。
  - `role="img"` を付け、読み上げ名は「総合評価 平均4.3」とする。数字は必ず横に表示する。

### 4-3. 交通量の切り替え（少 / 普通 / 多。良い悪いを付けない）
- ラジオグループ（SegmentedControl）にする。
  - 溝: surface-sunken の地、余白2px、radius-sm。
  - 各選択肢: 高さ44px、3等分、最大幅320px。
- 記号は、混み具合を丸の数で表す（少=1つ、普通=2つ、多=3つ。直径6px、ink-muted）。
- 未選択: 地なし、ink-muted の文字。
- 選択中: surface-raised の地、1.5px ink の枠、ink 700、shadow-2。**3つとも同じ見た目にする。**
- 切り替えの動きは duration-fast と ease-standard。
- 「選択を解除」と補足「その日の状況の記録です」を付ける。

### 4-4. 道のカード（RoadCard）
- 全体: surface-raised の地、1px line、radius-md、shadow-1、余白16px。カード全体が1つのリンク。
- 状態:
  - ホバー: 枠を line-strong にする**だけ**（浮き上がりも拡大もしない）。
  - 押した瞬間: surface-sunken。
  - フォーカス: カード全体に focus の枠。
- 中身（上から順）:
  1. 左に種別の記号の箱（40×40、radius-sm、バッジ地に種別色の記号24px）。右に道の名前（mincho 18 / 600、ink、2行まで）。右端に「›」（ink-subtle）。
  2. 都道府県（14px、ink-muted）。
  3. 種別バッジ ＋「最終 YYYY-MM-DD」（13px、ink-muted、num）。林道なら小さな「注意」タグ（warning-subtle の地、warning の文字、radius-full、高さ20px）を付けてよい。
  4. 「記録 N件」（13px、ink-muted）と、右寄せの評価メーター（sm）＋平均値（num、14px / 700、ink、小数1桁。例 4.3）。
- 記録が0件のとき: 4行目は「走行記録なし」（14px、ink-subtle）だけにする。空のメーターは出さない。
- 読み上げ: 「総合評価 平均4.3、記録12件」。
- 距離や市区町村の欄は置かない。

### 4-5. 種別バッジ（TypeBadge）
- 高さ24px、左右の余白8pxと10px、radius-full、地は種別のバッジ地、枠なし。
- 中身: 記号（14px、種別の色）、4px空けて、種別名（13px / 700、**ink**）。
- 種別名は「峠 / スカイライン / 海岸線 / 林道 / その他」。

### 4-6. 道の情報（通行ルール・施設）

**表示カード（RoadInfoCard）**
- 器: surface-sunken の地（手書きのメモ欄に見立てる）、1px line、radius-md、余白16px、影なし。**この地の上では ink-subtle を使わない。**
- 見出しの行: 「道の情報」（sans 700、16px、ink）。右端に「ユーザー記録」ラベル（高さ22px、radius-full、1px ink-muted の枠、13px、ink-muted、先頭にペンの記号）。
- 注記（M-06）: 見出しのすぐ下に常に表示する（14px、ink-muted、行の高さ1.6）。
- グループの見出し「通行ルール」「施設」: 13px / 700、ink-muted。後ろに細い線を引く。
- 項目の行（InfoItemRow）:
  - 項目名（14px、ink-muted）、値（14px / 700、ink）、確認日（「確認 YYYY-MM-DD」、num、13px、ink-muted、右寄せ）を並べる。
  - 行の高さは44px以上で、行の間は1px line で区切る。
  - メモは**項目ごと**に付ける。短ければ値の後ろに括弧で続ける（例: 「あり（22時〜6時）」）。長ければ2行目に回す（14px、ink-muted）。
  - 有料は「有料 / 無料 / 不明」で表示する。どの値にも警告色を使わない（「あり」は事実として示し、怖がらせない）。
- 未記録: 値の場所に、点線の丸の記号（12px、1px dashed line-strong）と「未記録」（14px、ink-muted）を出す。確認日は空にする。
- 古い項目の印（StaleDateTag。項目ごとに判定）:
  - 確認日から366日以上たった項目だけに、確認日の横（狭いときは下）に出す。
  - 見た目: warning-subtle の地、warning の文字、radius-full、高さ24px、左右の余白8px、13px、時計の記号。
  - 文字は「確認から1年以上たっています」。続けて、読み上げ用の見えない文字（sr-only）で「最新の情報ではない可能性があります。」を足す。
- カードの下: 「道の情報を更新」（secondary sm）と、「履歴を見る」（ghost sm、高さ32px、タップ範囲は縦44px。記録が1件以上あるときだけ）。

**入力画面（RoadInfoForm）**
- いちばん上に、共通の確認日を1つ置く（DateField。既定は今日、num）。補足に「記録しない以外を選んだ項目に、この日付が付きます。」（13px、ink-muted）。
- 項目ごとの行（ItemInputRow。行の間は20px）:
  1. ラベル（14px / 700、ink）
  2. SegmentedControl（4択。4-3と同じ見た目で、選択肢は「あり / なし / 不明 / 記録しない」。有料の行は「有料 / 無料 / 不明 / 記録しない」）。最初は「記録しない」で、そのときは行全体を ink-muted で控えめに見せる。
  3. 「記録しない」以外を選んだときだけ、メモ欄を出す（上に8px空ける）。
     - surface-raised の地、1px line-strong、radius-sm、高さ44px、200文字まで。
     - 右下に「n/200」（num、13px、ink-muted）。
     - 表示の切り替えに動きは付けない。
- 幅360pxで4つの選択肢が入らないときは、文字を13pxに下げる（2段に折り返さない）。
- 注記（M-06）をフォームの最後に置き、保存ボタン（primary md、下に固定）を置く。

### 4-7. 安全バナーと林道の注意
**SafetyBanner（走行記録フォームの上部。閉じられない）**
- 落ち着いた「お知らせ」として出す。warning や danger の色は使わない。
- 見た目: info-subtle の地、1pxの枠（info、不透明度0.35）、radius-sm、余白12pxと16px。
- 左に「P」の角丸四角（20px四方、radius-xs、1.5pxの info の枠、info の文字700、13px。停車・駐車を連想させる。`aria-hidden`）。
- 見出し「運転中は操作しないでください」（15px / 700、ink）。本文「記録は安全な場所に停車してから、またはドライブの後に行ってください。」（14px、ink、行の高さ1.6）。
- `role="note"` にする。画面の上部に固定せず、流れの中に置く。

**ForestRoadNote（林道の注意）**
- 置き場所: SafetyBanner のすぐ下（間8px）、道の登録フォームで林道を選んだ直後、道詳細の見出しの下。
- 見た目: warning-subtle の地、radius-sm、余白12pxと16px、枠なし。
- 先頭に林道の記号（20px）と「注意」の文字ラベル（14px / 700、warning。地との比は5.7:1）。
- 本文（14px、ink）: 「林道は、舗装されていない区間や道幅の狭い区間があったり、一般車両の通行止めや季節による閉鎖が行われていたりする場合があります。お出かけ前に道路管理者の情報を確認し、通行止めの道には入らないでください。」
- 閉じるボタンは付けない。

**FirstRunNotice（初回の安全上の注意）**
- 768px未満: 下から出るシート。surface-raised の地、上の角だけ radius-lg、shadow-3。**引っぱるためのつまみは付けない。**
- 768px以上: 中央のダイアログ（最大幅480px、radius-lg、shadow-3）。後ろは scrim。
- 閉じ方: 背景を押しても、Escでも閉じない。×ボタンもない。
- 中身:
  - 見出し「はじめに」（sans 700、18px）
  - 本文（M-04とM-05、16px、ink、行の高さ1.7）
  - 主ボタン「確認しました」（primary md、横幅いっぱい、高さ48px）
- 動き:
  - シートは duration-sheet と ease-standard で、下から出す。
  - ダイアログは duration-base で、ふわっと出す。
  - 動きを減らす設定のときは、表示を切り替えるだけにする。
- `role="dialog"` と `aria-modal="true"` を付け、フォーカスを中に閉じ込める。最初のフォーカスは見出しに置く。

### 4-8. 地図のピン（Leaflet の divIcon）
| 種類 | 形 | 中身 |
|---|---|---|
| 開始ピン | しずく形32×40（先端が地点）。種別の色で塗り、2px の pin-ring、外側に1px の pin-outline、shadow-pin | 白い種別の記号16px |
| 終了ピン | 円形24×24。白い地に3pxの種別色の枠 | 「終」（11px / 700、ink） |
| 選択中 | 開始ピンを40×50に大きくし、3px の pin-selected の縁を付ける | 上に名前の吹き出し（surface-raised、radius-sm、shadow-2、14px） |
| まとめピン（クラスター） | 円形。36px（10件未満）/ 44px（50件未満）/ 52px（それ以上）。cluster の地に2px ink の枠 | 件数（num 14px / 700） |

- 開始ピンと終了ピンを線でつながない。タップ範囲は44pxにする。
- ピンを選ぶと、リストの同じカードにも印（左に2pxの primary の内側の枠）を付ける。

### 4-9. 写真のサムネイルとアップロード
- 並べ方: 3列（md以上は5列）、間4px、正方形、object-fit: cover、角は4px。
- 写真を足すマス: 1.5pxの破線（line-strong）、surface の地、「＋ 写真を追加」と「2/5」。5枚になったらマスを消し、「1記録につき写真は5枚までです」と出す。

| 状態 | 見た目 |
|---|---|
| アップロード中 | surface を不透明度0.4で重ね、下に3pxの進み具合のバー（primary）。読み上げは「アップロード中」 |
| 失敗 | 2pxの danger の枠、danger-subtle を重ね、中央に「!」と「失敗」。下に「写真のアップロードに失敗しました。通信状態を確認して再試行してください。」（13px、danger、`role="alert"`。何枚も同時に失敗したら、まとめて1回だけ読み上げる）と、「再試行」「この写真を外す」（secondary sm、44px）。入力済みの本文は残す |
| 完了 | 重ねた部分を200msで消す |
| 外すボタン | 右上に28pxの丸（inverse の不透明度0.75、「×」は on-inverse。タップ範囲は44px）。読み上げ名は「この写真を外す」 |

### 4-10. コレクション画面
- 見出し: 「走った道のコレクション」（mincho 600、24px。md以上は30px）。背景に contour-overview.svg を敷き、初回だけ900msで描く（このアプリで唯一の見せ場）。
- 合計（中央寄せ）: 「走った道」（14px、ink-muted）、数字（mincho 40px、md以上は56px、ink）、「本」（18px、ink-muted）。
- 種別タイル:
  - 並べ方: 2列（md以上は5列）、間8px。
  - 見た目: surface-raised の地、1px line、radius-md、余白16px。
  - 中身: 種別の記号の箱（32px）、種別名（14px / 700）、本数（mincho 40px と「本」）。0本の数字は ink-subtle で、隠さない。
- 都道府県の進み具合:
  - 「走った都道府県」（14px、ink-muted）と「8/47」（num 700、21px。「/47」は ink-muted）。
  - その下に ProgressBar（高さ8px、radius-full、溝は surface-sunken、中身は primary）。
  - `role="progressbar"` を付け、読み上げ名は「走った都道府県 47のうち8」。
- 都道府県の一覧（PrefectureList）:
  - 地方ごとに `<h3>`（13px / 700、ink-muted、後ろに細い線、右端に「2 / 7」）と `<ul>` で組む。
  - 行（PrefectureRow）:
    - 高さ40px、1px line の区切り。768px未満は1列、768px以上は2列、1024px以上は3列。
    - 走った県: CollectionCheck（primary で塗った丸に on-primary のチェック）、県名（ink 700）、「走った N本」。
    - まだの県: CollectionCheck（1px line-strong の空の丸）、県名（ink-muted）、「— まだ」。
    - 記号と文字の両方で伝える。
  - **行はリンクにしない**（ホバーの色の変化・矢印・指の形のカーソルを付けない）。
- 一覧が次々に現れる動きは付けない。
- 将来: 都道府県を正方形のマスで並べた日本タイル地図を、一覧の上に置く案がある（MVPには入れない。入れるときも、一覧は残す）。

### 4-11. トースト
- 位置: 下のタブの12px上、左右16px。
- 見た目: inverse の地、on-inverse の文字14px、radius-sm、shadow-2。
- 成功: 「記録を保存しました」など。4秒で消す。`role="status"`。
- 失敗: 何が起きたかと直し方を書き、「再試行」を付ける。自動では消さない。`role="alert"`。
- 動き: 下から8pxと fade、duration-base。

### 4-12. ボトムシートと削除の確認
**ボトムシート**:
- surface-raised の地、上の角は radius-lg、shadow-3、最大の高さは85vh、後ろは scrim。
- 開くときは duration-sheet と ease-standard、閉じるときは duration-base と ease-exit。

**削除の確認（DeleteConfirmDialog）**:
- 器: 768px未満はシート、768px以上は中央のダイアログ（最大480px）。radius-lg、shadow-3。
- 見出し: 「この道を削除しますか？」「この走行記録を削除しますか？」（sans 700、18px。機能のための画面なので明朝にしない）。
- 本文:
  - 道: 「この道を削除すると、走行記録○件・写真○枚・道の情報○件も削除されます。元に戻せません。」
  - 記録: 「この走行記録と写真○枚を削除します。元に戻せません。」
  - 件数は0件でも省略しない。
- 「元に戻せません。」は、△の記号と一緒に danger の色の700で強調する。
- ボタン: 横に並べ、間12px、高さ44px。左が「キャンセル」（secondary）、右が「削除する」（danger）。768px未満では縦に積み、上を「削除する」にする。
- 最初のフォーカスは「キャンセル」に置く。Esc・背景を押す・キャンセルのどれでも閉じる。`role="alertdialog"`。

### 4-13. 入力欄
- 高さ48px、surface-raised の地、1px line-strong、radius-sm、文字16px（iOSが自動で拡大しないようにするため）。
- ラベル: 14px / 700、ink、欄の6px上に置く。必須の欄には「必須」と文字で書く。
- フォーカス: 2px の primary の枠と focus の枠。
- エラー: 2px の danger の枠と、下に danger の14pxの文字（先頭に「!」）。

### 4-14. ナビゲーション
**BottomTabBar（1024px未満）**:
- 高さ56pxと safe-area、surface の地、上に1px line。
- 項目: 「道 / コレクション / 設定」。アイコンと文字（13px）。
- 選択中: アイコンの塗り、ink 700、`aria-current="page"`。

**SideNav（1024px以上）**:
- 幅240px、surface の地、右に1px line。上部にアプリ名を置く。
- 項目: 高さ44px、radius-md。
- 選択中: surface-raised の地、ink 700、左に3pxの primary の縦線、`aria-current="page"`。
- ホバー: surface-raised。
- `<nav aria-label="メインメニュー">` で囲む。

---

## 5. 実装への指示

### 5-1. 書き込むファイル
- `apps/road-review/src/app/globals.css`（Tailwind v4 の @theme）
- `apps/road-review/src/app/layout.tsx`（next/font と、テーマを決める先読みスクリプト）
- `apps/road-review/public/patterns/*.svg`
- `apps/road-review/src/components/atoms/RoadTypeGlyph/`

### 5-2. @theme の要点
- ライトのトークンを `:root` に、ダークのトークンを `.dark` に、CSS変数 `--rr-*` として定義する（値は2-1の表）。
- それを `@theme inline` で `--color-canvas: var(--rr-canvas)` のように対応させる。
- `--color-*: initial` で Tailwind の標準色を消し、トークン以外の色を使えないようにする（white と transparent だけは残す）。
- `@custom-variant dark (&:where(.dark, .dark *));` を書く。
- `@theme` に次のトークンを登録する: spacing（4px）、text-xs〜5xl（行の高さつき）、radius-xs〜lg、shadow-1〜3、ease-standard / exit / ink、breakpoint（md 768 / lg 1024 / xl 1280）。
- ダークの影は、`.dark` の中で上書きする。
- 共通クラスを2つ用意する: `.heading-mincho`（palt と字間0.04em）、`.num`（num の書体と tabular-nums）。
- `prefers-reduced-motion: reduce` で、アニメーションと切り替えの時間を0.01msにする。

### 5-3. ダークモード
- 設定は「端末に合わせる（既定）/ ライト / ダーク」の3つで、localStorage に保存する。
- 画面を描く前に、head の中の小さなスクリプトで html 要素に `dark` クラスを付けるか決める（`matchMedia` と `change` イベントで、端末の設定についていく）。
- html 要素に `suppressHydrationWarning` を付ける。
- 部品の中では、`dark:` の指定をほぼ使わない。

### 5-4. next/font
| 書体 | weight | subsets | display | variable | preload |
|---|---|---|---|---|---|
| BIZ_UDPGothic | 400, 700 | latin | swap | --font-biz | true |
| Shippori_Mincho_B1 | 600 | latin | swap | --font-shippori | false |
| BIZ_UDGothic | 400, 700 | latin | swap | --font-bizud | false |

本番のビルドの後に、Lighthouse（4G・スマホ）でLCPを測る。

### 5-5. Atomic Design への割り当て
依存の向きは、atoms ← molecules ← organisms ← templates の一方向だけ。

| 階層 | 部品 |
|---|---|
| atoms | Button、RoadTypeGlyph、TypeBadge、RatingCell、RatingMeter（表示だけ）、ProgressBar、StaleDateTag、CautionTag、CollectionCheck、UserRecordLabel、SegmentOption、DateText、Thumbnail、MapPinIcon、ContourPattern、NavItem |
| molecules | RatingInput、SegmentedControl、InfoItemRow、ItemInputRow、DateField、RatingSummary、SafetyBanner、ForestRoadNote、RoadCard の中身の部品、PhotoTile、TypeTile、PrefectureRow、StatTotal、Toast、EmptyState |
| organisms | RoadCard、RoadList、RoadMap、RoadDetailHeader（等高線の表札）、RoadInfoCard、RoadInfoForm、RoadInfoHistorySheet、DriveRecordForm、DriveRecordList、PhotoUploader、CollectionHeader、CollectionTotals、PrefectureProgress（バーと地方ごとの一覧）、FirstRunNotice、DeleteConfirmDialog、BottomSheet、AppHeader、BottomTabBar、SideNav |
| templates | AppShellTemplate（1024px未満はタブ、1024px以上はサイドナビ）、ListMapTemplate、RoadDetailTemplate（md以上は7fr / 5fr）、CollectionTemplate、FormTemplate（最大640px） |

- 種別ごとの対応表（種別 → 記号・色・バッジ地・等高線のSVG）は、1か所の定数にまとめる。
- FirstRunNotice と DeleteConfirmDialog は、同じ「画面幅でシートとダイアログを切り替える器」を共有する。

### 5-6. 注意点
- 種別の色を、文字の色に使わない。
- ink-subtle の使い方: ライトでは surface-sunken の上に置かない。ダークでは surface-raised の上に置かない。
- 状態は色だけで伝えない（形・記号・言葉を必ず付ける）。
- 実装した後に、色覚シミュレーションとコントラストの計測を行う（Playwright か chrome-devtools）。

---

## 6. 地図の見た目

### 6-1. タイル
- **淡色地図（pale）を使う**: `https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png`、ズームは5〜18。色が淡く紙の地色になじみ、ピンの種別の色が目立つ。
- 標準地図（色が多い）と白地図（ズームが足りない）は使わない。
- `.leaflet-container` の背景を canvas にする。

### 6-2. 出典の表示（必須）
- 「地理院タイル」と書き、地理院タイル一覧ページ（https://maps.gsi.go.jp/development/ichiran.html ）へリンクする。
- 見た目: 右下に置き、12px、ink、地は surface の不透明度0.85、左上の角だけ radius-xs、focus の枠付き。
- 下のタブ・シート・ボタンで隠さない。

### 6-3. ダークモードの地図
- **タイルは色を反転せず、紙のまま明るさだけ落とす。**
  - `.leaflet-tile-pane` にだけ `filter: brightness(0.82) saturate(0.85)` をかける。
  - ピン・吹き出し・出典にはかけない。
  - ピンは、ダークでもライト用の種別の色を使う。
- 色を反転させる方法は採らない（地図の色の意味が崩れ、地名が読みにくくなるため）。暗い色の公式タイルは、地理院タイルには見当たらなかった。

### 6-4. 地図の部品
- 拡大・縮小のボタン: 40×40（タップ範囲は44px）、surface-raised の地、1px line-strong、radius-sm。
- 地図の高さ: スマホの地図表示では画面いっぱい。登録フォームの小さな地図は確認用として高さ160px にする。ピンのピッカーは全画面。
- 現在地のボタンは置かない。

## 参考にした資料
- 地理院タイル一覧: https://maps.gsi.go.jp/development/ichiran.html
- BIZ UDPGothic / BIZ UDGothic: https://fontsource.org/fonts/biz-udpgothic/about 、 https://fontsource.org/fonts/biz-udgothic/about

