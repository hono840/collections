# 公道レビュー（road-review）アーキテクチャ設計書 v3 — 検索が主役の版

- ステータス: 設計案 v3.0（code-architect 作成 → CTO レビュー待ち → CEO 承認待ち）
- 作成日: 2026-10-10
- **この文書が置き換えるもの**: `road-review-architecture-v2.md`（以下「ARCH v2」）の **0章（要点）・1章（全体像）・4章（ルーティング）・5.1（保存するレコード）・6.1〜6.2（IndexedDB の構成とインターフェース）・7.2 の formKey・7.3 の「つかったきろく」・8.1〜8.2（書き出しの形と読み込みの検査）・10章のうち追加分・12.3（ファイル構成）・15章（実装の順番）**
- **この文書が置き換えないもの（ARCH v2 をそのまま使う）**: 2.1〜2.2（変えない依存・削除する依存）、2.3 の `fake-indexeddb@6.2.5` と `@axe-core/playwright`（devDependency の2つ）、**3章（静的書き出し＋ヘッダー CSP＋ビルド後のハッシュ meta CSP）**、4.2（ページの組み立て方: `page.tsx` は静的な枠、`PageClient.tsx` で `useSearchParams` を `<Suspense>` で包む・ブラウザの API は `useEffect` の中だけ）、5.2〜5.4（版の数え方・移行の仕組み・読むたびの zod 検査）、6.3（React からの使い方）、7.1・7.2（下書きの方式）・7.4、9章（persist・書き出しのお知らせ）、10.1〜10.2 の方針（層の分け方・`out/` を静的サーバーで配る E2E・外への通信を止める fixture・CSP 違反0件）、11章のリスク R1〜R11、12.1〜12.2（削除・残す）、12.4（Atomic Design と ESLint の `noData`）、13章（データ移行なし）、14章（CI ワークフロー案）
- **ADR（`road-review-adr-static-export.md`）の結果はそのまま使う**（10章の段階0は済み）。ADR 8章の「ARCH に反映」の4点（meta CSP は `<meta charSet>` の直後／`vercel.json` の `trailingSlash: true`／ローカルでは `upgrade-insecure-requests` を外す／`build` の中に `&&` でつなぐ）も、この版の前提に入れる。
- 文書の優先順位: CEO決定 ＞ PRD v3 ＞ DS v3 ＞ この ARCH v3 ＞ v2 の各文書
- 表記: 【事実】ファイル・一次資料で確かめた／【推論】根拠から考えた／【要検証】実装の段階で確かめる（確かめ方を書く）

用語メモ:
- **道のリスト（カタログ）**（人が確かめた道 約100本の一覧。アプリと一緒に配る）
- **取り出し（extract）**（開発者のパソコンで手で回し、Overpass から道の線のデータを取ってくるスクリプト）
- **生成（generate）**（ビルドのときに、承認済みのリストと道の形のファイルから、アプリが読む索引と配布用のファイルを作るスクリプト。通信しない）
- **ダグラス・ポーカー法**（線の形を保ったまま、許す誤差より小さいでこぼこの点を間引く方法）
- **正規化（そろえ方）**（検索の前に、ひらがな/カタカナ・全角/半角などの違いをなくして、同じ形の文字にすること）
- **道の鍵（roadKey）**（道を指す文字列。リストの道は `yabitsu-toge` のような変えない名前、自分で追加した道は `own-` ＋ UUID）

---

## 0. 要点（先に結論）

1. **作りの芯は v2 のまま**: 静的書き出し（`output: 'export'`）・ヘッダー CSP ＋ ビルド後のハッシュ meta CSP・Vercel は `framework: null` で `out/` を配るだけ・データは IndexedDB と localStorage・ログインなし。ADR で Vercel の上でも効くと確かめ済み。
2. **道のリストは「承認済みのファイル」だけからビルドする。** `data/road-catalog-draft.json`（AI の案）→ Hiro の確認 → `data/road-catalog.json`（承認済み）。CI が形・ID・禁止語・道の形のファイルの有無を検査する（3章）。
3. **Overpass への問い合わせはビルドでは一切しない。** 開発者が手で回す取り出しスクリプトが、1本ずつ・5秒以上あけて・キャッシュつき・個人情報を含まない名乗りで問い合わせ、つなぎ合わせと点の間引き（ダグラス・ポーカー法・15m）をした結果 `data/geometry/{id}.json` をリポジトリに入れる。ビルドはそれを読むだけ（4章）。
4. **検索は手書き。新しい実行時の依存は0。** 索引（約100本の名前・読み・別名・都道府県・注意）は JSON にしてアプリの JS に入れ、正規化（NFKC → 小文字 → カタカナをひらがなへ → ヶ/ケ/ヵをそろえる → 記号と長音を消す）とローマ字（ヘボン式と訓令式の両方の鍵）で端末の中だけで探す（5章）。
5. **打った言葉は URL の `#` の後ろに置く。** `?` の後ろに置くと、再読み込みや画面の切り替えでサーバーに送られるため（6章）。検索の画面の切り替えは `history.pushState` / `replaceState` で行い、Next の `router.push` に打った言葉を渡さない。
6. **道の形は道ごとの静的ファイル**（`/data/catalog/roads/{id}.json`、数KB）を、道の詳細を開いたときにだけ取る。`connect-src 'self'` のままで足りる（CSP は変えない）。
7. **なぞる動きは Leaflet の SVG の線に Web Animations API**（`element.animate`）で `stroke-dashoffset` を動かす。動きを減らす設定では最初から全部描く（7章）。
8. **端末のデータは3種類**: お気に入り（`favorites`）・自分で追加した道（`customRoads`）・走行記録（`drives`。`roadKey` で道を指す）。形の版は **1 から始める**（v2 の形は一度も公開していない）（8章）。
9. **ODbL**: 地図の隅に「© OpenStreetMap」と「地理院タイル」。道のデータ一式（`road-catalog-odbl.json`）と LICENSE・README を `public/data/catalog/` に置き、「データ」画面からダウンロードできるようにする（3.6）。

---

## 1. 全体像

```
（開発者のパソコン。手で回す。季節に1回）
  data/road-catalog-draft.json ──Hiro が確認──► data/road-catalog.json（承認済み）
          │                                            │
          └──► scripts/catalog/extract-osm.mjs ◄───────┘
                 │ 1本ずつ・5秒以上あける・キャッシュ data/.osm-cache/（git に入れない）
                 ▼  Overpass API（読み取りだけ）
               つなぐ・切り出す・点を減らす（15m）
                 ▼
               data/geometry/{id}.json（git に入れる）＋ 差分の報告（Hiro が見る）

（ビルド。Vercel と CI。通信しない）
  pnpm build = node scripts/catalog/generate.mjs --check
             && next build && inject-meta-csp && verify-out
                 │ generate は承認済みのリスト＋geometry から作る（作った物は git に入れてあり、--check で食い違いを止める）
                 ├─► src/generated/catalog-index.json   （検索の索引。JS に入る）
                 └─► public/data/catalog/roads/{id}.json（道の形。詳細で取る）
                     public/data/catalog/road-catalog-odbl.json・LICENSE-ODbL.txt・README.txt

（利用者のブラウザ）
  検索: catalog-index（JS の中）＋ 自分で追加した道（IndexedDB）→ 端末の中で探す。通信なし
  詳細: fetch('/data/catalog/roads/{id}.json')（自分のドメイン）＋ 地理院タイル（画像）
  記録: IndexedDB（favorites / customRoads / drives）＋ localStorage（下書き・設定・回数）
```

外へ出る通信は v2 と同じく「地理院タイルの画像」だけ。OSM・Overpass とは、利用者のブラウザは一度も通信しない。

---

## 2. 依存

- **実行時（dependencies）の追加: 0。** 検索・正規化・ローマ字・点の間引き・つなぎ合わせ・アニメーションは、すべて手書き。
- **開発用（devDependencies）の追加**: ARCH v2 2.3 の2つ（`fake-indexeddb@6.2.5`・`@axe-core/playwright`）だけ。v3 で増やさない。
- 取り出しスクリプトは Node の組み込みの `fetch`・`crypto`・`fs` だけで書く。`osmtogeojson`・`@turf/*`・`fuse.js`・`wanakana` などは入れない（データ調査 4.4。依存を足すと supply-chain-auditor の監査が要り、危険も増える）。
- 生成スクリプト（`.mjs`）は、zod（すでに dependencies にある）を使ってよい。TypeScript のファイルは読み込まない（Node の型の取り除きに頼らない）。リストの形の正（zod のスキーマ）は `src/lib/catalog/schema.ts` に置き、**検査は Vitest のテスト**（`catalog.data.test.ts`）で行う（3.4）。生成スクリプトは「形の検査に通った前提」で、ID の重複・ファイルの有無などの最低限だけを確かめる。

---

## 3. 道のリスト（カタログ）

### 3.1 ファイルの置き場所

| ファイル | 中身 | git | 誰が書く |
|---|---|---|---|
| `data/road-catalog-draft.json` | AI が作った案（`status: "draft"`）。出典つき | 入れる | AI（Hiro の指示で） |
| `data/road-catalog.json` | **承認済み**（`approved`）と**引退**（`retired`）だけ。ビルドの元 | 入れる | Hiro が承認した後、AI か Hiro が移す |
| `data/catalog-ids.txt` | これまでに出した道の ID の一覧（1行1つ・**足すだけ**） | 入れる | 承認のときに足す |
| `data/geometry/{id}.json` | 取り出しの結果（つないで・切り出して・点を減らした道の形） | 入れる | 取り出しスクリプト |
| `data/.osm-cache/` | Overpass の生の応答・差分の報告 | **入れない**（`.gitignore`） | 取り出しスクリプト |
| `src/generated/catalog-index.json` | 検索と詳細に使う索引 | 入れる（生成物） | 生成スクリプト |
| `public/data/catalog/**` | 道の形のファイル・ODbL の一式 | 入れる（生成物） | 生成スクリプト |
| `tests/fixtures/catalog/*` | テスト用の小さなリスト・OSM の応答の見本 | 入れる | test-writer |

