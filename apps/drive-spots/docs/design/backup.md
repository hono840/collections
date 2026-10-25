# バックアップ 見た目の仕様（AC30〜AC40）

- 書いた日: 2026-10-25 ／ 書いた人: ui-ux-designer
- 原本 `Main.dc.html` にバックアップの画面は無い。原本にある部品だけで組み立てる（詳細画面の戻るボタン・一覧の見出し・`InfoTile`・`PrimaryButton`・削除の文字ボタン・AC15 のお知らせの箱）。
- 新しい色・フォント・角丸・影・動きは足さない。`globals.css` は変えない（使うのは今のトークンと Tailwind の標準の値だけ）。

## 決めたこと（ひとこと）

ふだんの「バックアップ」は目立たない灰色の文字ボタン。書き出しが必要なときだけ、右上にオレンジの小さな丸が付く。車のメーターの「点検ランプ」と同じ考えで、赤（危ない）ではなくオレンジ（そろそろ見て）。バックアップ画面は、書き出す＝オレンジで塗る、読み込む＝枠だけ、置き換える＝赤っぽい枠、と形と色で役目を分ける。

## 1. 一覧の見出しと「バックアップ」ボタン（AC31・AC38・AC40）

- 小さな英字を「DRIVE SPOTS」、見出しを「ドライブスポット帳」に変える。見た目のクラスは今のまま。
- 見出しと同じ行の右端に「バックアップ」。13px・`font-medium`・`text-ink-soft`（追加画面の「キャンセル」と同じ灰色）。文字だけのボタンで高さ 44px。文字の右端は下のタブの右端にそろえる（メモの「編集」と同じ `-mr-2`＋`px-2`）。`-my-1` で、ボタンを置いても見出しの行の高さ（見出しの位置）は変えない。
- 13px の理由: 幅 375px の iPhone でも見出し（約239px）と1行に並ぶ（239＋4＋86＝329 ≦ 335px）。14px だと 375px で2行に落ちる。360px などもっと狭い画面では、ボタンだけ次の行の右へ下がる（`flex-wrap`＋`ml-auto`）。見出しは折り返さない。
- 印（'never' と 'stale'）: 文字の右上に直径 8px のオレンジの丸。「プ」の「゜」に重ならないよう 2px 離す。2つの場合で見た目は同じ（日付はバックアップ画面で見る）。赤（`danger`）は使わない。データが消えたわけではないので、こわがらせない。
- 色だけに頼らない: 印は「丸があるか無いか」という形の違い。読み上げ名は AC38 のとおり `aria-label` で付け、どれも見えている「バックアップ」で始まる（WCAG 2.5.3）。丸は `aria-hidden`。丸は背景色ではなく `border-4` で塗る（Windows のハイコントラスト表示では背景色は消えるが、枠の色は残るため）。

## 2. 2つのお知らせ（AC30・AC39）

- 新しい版のお知らせ（AC30）: AC15 と同じ場所・同じ箱（チップの下、カードの上）。文だけ入れ替える。2行になるので行間 1.6（`leading-note`）を足す（AC15 も同じ見た目になる）。`role="status"` は今のまま。
- 復元の案内（AC39）: 同じ場所に、箱なし・灰色・12px。「保存できない」という注意（色つきの箱）と「ちょっとした案内」（箱なし灰色）を見た目で分ける。2つは同時には出ない。role は付けない。中の「バックアップ」はリンクにしない（押せる物が同じ名前で2つあると迷うため）。

## 3. バックアップ画面（BackupScreen）

上から順に。入り切らない分は中だけスクロールする（詳細画面と同じ）。
1. 上の帯: 詳細画面と同じ戻るボタン（左向き矢印・44px・読み上げ名「一覧にもどる」）。
2. 見出し h1「バックアップ」: 一覧の見出しと同じ 26px・太字。
3. 説明（14px・行間 1.6・`text-ink-muted`）、2段落:「スポットの記録をファイルに書き出しておくと、データが消えたときに、そのファイルを読み込んで元にもどせます。」「ファイルは、この端末のダウンロード先に保存されます。このアプリは、データをどこにも送りません。」— 「端末の外に出ない」とは書かない。iPhone の Safari は設定でダウンロード先を iCloud Drive にできる（Apple サポート「Customize your Safari settings on iPhone」）。言い切れるのは「アプリは送らない」まで。
4. 「最後に書き出した日」: `InfoTile` をそのまま（詳細の「地域」の箱と同じ見た目）。
5. 「ファイルに書き出す」: `PrimaryButton tone="accent"`（オレンジで塗った 56px）。この画面でいちばん勧める操作。
6. 「ファイルから読み込む」: 見た目は `PrimaryButton` の outline と同じ枠だけの 56px。中身は本物の `input type="file"`。透明にしてボタンの形いっぱいに重ねる（押せる範囲・読み上げで触れる範囲が 56px になる）。名前は `label` で付ける。フォーカスの線は `label` 側に出す（全体ルールと同じオレンジ 2px・2px 離す）。
7. エラー: 読み込むボタンのすぐ下。13px・行間 1.6・`text-danger`（追加画面のエラーと同じ色と大きさ）。
8. 中身の確認（AC35）: `bg-panel`・角丸 14px の箱。上から「…に書き出したファイル」（13px・灰色。メモの見出しと同じ）→「行きたい N / 行った N」（`font-display` 18px 太字。数字がタブと同じ Barlow になる）→「いまのデータ（…）は、…置き換わります。」（14px・行間 1.6・`text-ink`）→「置き換える」→「やめる」。
   - 「置き換える」: `PrimaryButton` に `tone="danger"` を足す（枠と文字が `danger`・塗りなし）。塗った「書き出す」と形も色も違う。赤で塗ると強すぎるので枠だけ。この箱そのものが確認なので `window.confirm` は出さない。
   - 「やめる」: 詳細の削除と同じ文字ボタン（高さ 48px・15px）。色は `text-ink-soft`。