- 生成物を git に入れる理由: 開発サーバー・型の検査・Vitest が、生成を先に回さなくても動く。CI では `generate.mjs --check` が「今のファイルと、作り直した結果が同じ」ことを確かめ、違えば止める（作り忘れ・手での書きかえを防ぐ）。
- `data/.osm-cache/` の生の応答は、1本で数十〜数百KB になる（県道70号は way 109本・点 2,269個。データ調査 2.3）。リポジトリを重くしないために入れない。

### 3.2 案から承認へ（CEO決定 2026-10-10 の2）

**ゴール**: 承認していない道が、アプリに入らない。
→ **そのために** 生成スクリプトは `data/road-catalog.json` しか読まない。
→ **さらにそのために** `road-catalog.json` に `status: "draft"` があれば CI が止める。

手順:
1. AI が `road-catalog-draft.json` に案を書く（各道に出典の URL と確認日）。
2. 取り出しスクリプトを案に対して回す（`--from draft`）。道の形と差分の報告ができる。
3. Hiro が案の文字（名前・読み・別名・区間・注意）と、報告の地図の画像（4.6）を見て、OK の道を選ぶ。
4. OK の道を `status: "approved"`・`review.approvedOn` を付けて `road-catalog.json` へ移し、ID を `catalog-ids.txt` に足す。`catalogVersion` を上げる。
5. `pnpm catalog:generate` → PR → CI（3.4）→ main。

### 3.3 リストの形（`src/lib/catalog/schema.ts` が正）

```ts
// src/lib/catalog/schema.ts  (zod; types are z.output)
type CatalogFile = {
  catalogSchemaVersion: 1
  catalogVersion: string            // "2026-10-20.1" (date + sequence)
  roads: CatalogEntry[]
}

type CatalogEntry = {
  id: string                        // /^[a-z0-9]+(-[a-z0-9]+)*$/, 3..60 chars, unique, must NOT start with "own-"
  status: 'draft' | 'approved' | 'retired'
  name: string                      // display name, 1..40, must equal name.normalize('NFKC'), no control/bidi chars
  reading: string                   // hiragana + "ー" only, 1..60
  aliases: Array<{
    name: string                    // 1..60 (official name, route name like "神奈川県道70号", former name, common name)
    reading?: string                // hiragana; required when kind is 'common' or 'former'
    kind: 'official' | 'route' | 'former' | 'common'
  }>                                // max 8
  roadType: 'pass' | 'skyline' | 'coastal' | 'forest' | 'other'
  prefectureCodes: number[]         // 1..3 distinct codes (1..47); first = main prefecture
  rank: number                      // int >= 1; 1 = most famous (curated); used only for ordering
  section?: { from: string; to: string }   // e.g. { from: "戸田峠", to: "土肥峠" }, each 1..30
  elevationM?: number               // passes only, 0..3500 (display depends on CEO Q6)
  representativePoint: { lat: number; lng: number }  // for "open in map app"; Japan bounds, 5 decimals
  restrictionsChecked: boolean      // false -> UI shows "規制の情報は未確認です"
  notes: Array<{
    kind: 'winterClosure' | 'nightClosure' | 'carRestriction' | 'toll'
        | 'motorcycleBan' | 'bicycleBan' | 'other'
    text: string                    // 1..80, plain words, banned-word checked
    sourceUrl: string               // https only
    checkedOn: string               // YYYY-MM-DD, not in the future
  }>                                // max 6
  osm: {                            // extraction recipe (4.2)
    relations?: number[]            // preferred
    ways?: number[]
    nameQuery?: { name: string; bbox: [number, number, number, number] }  // exact name match inside bbox (s,w,n,e)
    cutFrom: { lat: number; lng: number }  // start of the section (also the direction of the trace)
    cutTo: { lat: number; lng: number }
    excludeWays?: number[]
    allowGaps?: boolean             // default false
    expectedLengthKm?: number       // from sources; used only for a sanity check (not shown)
  }
  sources: Array<{ title: string; url: string; checkedOn: string }>  // >= 1, https
  review?: { approvedOn: string; approvedBy: 'ceo' }                  // required when approved/retired
  retired?: { on: string; reason: string }                            // required when retired
}
```

- `osm` には、`relations`・`ways`・`nameQuery` のうち**少なくとも1つ**が要る。西伊豆スカイラインのように通称が OSM にない道は、`nameQuery: { name: "船原西浦高原線", bbox: … }` と `cutFrom`/`cutTo`（戸田峠・土肥峠のあたり）で区間を決める（データ調査 2.2）。
- `cutFrom` は「なぞる動きの始まり」でもある。向きを人が決められるように、承認済みでは必須にする。
- 名前に読みを付けない別名（`official`・`route`）は、漢字の名前の鍵としてだけ使う（例: 「船原西浦高原線」「県道127号」で当たる）。
- `representativePoint` は、道の形の真ん中あたり。取り出しスクリプトが案を出し、人が直してよい。

### 3.4 CI の検査（リストが決まりを満たすか）

`src/lib/catalog/catalog.data.test.ts`（Vitest。CI の verify ジョブで回る）と `generate.mjs --check`（ビルドの最初）で確かめる。1つでも外れたら CI が赤になる。

| # | 検査 | 場所 |
|---|---|---|
| C1 | `road-catalog.json` と `road-catalog-draft.json` が 3.3 の形に合う（zod） | テスト |
| C2 | `road-catalog.json` に `draft` がない。`approved`・`retired` には `review` がある。`retired` には `retired` がある | テスト |
| C3 | ID の形・重複なし・`own-` で始まらない | テスト＋生成 |
| C4 | `catalog-ids.txt` と `road-catalog.json` の ID がちょうど一致する。さらに CI で、main の `catalog-ids.txt` から**消えた行がない**（`git show origin/main:apps/road-review/data/catalog-ids.txt` と比べる。足すだけ） | テスト＋CI の1手順 |
| C5 | 読み（`reading`・別名の `reading`）がひらがなと「ー」だけで、ローマ字に変えられない文字がない（5.3 の表で全部変換できる） | テスト |
| C6 | 正規化した名前と都道府県の組が重ならない（同じ名前の別の道は、都道府県が違えば可。PRD v3 の「あいまいな名前」） | テスト |
| C7 | 承認済み・引退の全部に `data/geometry/{id}.json` があり、形（4.5）に合う: 線は1〜3本・各2点以上・合計 2,000点以下・日本の範囲・`bbox` の中に `representativePoint`（2km の余裕） | テスト＋生成 |
| C8 | 注意の `checkedOn`・出典の `checkedOn` が未来でない。URL は `https://` | テスト |
| C9 | **禁止語**（PRD v2 US-13 の言葉＋PRD v3 US-14 で足した言葉）が、区間・注意・別名・名前以外の文字に1つもない | テスト |
| C10 | 生成物が最新（`generate.mjs --check` が差なし） | 生成 |
| C11 | ODbL の一式（`LICENSE-ODbL.txt`・`README.txt`・`road-catalog-odbl.json` の `license` と `attribution`）がある | テスト |
| C12 | 大きさ: `catalog-index.json` が 80KB 以下、道の形のファイル1つが 30KB 以下 | テスト |

### 3.5 ID を変えない・消さない（引退）

- 走行記録とお気に入りは道の ID で道を指す。ID が変わったり消えたりすると、記録の道が分からなくなる。
- **決まり**: 一度 `catalog-ids.txt` に入れた ID は、名前を変えても ID は変えない。リストから外すときは消さずに `status: "retired"` にする。
- 引退した道: 検索には出さない。詳細は開ける（PRD v3 US-06）。道の形のファイルも配り続ける。
- 書き出しファイルから、今のリストにない ID（新しい版のリストの道など）が来たときは 8.4 の扱い。

### 3.6 ODbL の対応（PRD v3 US-19）

| やること | 中身 | 根拠 |
|---|---|---|
| 地図の隅の表示 | Leaflet の出典表示（`attributionControl`、`prefix: false`）に「© OpenStreetMap」（https://www.openstreetmap.org/copyright）と「地理院タイル」（https://maps.gsi.go.jp/development/ichiran.html）。文字はコードの定数だけ（利用者のデータを入れない） | データ調査 3.2（地図の隅）・6.4 |
| 配布ファイル | `public/data/catalog/road-catalog-odbl.json`: 承認済み・引退の全部の道（ID・名前・読み・別名・種類・都道府県・区間・注意・道の形）と、`license: "ODbL-1.0"`、`attribution: "© OpenStreetMap contributors"`、`osmDataTimestamp`、作り方（「15m の誤差で点を減らした」）。`roads/{id}.json` も同じ決まりのファイル | ODbL 4.6（データ調査 3.1・3.3） |
| LICENSE・README | `public/data/catalog/LICENSE-ODbL.txt`（ODbL 1.0 の表示文と本文の URL https://opendatacommons.org/licenses/odbl/1-0/ ）、`README.txt`（日本語と英語。元が OSM であること・取り出した日・加工の方法・名前や読みや注意は人が確かめて付けたこと） | ODbL 4.3 |
| 「データ」画面 | 表示文（PRD v3 N-33 と英語の原文）・［道のデータをダウンロード（ODbL）］（上の JSON への普通のリンク。`download` 属性つき）・リストの版 | PRD v3 US-19 |
| 分けておくもの | 利用者の記録は別の保存場所（IndexedDB）にあり、配布ファイルに混ぜない | データ調査 3.3 の4 |

### 3.7 更新の手順と報告

1. `pnpm catalog:extract --from approved`（キャッシュが90日より古い道だけ問い合わせる）。
2. 報告（`data/.osm-cache/report-YYYYMMDD.md` と道ごとの小さな SVG の絵）に、道ごとの「点の数・長さ・`bbox` のずれ（200m 以上）・OSM のタグの変化（名前・`toll`・`motorcycle`・`access`）」を出す。`expectedLengthKm` と 15% 以上違う道に印を付ける。
3. 注意の確認日が1年を超えた道の一覧も出す（PRD v3 US-20・7.3）。
4. Hiro が報告を見て OK を出した道の geometry だけを PR に入れる。

---

## 4. データの取り出し（パイプライン）

### 4.1 2つのスクリプトの役目

| スクリプト | いつ | 通信 | 書く物 |
|---|---|---|---|
| `scripts/catalog/extract-osm.mjs` | 開発者が手で（案を作ったとき・季節に1回） | **Overpass にだけ**（読み取り） | `data/geometry/*.json`、`data/.osm-cache/*` |
| `scripts/catalog/generate.mjs` | `pnpm catalog:generate`（手で）と `pnpm build`（`--check`） | **しない** | `src/generated/catalog-index.json`、`public/data/catalog/**` |

`package.json` の scripts（案）:
```
"catalog:extract":  "node scripts/catalog/extract-osm.mjs",
"catalog:generate": "node scripts/catalog/generate.mjs",
"build": "node scripts/catalog/generate.mjs --check && next build && node scripts/csp/inject-meta-csp.mjs out && node scripts/csp/verify-out.mjs out"
```
- `build` の中に `&&` でつなぐ（ADR 3.5: `--ignore-scripts` で `prebuild` / `postbuild` が飛ぶため）。

### 4.2 取り出しスクリプト（Overpass へのお行儀）

**問い合わせの形**（道ごとに1回。`[out:json][timeout:60]`。`out geom` で way の点の ID と座標を両方もらう）:

| リストの指定 | 問い合わせ（Overpass QL） |
|---|---|
| `relations` | `relation(id:12639322); way(r); out geom tags;` |
| `ways` | `way(id:1,2,3); out geom tags;` |
| `nameQuery` | `way["highway"]["name"="船原西浦高原線"](34.85,138.75,35.00,138.90); out geom tags;`（**完全一致だけ**。正規表現は使わない。全国の正規表現の検索は約61秒かかった。データ調査 2.4） |

**お行儀の決まり**（データ調査 5章の Overpass の利用方針に合わせる）:

| 決まり | 値 | 理由 |
|---|---|---|
| 同時に送る数 | **1つずつ**（並べない） | 方針「同時に並べて投げない」 |
| 間隔 | 前の応答の後 **5秒以上** あける | 方針。1回の更新で約100回 → 1日100回未満に収まる |
| 1回の実行の上限 | **120回**（超えそうなら始める前に止める） | 「定期的に使う仕組みは 1日100回未満」に近い量で止める |
| やり直し | 429・504・通信エラーのとき **60秒待って最大2回**。それでもだめなら**実行全体を止める** | 混んでいるサーバーを叩き続けない |
| 名乗り（User-Agent） | `road-review-catalog-builder/1.0 (+{アプリの公開 URL}/data/)` の形の**固定の文字列**。**メールアドレス・人の名前・パソコンのユーザー名・環境変数の値を入れない**。スクリプトは送る前に「`@` を含まない」「定数と一致する」を確かめ、違えば止める | 方針「名乗りを付ける」。2026-10-10 の事故（最初の1回に Hiro のメールアドレスが入った。データ調査の限界5）の再発防止。グローバルルール「外部への通信に個人情報を入れない」 |
| キャッシュ | 問い合わせ文の SHA-256 をキーに `data/.osm-cache/{id}/{hash}.json`（応答と `fetchedAt`・問い合わせ文・`osm3s.timestamp_osm_base`）。**90日以内のキャッシュがあれば問い合わせない**。`--refresh` で取り直す | 同じことを何度も聞かない |
| 試し運転 | `--dry-run` は問い合わせ文と回数だけを出して、通信しない | 回す前に量を確かめる |
| 送り先 | `https://overpass-api.de/api/interpreter`（POST、`data=` に問い合わせ文） | データ調査 2章で使った公開インスタンス |

- 大量に（数百本以上）取り出すことになったら、Overpass ではなく Geofabrik の地方別ファイルを手元で処理する方に切り替える（データ調査 5章）。MVP の約100本では不要。

### 4.3 道の形の組み立て（つなぐ・切り出す）

道は細かい way に分かれ（県道70号は 109本）、上り下りが別の線の区間もある（データ調査 2.3）。次の順で1本（多くても3本）の線にする。

**ゴール**: `cutFrom` から `cutTo` までの、1本の道すじ。
→ **そのために** way をつなぎ目（同じ点の ID）でつないだ「網」を作り、始まりから終わりまでの一番短い道すじを選ぶ。
→ **こうすると** 上り下りが別の区間は片方だけが選ばれ、途中から出ている枝（駐車場への道など）は自然に外れる。

1. **ふるい分け**: `highway` のタグがある way だけ使う。`footway`・`path`・`steps`・`cycleway`・`bridleway`・`pedestrian`・`corridor` は外す（ヤビツ峠では山道 `highway=path` が混ざった。データ調査 2.2）。林道は `highway=track` が多いので**外さない**。`excludeWays` も外す。
2. **網を作る**: way の隣り合う2点ごとに、点の ID をつなぐ辺（長さは2点間のメートル）を作る。`oneway` は見ない（形を見せるだけで、通る向きは関係ないため）。
3. **始まりと終わりの点**: `cutFrom` と `cutTo` に一番近い網の点（それぞれ 300m 以内。なければ失敗）。
4. **一番短い道すじ**: ダイクストラ法（距離で一番近い所から順に広げる探し方）で、始まりから終わりまで。点は数千個なので、単純な配列で十分（優先度つきの待ち行列の部品は入れない）。
5. **つながらないとき**（OSM の中で道が切れている）: `allowGaps: true` のときだけ、別々の線（最大3本）として、始まりに近い順に並べる。切れ目を直線でつながない（ないものを描かない）。`false` なら**その道は失敗**として報告し、geometry を書かない。
6. **長さの確かめ**: 道すじの長さを計算し、`expectedLengthKm` と 15% 以上違えば報告に印を付ける（止めはしない。人が見る）。

### 4.4 点を減らす（ダグラス・ポーカー法）

- 許す誤差 **15m**（データ調査 2.3: 箱根スカイライン 233点 → 47点、県道70号＋127号 3,362点 → 596点。スマホの画面で道全体を見るなら十分）。
- 計算は、線の真ん中の緯度で「経度の差 × cos(緯度) × 111,320m」「緯度の差 × 110,540m」として平らな地図に置きかえてから行う（数十 km なら、ゆがみは見た目で分からない。データ調査 6.2）。
- 自分で呼び出す形（再帰）ではなく、やることの積み重ね（スタック）で書く（長い道でも呼び出しが深くなりすぎない）。両端の点は必ず残す。
- 減らした後、座標を小数5桁（約1m）に丸め、同じ点が続いたら1つにする。2点未満になったら失敗。

### 4.5 道の形のファイル（`data/geometry/{id}.json` と `public/data/catalog/roads/{id}.json`）

```json
{
  "geometrySchemaVersion": 1,
  "id": "hakone-skyline",
  "license": "ODbL-1.0",
  "attribution": "© OpenStreetMap contributors",
  "osm": { "relations": [12639322], "ways": [56759882], "dataTimestamp": "2026-10-10T04:13:00Z" },
  "toleranceM": 15,
  "lengthM": 5020,
  "bbox": [35.17, 138.98, 35.21, 139.02],
  "lines": [ [ [35.20512, 138.99876], [35.20488, 138.99911] ] ]
}
```
- 上の数値は説明用の例（本物の値ではない）。
- 座標は `[緯度, 経度]` の順（Leaflet の順にそろえる）。
- `public/` 側は、生成スクリプトが `data/geometry/` から**承認済み・引退の道だけ**を写したもの（中身は同じ）。`lengthM` は画面に出さない（PRD v3 Q6）。

### 4.6 報告の絵

取り出しスクリプトは、道ごとに 240×160 の SVG（道の線と始まり・終わりの点だけ。背景なし）を `data/.osm-cache/preview/{id}.svg` に書く。Hiro は報告の中でこれを見て、区間が合っているかを確かめる（地図の背景は、必要なら「地図アプリで開く」の点で確かめる）。

### 4.7 大きさの目安【推論: データ調査 4.5 と 2.3 の点の数から】

| もの | 1本 | 100本 |
|---|---|---|
| 索引（`catalog-index.json`。名前・読み・別名・注意・代表点） | 約0.4〜0.7KB | 約40〜70KB（圧縮で約1/4） |
| 道の形（15m、1km 約30点、JSON） | 平均15km で約450点 → 約9KB（圧縮で約3KB） | 道を開いたときに1本だけ取る |
| ODbL の一式 | — | 約1MB |

---

## 5. 検索（手書きの索引と正規化）

### 5.1 索引の形と作るとき