9. 完了（AC36）: 確認の箱があった場所に、AC15 と同じ形の箱でチェックの印＋「読み込みました（行きたい N / 行った N）」。14px・太字・`text-done`（青＝このアプリで「できた」の色）。印と文があるので色だけに頼らない。

## 4. フォーカスと読み上げ

| とき | フォーカス | 読み上げ |
| --- | --- | --- |
| 画面に入る | 見出し「バックアップ」（`tabIndex={-1}`、ほかの画面と同じ） | 見出しが読まれる |
| 書き出す | ボタンに残る | 「最後に書き出した日」の箱を `role="status"`＋`aria-atomic="true"` で包む。日付が変わると読まれる |
| 読み込み失敗 | ファイル入力に残る（選ぶ画面を閉じると自然に戻る） | エラーは `role="alert"`。入力から `aria-describedby` でつなぐ |
| 読み込み成功 | 確認の箱の見出し（h2・`tabIndex={-1}`）。箱を `scrollIntoView({ block: 'nearest' })` で「やめる」まで見せる | フォーカスで読まれる。「置き換える」には置かない（Enter の押しまちがい防止） |
| やめる | ファイル入力 | — |
| 置き換える | 完了の文（`tabIndex={-1}`） | フォーカスで読まれる。role は付けない（2回読まれるのを防ぐ） |
| 一覧にもどる | 一覧の「バックアップ」ボタン（推奨。今の `SpotListScreen` にこの prop は無いので、足すかは設計側で決める。足さないなら今と同じ見出し） | — |

## 5. クラス（そのまま使う）

```tsx
<div className="flex flex-wrap items-center gap-x-1">{/* 一覧: 見出しの行。DRIVE SPOTS の p はこの上（今のまま） */}
  <h1 /* 今のまま */ className="text-26 font-bold tracking-title focus:outline-none">ドライブスポット帳</h1>
  <button type="button" aria-label={backupLabel} className="relative -my-1 -mr-2 ml-auto h-11 shrink-0 bg-transparent px-2 text-13 font-medium text-ink-soft">
    バックアップ{showMark ? <span aria-hidden="true" className="absolute -right-0.5 top-3 size-2 rounded-full border-4 border-accent" /> : null}
  </button>
</div>
<p role="status" className="mx-5 mb-3 rounded-xl bg-panel px-3.5 py-2.5 text-12 leading-note text-danger">{notice}</p>{/* AC15/AC30 */}
<p className="mx-5 mb-3 text-12 leading-note text-ink-muted">前に使っていたデータは「バックアップ」から読み込めます</p>
{/* BackupScreen: 上の帯・戻るボタン・スクロールする入れ物は SpotDetailScreen と同じクラス。入れ物の中: */}
<div className="flex flex-col gap-2">{/* h1: "text-26 font-bold tracking-title focus:outline-none" ／ 説明の p: "text-14 leading-note text-ink-muted" */}</div>
<div className="flex flex-col gap-2.5">{/* <div role="status" aria-atomic="true"><dl><InfoTile …/></dl></div> ＋ PrimaryButton accent */}</div>
<div className="flex flex-col gap-3">
  <div className="relative">
    <input type="file" accept="application/json,.json" id={fileInputId} className="peer absolute inset-0 size-full cursor-pointer opacity-0" />
    <label htmlFor={fileInputId} className="flex h-14 w-full items-center justify-center rounded-2xl border border-edge-chip text-16 font-bold text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">ファイルから読み込む</label>
  </div>
  {/* エラー p: "text-13 leading-note text-danger" ／ 確認の箱: "flex flex-col gap-4 rounded-tile bg-panel p-4"
      h2: "text-13 font-medium text-ink-muted focus:outline-none" ／ 件数: "font-display text-18 font-bold" ／ 文: "text-14 leading-note text-ink"
      ボタンの塊: "flex flex-col"（置き換える＋ やめる: "h-12 bg-transparent text-15 font-medium text-ink-soft"）
      完了 p: "flex items-center gap-2 rounded-xl bg-panel px-3.5 py-3 text-14 font-bold text-done focus:outline-none" ＋ <Icon name="check" size={18} strokeWidth={2.6} /> */}
</div>
```

- `PrimaryButton` に足す tone: `danger: 'border border-danger bg-transparent text-16 text-danger'`（outline と同じ形）。件数「行きたい N / 行った N」は1つの文字のまま `font-display` をかける（日本語は Zen にもどる）。数字だけ span に分けると `getByText` で文が見つからなくなるため。

## 確かめること

- 【推論】幅の計算はカナ・漢字が1文字＝1em の前提。375px と 390px で見出しとボタンが1行に並ぶか、丸の位置（`top-3`）が文字の右上に来るかをブラウザで見る。
- 同じエラーが続いたときも読まれるよう、エラーの要素は選び直すたびに作り直す（`key` を変える）。同じファイルを選び直せるよう、読んだあとに入力の値を空にする。
- 色の見やすさ（計算値）: 灰色のボタン文字 約12:1、オレンジの丸 約7.3:1、`danger` の文字 箱の上 約7.6:1・背景の上 約8.3:1、説明の灰色 約8:1、完了の青 約7.1:1。どれも 4.5:1 以上。