- `src/generated/catalog-index.json`（生成物）: `{ catalogVersion, roads: [{ id, status, name, reading, aliases, roadType, prefectureCodes, rank, section, elevationM, representativePoint, restrictionsChecked, notes, hasGeometry }] }`。画面に要る物だけを入れる（取り出しの指定 `osm`・道ごとの `sources`・`review` は入れない。注意ごとの出典の URL は残す）。
- 検索の部品と道の詳細は、この JSON を `import()`（あとから読む）で読む。ホームの最初の表示を重くしない【推論】。同じドメインの JS の部品なので CSP は今のまま（`script-src 'self'`）。
- **鍵（そろえた文字）は実行時に作る**（`buildSearchIndex`）。生成スクリプトでは作らない。理由: 打った言葉と索引に**同じ関数**をかけないと、ずれて当たらなくなる。関数を1か所（`src/lib/search/`）に置けば、ずれは起きない。約100本×鍵12個は数ミリ秒で作れる【推論】。
- 自分で追加した道（IndexedDB）も、読み込んだ後に同じ関数で鍵を作って足す。読みがないので、名前の鍵だけ（ローマ字では当たらない。PRD v3 に書く範囲）。

```ts
// src/lib/search/types.ts
type SearchDoc = {
  roadKey: string                 // catalog id or "own-<uuid>"
  source: 'catalog' | 'custom'
  displayName: string
  nameKeys: string[]              // normalized name + aliases
  readingKeys: string[]           // normalized readings (hiragana)
  romajiKeys: string[]            // romaji (hepburn + kunrei), romaji-normalized
  prefKeys: string[]              // normalized prefecture names (with and without 都/道/府/県) + romaji
  rank: number                    // custom roads: Number.MAX_SAFE_INTEGER
  prefectureCodes: number[]
}
```

### 5.2 そろえ方（`normalizeForSearch`。打った言葉と索引の両方にかける）

順番が大事なので、この順で行う。

| # | 処理 | 例 |
|---|---|---|
| 1 | `normalize('NFKC')`（全角英数→半角、半角カナ→全角カナ、全角の空白→半角） | 「ﾔﾋﾞﾂ」→「ヤビツ」、「ＳＫＹ」→「SKY」 |
| 2 | 小文字にする | 「SKY」→「sky」 |
| 3 | カタカナ（U+30A1〜U+30F6）をひらがなへ（文字コードを 0x60 引く）。「ヽヾ」→「ゝゞ」 | 「ヤビツ」→「やびつ」 |
| 4 | 「ゕ」「ゖ」（＝ヵ・ヶを3でひらがなにしたもの）と「ケ」から来た「け」を同じにする: **ゕ・ゖ → け** | 「三ヶ根」「三ケ根」「三ヵ根」→「三け根」 |
| 5 | 消す文字: 空白、`・` `･` `-` `‐` `−` `–` `—` `_` `.` `,` `、` `。` `(` `)` `「` `」` `'` `’`、長音 `ー`、波 `〜` `～` | 「信貴・生駒」→「信貴生駒」、「すかいらいん」と「スカイライン」→「すかいらいん」 |

- 長音「ー」は打った言葉からも索引からも消す（両方から消せば、のばす・のばさないの違いがなくなる）。
- 1 の後で**空白で区切って**から 2〜5 をかける（空白は「言葉の区切り」として使う。5.4）。
- 漢字の異体字（「澤」と「沢」など）はそろえない（MVP の範囲外。必要なら別名で足す）。

### 5.3 ローマ字（`src/lib/search/romaji.ts`）

**ゴール**: 「yabitsu」「yabitu」「Yabitsu Touge」「yabi」で「ヤビツ峠」が出る。
→ **そのために** 読み（ひらがな）から**ヘボン式と訓令式の2つ**のローマ字の鍵を作って持つ。
→ **さらにそのために** 打った言葉と鍵の両方に「ゆれをそろえる」小さな処理（`normalizeRomaji`）をかける。

- 変換表（手書き。約110項目）: 清音・濁音・半濁音・拗音（きゃ・しゃ・ちゃ…）・小さい「っ」（次の子音を重ねる。ヘボン式では「っち」→「tch」）・「ん」（`n`）。
  - ヘボン式: し=shi・ち=chi・つ=tsu・ふ=fu・じ=ji・しゃ=sha・ちゃ=cha・じゃ=ja
  - 訓令式: し=si・ち=ti・つ=tu・ふ=hu・じ=zi・しゃ=sya・ちゃ=tya・じゃ=zya
- `normalizeRomaji`（両方にかける）: 英数字以外を消す → 小文字 → のばす音をまとめる（`ou`→`o`、`oo`→`o`、`uu`→`u`）→ `m` の後に `b`/`p`/`m` が来たら `n` にする（「shimbashi」と「shinbashi」）→ `n'` の `'` は1で消えている。
  - 例: 読み「やびつとうげ」→ ヘボン式 `yabitsutouge` → `yabitsutoge`、訓令式 `yabitutouge` → `yabitutoge`。打った「Yabitsu Touge」→ 空白で2語 `yabitsu`・`toge`（どちらも当たる）。
- 打った言葉が**英字と数字と空白だけ**のときに、ローマ字の鍵とも比べる（漢字やかなが混ざっていればローマ字の鍵は見ない）。
- 限界（PRD に書く範囲）: 1語の中でヘボン式と訓令式を混ぜた打ち方（「sitsu」など）は当たらない。打ち間違いは直さない。
- 都道府県名の読み（47個）も同じ表でローマ字の鍵にする（「kanagawa」で神奈川県の道）。

### 5.4 探し方と並び（`searchRoads`）

```ts
// src/lib/search/search.ts
type SearchHit = {
  roadKey: string
  tier: 1 | 2 | 3 | 4 | 5
  matchedBy: 'name' | 'alias' | 'reading' | 'romaji' | 'prefecture'
  matchedAlias?: string                      // for "別名: 〇〇"
  highlight?: { start: number; end: number } // range in displayName (tier 1/3 by name only)
}
function searchRoads(query: string, index: SearchIndex): { total: number; hits: SearchHit[] } // all hits, sorted
```

1. 打った言葉を空白で区切り、それぞれをそろえる。空になった言葉は捨てる。全部空なら「何も打っていない」扱い（例の道を出す）。
2. 道ごとに、**それぞれの言葉が**次のどれかに当たるかを見る。一番よい段をその言葉の段にする。

| 段 | 当たり方 |
|---|---|
| 1 | 名前・別名の鍵が、その言葉で**始まる** |
| 2 | 読み・ローマ字の鍵が、その言葉で始まる |
| 3 | 名前・別名の鍵の**途中に**その言葉を含む |
| 4 | 読み・ローマ字の鍵の途中に含む |
| 5 | 都道府県名の鍵が、その言葉で始まる |

3. **全部の言葉が当たった道だけ**を残す（「スカイライン 静岡」は両方に当たる道だけ）。道の段は「1つ目の言葉の段」。
4. 並び: 段 → `rank`（小さいほど上）→ 1つ目の都道府県の番号（北から）→ 読みの順（`localeCompare('ja')`）。**お気に入りかどうかでは並べかえない**。
5. 引退した道は外す。候補は上から6件、`total` で「すべて見る（N件）」を出す。
6. 太字の範囲: 段1・3で名前に当たったときだけ。表示名を1文字ずつそろえて、そろえた文字と元の文字の位置の対応表を作り、当たった範囲を元の位置に戻す（表示名は NFKC で変わらないことを C1 で保証しているので、1文字ずつそろえてよい）。

### 5.5 日本語入力（IME）とコンボボックスの扱い

| 場面 | 実装 | 根拠 |
|---|---|---|
| 候補の更新 | `input` イベントで入力欄の値を読んで、毎回 `searchRoads`。変換中でも更新する（待たない） | UX 調査 2-2・2-3 |
| Enter・↑・↓・Esc | `keydown` で `event.nativeEvent.isComposing \|\| event.keyCode === 229` なら**何もしない**（IME に任せる） | MDN keydown（UX 調査 M1）。Safari は変換の確定の Enter を `compositionend` の後に `keyCode 229` で送ることがあるため、両方を見る |
| 選ばれている行 | フォーカスは入力欄のまま、`aria-activedescendant` で行を指す。指した行は自分で `scrollIntoView({ block: 'nearest' })` | W3C APG（UX 調査 A1, A2） |
| 件数の読み上げ | 一覧の外の `role="status"` に、最後の入力から 500ms 後に1回だけ書く | UX 調査 5-2 |
| URL | 6章（`#q=`） | — |

- 部品は organisms の `SearchCombobox`（DS v3 6-1）。検索の関数・索引は props で受け取り、`@/lib/search` を直接 import しない（ARCH v2 12.4 の `noData` の考えを広げる。検索は保存処理ではないが、部品を純粋に保つため `@/lib/search/*` も `noData` に入れる）。

### 5.6 性能の目安

- 100〜300本・鍵12個・言葉2つで、1回の検索は 1ms 未満【推論: データ調査 4.4】。テストで 1,000本の作った索引に対して 1回 10ms 未満（CI の遅い機械を考えた余裕）を確かめる。
- 1文字目から全部を探すので、待ち（デバウンス）は入れない。遅い端末で重いと分かったら 100ms 待つ（UX 調査 2-2）。

---

## 6. ルーティング（URL）（ARCH v2 4.1 を置き換え）

| 画面 | URL | 静的ファイル | 状態の置き場所 |
|---|---|---|---|
| ホーム | `/` | `out/index.html` | — |
| 検索（全画面） | `/#q={打った言葉}` | 同じ | **ハッシュ**。開くときに `pushState`、打つたびに `replaceState` |
| 結果の一覧（言葉） | `/#q={言葉}&all=1` | 同じ | ハッシュ。`pushState` |
| 結果の一覧（種類） | `/#type={pass…}`（`&pref={1..47}`） | 同じ | ハッシュ |
| 道の詳細 | `/road/?id={roadKey}` | `out/road/index.html` | クエリ（道の鍵は打った言葉ではない） |
| お気に入り | `/favorites/?type=&pref=&sort=` | `out/favorites/index.html` | クエリ（v2 の C-19 と同じ） |
| 走行記録の登録 | `/drives/new/?road={roadKey}` | `out/drives/new/index.html` | クエリ |
| 走行記録の編集 | `/drives/edit/?id={driveId}` | `out/drives/edit/index.html` | クエリ |
| 自分で道を追加 | `/roads/new/#name={打った言葉}` | `out/roads/new/index.html` | 名前の下書きはハッシュ（打った言葉なので） |
| 自分で追加した道の編集 | `/roads/edit/?id=own-{uuid}` | `out/roads/edit/index.html` | クエリ |
| データ | `/data/` | `out/data/index.html` | — |
| 404 | — | `out/404.html` | — |

- **打った言葉をハッシュに置く理由**: クエリ（`?` の後ろ）は、ページの取得のたびにサーバーへ送られ、Vercel のアクセスの記録に残る。App Router の画面の切り替えでも、`router.push('/?q=…')` は RSC のデータを取りに行く【要検証: ADR 3.2 (b) のとおり切り替えでは `.txt` を `fetch` する。クエリが付くかは段階13 の E2E で全取得の URL を記録して確かめる】。ハッシュは取得に含まれない【事実: URL の決まり】。
- **実装の決まり**: 打った言葉を変えるときは `window.history.pushState` / `replaceState` でハッシュだけを書きかえ、`hashchange` と `popstate` を聞く小さな hook（`useHashState`。`src/features/search/useHashState.ts`）で読む。**Next の `router.push` / `Link` に打った言葉を入れない**（ESLint では止めにくいので、E2E の「取得の URL に打った言葉がない」検査で守る）。
- 戻るボタン: 検索の全画面を開くときに `pushState` しているので、戻るで閉じてホームに戻る。候補から詳細へ行って戻ると、`/#q=…` のホームに戻り、検索の全画面が言葉つきで開く。
- `vercel.json` の転送: v1 の `/roads` は `trailingSlash` で `/roads/` になるので、`{ "source": "/roads/", "destination": "/favorites/", "permanent": false }`（ADR 5.1 の2 の直し方を v3 の行き先に合わせた）。ローカルの `serve-static.mjs` も Vercel と同じ順（trailingSlash → redirects）にする（ADR 8章の4）。
- URL を作る関数は `src/lib/routes.ts` に集める（`roadHref(roadKey)`・`searchHash(q)` など）。道の鍵は、リストの ID の形か `own-` ＋ UUID の形だけを通す（それ以外は「見つかりません」）。

---

## 7. 道の形の地図となぞる動き（実装）

### 7.1 部品の分け方

| 部品 | 階層 | 役目 |
|---|---|---|
| `RouteMap` | organisms（Client） | Leaflet の地図・線・印・出典・「もう一度なぞる」。道の形は props（`lines`）で受け取る |
| `src/lib/trace/plan-trace.ts` | lib（純粋関数） | 線の長さから、動きの時間・各線の始まる時刻を決める（テストしやすくするため、DOM から分ける） |
| `src/features/catalog/useRoadGeometry.ts` | features | `fetch('/data/catalog/roads/{id}.json')`・zod で検査・失敗の状態 |

### 7.2 地図の設定

- Leaflet は今のとおり `useEffect` の中で `await import('leaflet')`（ARCH v2 12.2）。
- 動かない地図: `dragging: false`、`touchZoom: false`、`scrollWheelZoom: false`、`doubleClickZoom: false`、`boxZoom: false`、`keyboard: false`、`zoomControl: false`、`zoomSnap: 0.25`。
- 線全体に合わせる: `fitBounds(bounds, { padding: [24, 24], animate: false })`。
- タイル: 地理院タイル 淡色（ARCH v2・DS v2 6-12 のまま）。
- 出典: `attributionControl` を使い、`setPrefix(false)` の後に定数の出典（3.6）を入れる。
- 線: 下に白いふちの線（太さ 9px、白）、上に種類の色の線（太さ 5px、`lineCap: 'round'`、`lineJoin: 'round'`）。どちらも `interactive: false`。印は `circleMarker`（始まり: 種類の色で塗り・白いふち2px・半径6。終わり: 白で塗り・種類の色のふち3px・半径6）。

### 7.3 なぞる動き（Web Animations API）

```ts
// src/lib/trace/plan-trace.ts
type TracePlan = { totalMs: number; segments: { index: number; delayMs: number; durationMs: number }[] }
function planTrace(lineLengthsM: number[]): TracePlan
// totalMs = clamp(1200 + totalKm * 20, 1200, 2000)   // 5km -> 1300ms, 15km -> 1500ms, 40km+ -> 2000ms
// segments: split totalMs by each line's share of length, played one after another
```

1. `fitBounds` の後、タイルの `load` か **500ms** の早い方を待つ（背景を待ちすぎない。PRD v3 US-07）。
2. `document.visibilityState === 'hidden'` なら、`visibilitychange` で見えるまで待つ。
3. 各線の SVG の `path`（`polyline.getElement()`）で `getTotalLength()` を取り、`path.style.strokeDasharray = len`・`strokeDashoffset = len` にする（CSSOM で書くので、HTML の `style` 属性の文字列を作らない。CSP の `style-src` は Leaflet のために `'unsafe-inline'` を許しているが、それに頼らない書き方にする）。ふちの線も同じにする。
4. `path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration, delay, easing, fill: 'forwards' })`。線が1本なら `easing` は DS v3 の `ease-trace`（ゆっくり始まりゆっくり終わる。だんだん速くなる形にしない）、2本以上なら各線 `linear`。
5. 始まりの印は最初から出す。終わりの印は最後の線が終わったときに 200ms で表す。
6. 終わったら `strokeDasharray` を空に戻す（画面の回転などで線が描き直されても、全部が見えるように）。
7. 途中で画面の大きさが変わったら、動きを止めて全部描いた状態にする。
8. 「もう一度なぞる」: 動きを全部 `cancel()` して 3 から。
9. **動きを減らす設定**: `matchMedia('(prefers-reduced-motion: reduce)')` が当たれば、3〜6 をせずに全部描いた線と両端の印を出し、「もう一度なぞる」を出さない。設定の変化（`change`）も聞く。
10. Web Animations API で動かす理由: E2E で `document.getAnimations()` を使って途中（750ms）で止め、**途中のコマの画面写真**を毎回同じに撮れる（PRD v3 9章）。

### 7.4 失敗したとき

| 失敗 | 動き |
|---|---|
| 道の形のファイルを取れない（電波なし・404） | 地図の場所に PRD v3 N-28 と［再読み込み］。名前・注意・記録は出す |
| 道の形のファイルが壊れている（zod で落ちる） | 同じ表示。開発中はコンソールに理由 |
| タイルだけ読めない（`tileerror`） | 線は描く。右下に「地図を読み込めませんでした」 |
| 自分で追加した道 | `RouteMap` ではなく v2 の `RoadMiniMap`（ピン1つ） |

---

## 8. 端末の保存（v2 からの変更）

### 8.1 IndexedDB の構成（ARCH v2 6.1 を置き換え）

| 項目 | 値 |
|---|---|
| DB 名 | `road-review` |
| バージョン | `SCHEMA_VERSION` = **1**（v2 の形は公開していないので、v3 の形を最初の版にする） |
| store `favorites` | keyPath `roadKey` |
| store `customRoads` | keyPath `id`（UUID） |
| store `drives` | keyPath `id`、index `byRoadKey`（`roadKey`、unique ではない） |

### 8.2 保存するレコード（schemaVersion 1）（ARCH v2 5.1 を置き換え）

```ts
// src/lib/schema/v1.ts
type RoadKey = string   // catalog id (/^[a-z0-9]+(-[a-z0-9]+)*$/, not "own-") | `own-${uuid}`

type FavoriteRecordV1 = {
  roadKey: RoadKey
  addedAt: string                       // ISO 8601 UTC "Z"; kept as-is on undo
  snapshot: {                           // shown when the catalog no longer has the road
    name: string                        // 1..60
    prefectureCodes: number[]           // 1..3
    roadType: 'pass' | 'skyline' | 'coastal' | 'forest' | 'other'
  }
}

type CustomRoadRecordV1 = {             // = ARCH v2 RoadRecordV1 (name, prefectureCode, roadType, location|null, createdAt, updatedAt)
  id: string                            // crypto.randomUUID(); roadKey = `own-${id}`
  name: string; prefectureCode: number
  roadType: 'pass' | 'skyline' | 'coastal' | 'forest' | 'other'
  location: { lat: number; lng: number } | null
  createdAt: string; updatedAt: string
}

type DriveRecordV1 = Omit<ARCHv2_DriveRecordV1, 'roadId'> & { roadKey: RoadKey }
// ratings / traffic / memo / helpfulNote / roadInfo / createdAt / updatedAt are unchanged from ARCH v2 5.1
```

- 上限: お気に入り 500・自分で追加した道 200・走行記録 5,000（v2 C-18 の考え。道の上限 500 をお気に入りに当てた）。
- 入力の決まり（文字数・列挙・日本の範囲・評価 1〜5・未来の日付は書くときだけ）は ARCH v2 5.1 のまま。

### 8.3 localStorage（ARCH v2 7.2・7.3 を直す）

| キー | 中身 | 変更 |
|---|---|---|
| `rr-draft:v1:{formKey}` | 下書き。formKey は `road:new`・`road:edit:{id}`・`drive:new:{roadKey}`・`drive:edit:{id}` | `drive:new` が `roadKey` に |
| `rr-onboarding-done`・`rr-safety-ack`・`rr-last-export`・`rr-changes-since-export`・`rr-reminder-snoozed-until`・`rr-persist` | v2 のまま | 「変更」にお気に入りの追加・外すを数える |
| `rr-usage` | `{ favDetailOpens, searchOpens, zeroResultSearches, driveSaves, quietUntil }`（PRD v3 US-18 の M・S・Z・N） | 3つ増える。`quietUntil` はお気に入りに追加・走行記録の保存から10分（M を数えない時間） |

- **打った言葉・道の名前・道の鍵は localStorage に書かない**（PRD v3 US-02・US-18）。E2E で中身を検査する。

### 8.4 書き出しと読み込み（ARCH v2 8.1・8.2 を直す）

```json
{
  "app": "road-review",
  "schemaVersion": 1,
  "exportedAt": "2026-10-20T05:12:34.567Z",
  "appVersion": "3.0.0",
  "catalogVersion": "2026-10-20.1",
  "counts": { "favorites": 4, "customRoads": 1, "drives": 12 },
  "data": {
    "favorites":   [ { "roadKey": "yabitsu-toge", "addedAt": "…", "snapshot": { "...": "…" } } ],
    "customRoads": [ { "id": "…", "name": "…", "...": "CustomRoadRecordV1" } ],
    "drives":      [ { "id": "…", "roadKey": "own-…", "...": "DriveRecordV1" } ]
  }
}
```

- ファイル名・整形・ダウンロードだけ・注意の文言は ARCH v2 8.1 のまま。`catalogVersion` は参考（読み込みでは比べない）。
- 読み込みの流れ（ARCH v2 8.2 の 1〜8）はそのまま。5〜6 の中身を次に置きかえる:

| # | 検査 | だめなとき |
|---|---|---|
| 5 | 全レコードが 8.2 の形に合う（全部か無しか。最初の3件の場所を出す） | 拒否 |
| 6a | ファイルの中で `favorites.roadKey`・`customRoads.id`・`drives.id` が重複しない | 拒否 |
| 6b | `own-` の鍵（お気に入り・走行記録）は、ファイルの中の `customRoads` にある | 拒否（「対応する道がありません」） |
| 6c | リストの ID の形の鍵は、**今のリストになくても受け入れる**（新しい版のリストで作ったファイル、引退した道） | 受け入れる。表示はお気に入りの `snapshot`。走行記録だけでお気に入りがない場合は「リストにない道」と出す |
| 6d | `counts` と中身の件数が合う | 拒否 |
| 6e | 件数の上限（8.2） | 拒否 |

- 置き換えは `[favorites, customRoads, drives]` の readwrite トランザクション1つで `clear()` → 全部 `put`。途中で失敗したら何も変わらない（v2 と同じ）。

### 8.5 保存係のインターフェース（ARCH v2 6.2 を置き換え）

```ts
// src/lib/storage/repository.ts  (StorageResult / StorageErrorCode are unchanged from ARCH v2 6.2)
export interface RoadReviewRepository {
  // favorites
  listFavorites(): Promise<StorageResult<Parsed<FavoriteRecordV1>>>
  getFavorite(roadKey: RoadKey): Promise<StorageResult<FavoriteRecordV1 | null>>
  addFavorite(roadKey: RoadKey, snapshot: FavoriteRecordV1['snapshot']): Promise<StorageResult<FavoriteRecordV1>> // idempotent
  removeFavorite(roadKey: RoadKey): Promise<StorageResult<FavoriteRecordV1 | null>>  // returns the removed record for undo
  restoreFavorite(record: FavoriteRecordV1): Promise<StorageResult<void>>            // puts the exact record back
  // custom roads
  listCustomRoads(): Promise<StorageResult<Parsed<CustomRoad>>>
  getCustomRoad(id: string): Promise<StorageResult<CustomRoad | null>>
  createCustomRoadAndFavorite(values: CustomRoadValues): Promise<StorageResult<CustomRoad>> // one tx: customRoads + favorites
  updateCustomRoad(id: string, values: CustomRoadValues): Promise<StorageResult<CustomRoad>>
  deleteCustomRoad(id: string): Promise<StorageResult<{ deletedDrives: number }>>          // one tx: customRoads + favorites + drives
  // drives
  listDrives(roadKey: RoadKey): Promise<StorageResult<Parsed<DriveWithRoadInfo>>>
  listAllDrives(): Promise<StorageResult<Parsed<DriveWithRoadInfo>>>                         // for summaries
  getDrive(id: string): Promise<StorageResult<DriveWithRoadInfo | null>>
  createDrive(roadKey: RoadKey, values: DriveValues): Promise<StorageResult<DriveWithRoadInfo>> // requires favorite or custom road (PRD v3 US-10)
  updateDrive(id: string, values: DriveValues): Promise<StorageResult<DriveWithRoadInfo>>
  deleteDrive(id: string): Promise<StorageResult<void>>
  // data
  countAll(): Promise<StorageResult<{ favorites: number; customRoads: number; drives: number }>>
  exportSnapshot(meta: { catalogVersion: string }): Promise<StorageResult<ExportFileV1>>
  replaceAll(file: ValidatedImport): Promise<StorageResult<ImportReport>>
  clearAll(): Promise<StorageResult<void>>
}
```

- `createDrive` は、同じトランザクションの中で「お気に入りにあるか、`own-` の道が `customRoads` にあるか」を確かめ、なければ `validation` を返す（画面の決まりを保存係でも守る）。
- 道の表示に要る情報は、純粋関数 `resolveRoad(roadKey, catalogIndex, customRoads, favorites)` で決める: `catalog`（今のリスト）／`retired`（引退）／`unknownCatalog`（ID の形は正しいが今のリストにない → `snapshot` で表示）／`custom`／`missing`（「見つかりません」）。
- 集計: `buildFavoriteCards`（お気に入り＋各道の走行記録の平均・回数・最後の日）と `buildCollectionStats`（走った道の本数・都道府県の数。県をまたぐ道はまたぐ県を全部数える。PRD v3 Q8）。どちらも `src/lib/roads/` の純粋関数。

---

## 9. テスト

ARCH v2 10章の層の分け方（①純粋関数 ②保存層＋fake-indexeddb ③部品＋jsdom ④`out/` を配る E2E ⑤ビルドの検証）はそのまま。v3 で足すもの:

### 9.1 単体（①）

| 対象 | 確かめること |
|---|---|
| `lib/catalog/schema` | 3.3 の形。正しい見本・壊れた見本（ID の形・`own-`・読みにカタカナ・未来の確認日・`http://`・禁止語） |
| `catalog.data.test.ts` | **本物の** `road-catalog.json`・`road-catalog-draft.json`・`catalog-ids.txt`・`data/geometry/*` に C1〜C9・C11・C12 |
| `scripts/catalog`（純粋な部分は `scripts/catalog/lib/*.mjs` に分けて Vitest から読む） | 下の表 |
| `lib/search/normalize` | 5.2 の各段の表（入力 → 期待） |
| `lib/search/romaji` | 変換表の全部の行、「っ」「ん」「ー」、ヘボン式・訓令式、`normalizeRomaji` |
| `lib/search/search` | PRD v3 US-03 の表の全部の例（下の 9.2）、段の順、`rank`、AND、引退を外す、6件と `total`、太字の範囲、自分で追加した道、1,000本で 10ms 未満 |
| `lib/trace/plan-trace` | 5km → 1300ms、15km → 1500ms、40km → 2000ms、1km → 1200ms、2本の線の時間の分け方 |
| `lib/schema/v1`・`transfer/*` | 8.2 の形、8.4 の 6a〜6e、往復（書き出し → 空の DB に置き換え → 一致） |
| `lib/roads/*` | `resolveRoad` の5つの場合、`buildCollectionStats`（県をまたぐ道） |

取り出し・組み立て・間引き（`scripts/catalog/lib/`）:

| 対象 | 確かめること |
|---|---|
| `overpass-client` | **名乗りに `@` がない・定数と一致・環境変数を読まない**（`process.env` を空にしても同じ文字列）、1つずつ送る、5秒あける（偽の時計）、429 で60秒待って最大2回・3回目で止まる、120回を超える前に止まる、`--dry-run` で通信0回 |
| `cache` | 同じ問い合わせは2回目に通信しない、90日を過ぎたら取り直す、`--refresh` |
| `assemble` | 見本: 箱根スカイライン（relation 12639322 の応答の写し）が1本の線になる／上り下りが別の線（作った見本）で片方だけが選ばれる／枝（作った見本）が外れる／`highway=path` が外れる／切れ目（作った見本）で `allowGaps: false` なら失敗・`true` なら2本／`cutFrom` が 300m 以上離れていたら失敗 |
| `simplify` | まっすぐな線のゆれ（15m 未満）が2点になる／L字の角が残る／箱根スカイライン 233点 → 40〜55点（データ調査 2.3 の 47点）／両端が残る／同じ点が続かない |
| `generate` | 同じ入力から2回作ると、1バイトも違わない（並びと書き方を決めてある）／`--check` は差があると終了コード1／`draft` を読まない |

- OSM の応答の見本（`tests/fixtures/catalog/osm/*.json`）は ODbL のデータなので、同じフォルダに出典の README.txt を置く。

### 9.2 検索の期待（PRD v3 US-03 の表をテストにしたもの）

| 打つ | 期待（1番目、または含む） |
|---|---|
| `やびつ`・`ヤビツ`・`ﾔﾋﾞﾂ`・`やび` | ヤビツ峠が1番目 |
| `yabitsu`・`yabitu`・`Yabitsu Touge`・`yabitsutoge`・`yabi`・`yabits` | ヤビツ峠を含む |
| `うすい`・`碓氷`・`usui` | 碓氷峠が1番目 |
| `三ヶ根`・`三ケ根`・`三ヵ根` | 三ヶ根山スカイラインを含む（リストにあれば。なければ見本のリストで） |
| `西伊豆 スカイライン`・`にしいず` | 西伊豆スカイラインが1番目 |
| `船原西浦高原線`・`127` | 西伊豆スカイラインを含み、「別名」で当たった印 |
| `スカイライン 静岡` | 静岡県のスカイラインだけ |
| `スカイライン` | 7件以上なら `total` が正しく、6件だけ候補 |
| `kanagawa`・`神奈川` | 神奈川県の道（段5） |
| `やびす` | 0件 |
| 空白だけ | 「何も打っていない」 |

- 本物のリストに頼るテストと、見本のリスト（`tests/fixtures/catalog/mini-catalog.json`。10本）に対するテストを分ける。見本で決まりを確かめ、本物では「有名な数本が引ける」ことだけを確かめる（リストが変わってもテストが壊れにくいように）。

### 9.3 部品（③）

- `SearchCombobox`: `compositionstart` → `input`（`isComposing: true`）で候補が変わる／変換中の `keydown` Enter（`isComposing: true`、`keyCode: 229`）で `onSelect`・`onSubmit` が呼ばれない／確定後の Enter で `onSubmit`／↓ で `aria-activedescendant` が1行目／Esc の2段の動き／`role="status"` が 500ms 後に1回。
- `RouteMap`: 今の `tests/helpers/leaflet-mock.ts` を広げて `polyline`・`circleMarker`・`fitBounds`・`attributionControl` を記録する。動きを減らす設定（`matchMedia` を差し込む）で `animate` が呼ばれず「もう一度なぞる」が無い／普通の設定で `animate` が呼ばれる（jsdom には `animate` が無いので、差し込んだ偽物で数える）。
- `FavoriteButton`・`UndoToast`: 外す → トーストの［元に戻す］→ `restoreFavorite` に同じ記録／8秒で消える（偽の時計）／フォーカスがある間は消えない。

### 9.4 E2E（④。`iphone-webkit` 390×844 と `small-360` 360×640）

| spec | 中身 |
|---|---|
| `search.spec.ts` | ホーム → 検索 → 「やびつ」（`keyboard.type`）→ 候補 → 詳細。Enter で一覧。0件 → 自分で追加の入口（候補があるときは無い）。種類から探す。戻るで言葉が残る |
| `privacy.spec.ts` | 検索・詳細・お気に入りの流れで、**全部の取得の URL に、打った言葉（そのまま・URL エンコード・ローマ字）が無い**。`openstreetmap.org`・`overpass-api.de` への通信が0件。localStorage と IndexedDB の中に打った言葉が無い |
| `trace.spec.ts` | 詳細で、線の `path` があり、2秒後に `stroke-dashoffset` が 0。`getAnimations()` で 750ms に止めて途中のコマを撮る。`page.emulateMedia({ reducedMotion: 'reduce' })` で最初から全部・「もう一度なぞる」が無い。出典の2つのリンクが見えている |
| `favorites.spec.ts` | ♡ → 主ボタンが変わる → 外す → ［元に戻す］→ 同じ追加日時。お気に入りの一覧と並び替え。記録がある道を外すと「記録がある道」に出る |
| `transfer.spec.ts` | v2 の往復に、お気に入り・自分で追加した道を足す。今のリストにない ID を含むファイルを受け入れる |
| `catalog-files.spec.ts` | `/data/catalog/road-catalog-odbl.json`・`LICENSE-ODbL.txt` が取れ、データ画面のリンクが指している |
| v2 の spec | `drives`・`draft`・`safety`・`security`・`a11y` は道の鍵に合わせて直して使う |

- 地理院タイルは v2 のとおり見本の画像に差し替える。道の形のファイルは本物（`out/` の中にある）を使う。
- IME の本当の動き（フリック入力）は Playwright では再現できない。部品のテスト（③）でイベントの順を確かめ、本物は CEO の iPhone 実機確認に任せる（「確かめた」とは書かない）。

---

## 10. 実装の順番（TDD）（ARCH v2 15章・v2 レビュー 3章を置き換え）

進め方の約束は v2 レビュー 3.0 のまま（test-writer が失敗するテスト → 実装 → 整理 → code-reviewer。画面を作る段階は 360×640・390×844 の写真を qa-engineer が見て表に書き、CPO が合否。CI ができてからは CI が緑で完了）。

| 段階 | 内容 | 担当 | 受入条件 | 画面写真 |
|---|---|---|---|---|
| **0 試作と確認（済み）** | 静的書き出し＋ハッシュ meta CSP を Vercel で確認・fake-indexeddb の確認・`--ignore-scripts` でのビルド | devops-engineer | **ADR 5章のとおり合格**（V-1・V-2・V-4〜V-8）。残り: `/roads` の転送 → 段階3、iPhone の1枚 → 段階13 の実機確認にまとめる | 済み（`scratchpad/screens-vercel/`） |
| **1 CI の骨組み** | ARCH v2 14章。`--target preview` を明記（ADR 5.1）・`engines.node` の固定（ADR V-8） | devops-engineer | PR で CI が回る。スキップ1件で赤 | なし |
| **2 片付けと静的書き出し** | ARCH v2 12.1 の削除・`output: 'export'`・空の枠のページ（6章の URL） | frontend-developer／devops-engineer／supply-chain-auditor | `out/` ができる。`supabase`・`use server`・`cookies(` が0件。lockfile の差分を監査済み | 空の枠のトップ |
| **3 CSP の仕組み** | ADR の `scripts/csp/*`・`serve-static.mjs` を本物へ。`/roads/` → `/favorites/`。単体テスト | devops-engineer | `verify-out` が全 HTML で緑、わざと壊すと赤。`/roads` → `/roads/` → `/favorites/` | なし |
| **4 リストの形と検査** | `lib/catalog/schema.ts`・`catalog.data.test.ts`（C1〜C9・C11・C12）・見本のリスト・`catalog-ids.txt`・CI の C4 の手順 | test-writer → backend-developer | 見本で緑・壊した見本で赤。`road-catalog.json` は最初は0本でも通る | なし |
| **5 取り出しスクリプト** | `extract-osm.mjs`＋`lib/{overpass-client,cache,assemble,simplify}.mjs`。偽の通信でテスト。そのあと**案の3本（例: 箱根スカイライン・ヤビツ峠の県道70号・西伊豆スカイライン）で本物を1回だけ回す** | backend-developer／supply-chain-auditor（名乗りと通信先の確認） | 9.1 の表が緑。本物の実行で問い合わせ3回・5秒間隔・名乗りに個人情報なし（ログで確かめる）。3本の geometry と報告ができる | 報告の SVG 3枚を Hiro が見る |
| **6 生成と最初の承認** | `generate.mjs`（索引・道の形・ODbL 一式・`--check`）。**Hiro が3本を承認** → 生成 → `build` の先頭に `--check` | backend-developer／CEO（承認） | 2回作って同じ。`--check` で差を止める。C7・C10〜C12 が緑 | なし |
| **7 検索の正規化と索引** | `lib/search/{normalize,romaji,build-index,search}.ts` | test-writer → backend-developer | 9.1・9.2 が緑（見本のリストで） | なし |
| **8 端末のデータの形** | `lib/schema/{version,v1,migrations}.ts`（8.2）・`lib/roads/*`（`resolveRoad`・集計） | 同上 | 単体が緑。禁止の項目名が型に無い（v2 と同じ） | なし |
| **9 保存層** | `pnpm add -D fake-indexeddb@6.2.5`（監査つき）・`indexeddb-repository`（8.5） | 同上 | お気に入りの追加が二重にならない・外して戻すと同じ記録・自分で追加した道の削除が1回の処理で連鎖・`createDrive` がお気に入りでない道を断る | なし |
| **10 書き出しと読み込み** | `transfer/{export-file,parse-import}`（8.4） | 同上 | 往復が一致・6a〜6e・v2 の不正なファイル9種 | なし |
| **11 見た目の土台** | DS v3 4章のトークン（v2 のもの＋道の線・なぞる動き・トースト）・atoms/molecules（DS v3 7章） | ui-ux-designer → frontend-developer | 部品のテスト・コントラストの測り直し | 部品の見本ページを2サイズ |
| **12 アプリの枠と初回の案内** | `RepositoryProvider`・TopBar・BottomActionBar・トーストの置き場・案内2ステップ（文言は PRD v3 N-01v3） | test-writer → frontend-developer | PRD v2 US-01 の受入条件（v3 の文言で） | 案内2枚×2サイズ |
| **13 ホームと検索** | ホーム（検索欄・種類チップ・お気に入りの先頭3本）・`SearchCombobox`・候補・0件・結果の一覧・`useHashState` | 同上 | PRD v3 US-02〜US-05。`search.spec.ts`・`privacy.spec.ts`（取得の URL に打った言葉が無い）。**この段階の Preview（`--target preview`）で CEO の iPhone 実機確認**（PRD v3 Q10: 保存場所・ファイル保存・フリック入力・VoiceOver・動きを減らす設定は段階14 の後にもう一度） | 検索の5状態（空・変換中・6件＋すべて見る・0件・キーボード分縮めた）×2サイズ |
| **14 道の詳細・なぞる地図・お気に入り** | `RouteMap`・`plan-trace`・`useRoadGeometry`・帯・リストの注意・♡・トースト・元に戻す・自分で追加した道の小さな地図 | 同上 | PRD v3 US-06〜US-08・US-17・US-19・US-20。`trace.spec.ts`・`favorites.spec.ts` の前半 | PRD v3 9章の S-04 の全状態（途中のコマを含む）×2サイズ |
| **15 お気に入りの一覧** | `/favorites/`（まとめ・チップ・都道府県・並び替え・記録がある道） | 同上 | PRD v3 US-09 | 0本・12本・絞り込み0件・記録がある道×2サイズ |
| **16 走行記録と下書き** | DriveForm（v2 のまま）・`useFormDraft`（formKey は 8.3）・お気に入りでない道の扱い | 同上 | PRD v3 US-10・US-11。保存が失敗しても入力が残る・再読み込みで戻る | v2 の3状態×2サイズ |
| **17 自分で追加・編集・削除** | 0件からの入口・RoadForm（v2）＋「追加して ♡」・リストに同じ名前の注意・連鎖削除・全削除 | 同上 | PRD v3 US-12・US-13 | 追加（名前入り・同名の注意）・削除の確認×2サイズ |
| **18 データ画面・お知らせ・PWA** | v2 のデータ画面＋「道のデータについて」（ODbL のリンク・版）・つかったきろく4つ・書き出しのお知らせ・manifest | 同上 | PRD v3 US-15・US-16・US-18・US-19。`catalog-files.spec.ts`・`transfer.spec.ts` | データ画面・読み込みの確認・失敗×2サイズ |
| **19 E2E 一式と品質の関門** | 9.4 の全部・axe・禁止語（画面＋リスト）・Geolocation なし・CSP 違反0件・外への通信0件 | test-writer／qa-engineer／devops-engineer | CI の e2e が緑・スキップ0件。キーボードだけで「検索→候補→♡→記録→書き出し」 | PRD v3 9章の表の全部 |
| **20 文書と公開** | README・v2 の文書への「v3 で一部置き換え」の注記・Vercel の Git 連携・main へ・本番で1回・CEO が Supabase を停止 → 削除 | content-creator／devops-engineer／CEO | 本番で「検索→♡→記録→書き出し→別のブラウザで読み込み」が通った記録 | 本番を iPhone 実機で（CEO） |

- **Gate 1 は段階16 の後に始めてよい**（探す・ためる・記録するが揃う）。書き出しの画面（段階18）までは、記録が消えても戻せないことを先に CEO に伝える。
- 段階4〜6（リスト）と段階7〜10（検索・保存）は、互いに待たない（見本のリストで進められる）。並べて進めてよい。
- **残りの約95本の承認**は、段階6 の後いつでも足せる（コードの段階を止めない）。Gate 1 の前に何本そろえるかは CEO が決める（PRD v3 Q3）。

---

## 11. リスク（ARCH v2 11章に足す）

| # | リスク | 対策 |
|---|---|---|
| R12 | 取り出しで名乗りに個人情報が入る（2026-10-10 に一度起きた） | 名乗りは定数だけ。送る前に検査して止める。テストで環境変数を空にしても同じ文字列（9.1） |
| R13 | Overpass が混んでいて取り出せない | ビルドは通信しないので、アプリの公開は止まらない。取り出しは60秒待って最大2回、だめなら後日 |
| R14 | OSM の道が途中で切れていて、1本にならない | `allowGaps` を人が決める。だめな道は失敗として報告し、geometry を書かない（アプリに入らない） |
| R15 | 打った言葉が URL のクエリに入り、サーバーに送られる | ハッシュに置く・`router.push` に入れない・E2E で全取得の URL を検査（6章） |
| R16 | 生成物の書きかえ忘れ・手での書きかえ | `generate.mjs --check` をビルドの最初に（C10） |
| R17 | リストの ID を変えて、記録の道が分からなくなる | `catalog-ids.txt` は足すだけ・CI で消えた行を止める（C4）・引退（3.5）・`snapshot`（8.2） |
| R18 | なぞる動きが iOS の Safari で `getTotalLength` などの都合で動かない | 段階14 の WebKit の E2E と、CEO の実機確認。だめなら動きを止めて全部描く（動きを減らす設定と同じ表示）に落とす |
| R19 | 索引が JS に入って大きくなる | 80KB 以下の検査（C12）。あとから読む（`import()`） |

---

## 12. ファイル構成（ARCH v2 12.3 に足す・直す）

```
apps/road-review/
├── data/
│   ├── road-catalog-draft.json        # AI draft (status: draft), with sources
│   ├── road-catalog.json              # approved + retired only; build input
│   ├── catalog-ids.txt                # append-only list of published ids
│   ├── geometry/{id}.json             # extracted, stitched, simplified (ODbL)
│   └── .osm-cache/                    # raw Overpass responses, reports, preview SVGs (gitignored)
├── scripts/
│   ├── catalog/extract-osm.mjs        # manual; Overpass, polite, cached
│   ├── catalog/generate.mjs           # build-time; offline; --check
│   ├── catalog/lib/{overpass-client,cache,assemble,simplify,geo,serialize}.mjs
│   ├── csp/{inject-meta-csp,verify-out,html-scripts}.mjs   # from ADR
│   ├── serve-static.mjs
│   └── ci/{assert-no-skips,assert-catalog-ids-append-only}.mjs
├── public/data/catalog/
│   ├── roads/{id}.json
│   ├── road-catalog-odbl.json
│   ├── LICENSE-ODbL.txt
│   └── README.txt
├── tests/fixtures/catalog/{mini-catalog.json, osm/*.json, README.txt}
└── src/
    ├── generated/catalog-index.json
    ├── app/(app)/
    │   ├── page.tsx + PageClient.tsx              # "/" home + search (hash state)
    │   ├── road/page.tsx + PageClient.tsx         # "/road/?id="
    │   ├── favorites/page.tsx + PageClient.tsx    # "/favorites/"
    │   ├── drives/{new,edit}/page.tsx + PageClient.tsx
    │   ├── roads/{new,edit}/page.tsx + PageClient.tsx   # custom roads only
    │   └── data/page.tsx + PageClient.tsx
    ├── features/
    │   ├── catalog/{useCatalogIndex.ts, useRoadGeometry.ts}
    │   ├── search/{useHashState.ts, useSearch.ts}
    │   ├── favorites/{useFavorites.ts, useFavoriteToggle.ts}
    │   └── (storage, roads, drives, drafts, safety, backup, usage — from ARCH v2)
    └── lib/
        ├── catalog/{schema.ts, catalog.data.test.ts}
        ├── search/{normalize.ts, romaji.ts, prefecture-readings.ts, build-index.ts, search.ts, highlight.ts}
        ├── trace/plan-trace.ts
        ├── roads/{resolve-road.ts, build-favorite-cards.ts, build-collection-stats.ts}
        └── (schema, storage, transfer, drafts, routes, result, constants, map, ratings, road-info, utils, validation)
```

- ESLint の `noData`（ARCH v2 12.4）に `@/lib/search/*`・`@/lib/catalog/*`・`@/generated/*` を足す（部品は props で受け取る）。

---

## 13. CEO に決めてほしいこと（ARCH 側）

PRD v3 12章の Q1〜Q11 が主。作りの側から足すのは次の2つだけ。

| # | 決めること | 推奨 | 理由 |
|---|---|---|---|
| A1 | 段階5 の最後に、Overpass へ本物の問い合わせ（3回）をしてよいか | **する**（CEO決定 2026-10-10 の1 の範囲。名乗りは定数・個人情報なし） | 本物の OSM の形でしか、つなぎ合わせが正しいか分からない |
| A2 | 取り出しの名乗りに入れる連絡先 | **アプリの公開 URL（`/data/` のページ）だけ**。メールアドレスは入れない | Overpass の方針は名乗りを求めるが、連絡先の種類は決めていない【推論・データ調査 5章】。グローバルルール「外部への通信に個人情報を入れない」 |

---

## 付録: 出典

- 静的書き出し・ハッシュ CSP・Vercel での確認・`--ignore-scripts`: `road-review-adr-static-export.md`
- OSM の中身・Overpass の利用方針・ODbL・点の数・ダグラス・ポーカー法の試算・地図の描き方: `research-road-search-data.md`
- 検索・IME（`isComposing` と `keyCode 229`）・コンボボックス・動きの長さと止め方: `ux-research-road-search.md`
- Next.js 16.3.6 の同梱 docs（`node_modules/next/dist/docs/`）: `static-exports.md`、`content-security-policy.md`、`use-search-params.md`（ARCH v2 付録のとおり）
- MDN: `String.prototype.normalize`（https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/normalize ）、`Element.animate`（https://developer.mozilla.org/ja/docs/Web/API/Element/animate ）、`SVGGeometryElement.getTotalLength`（https://developer.mozilla.org/ja/docs/Web/API/SVGGeometryElement/getTotalLength ）、`prefers-reduced-motion`（https://developer.mozilla.org/ja/docs/Web/CSS/@media/prefers-reduced-motion ）、`History.pushState`（https://developer.mozilla.org/ja/docs/Web/API/History/pushState ）
- ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/ ／ OSM 著作権: https://www.openstreetmap.org/copyright

## 付記（CTO決定・2026-10-10・段階4）
- C1 は**承認済みカタログ（`data/road-catalog.json`）だけ**に適用する。`data/road-catalog-draft.json` は CEO 確認用の資料で 3.3 の形ではない。段階6 の `generate.mjs` が、CEO が承認した行だけを 3.3 の形へ変換して承認済みカタログを作る。
- C5 の「読みをすべてローマ字にできるか」は段階7（`romaji.ts`）で追加する。段階4 ではひらがなと「ー」だけかを検査する。
- （段階5）Overpass の User-Agent は `road-review-catalog/<ver> (+https://github.com/hono840/collections)` とする（アプリの URL は未確定のため。個人情報を含めないことをテストで保証）。OSM の見本は `tests/fixtures/osm/`。区間の切り出しは cutFrom/cutTo のみ（bbox は使わない）。
