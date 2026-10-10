取り出しスクリプト（scripts/catalog/）のテスト用の見本

- linear-reversed.json : 3本の way が1本につながる。102 は点の並びが逆、並び順もばらばら。
- dual-branch-path.json : 上り下りが別の線（201 と 202）、駐車場への枝（203）、山道の近道（204 highway=path）、
  excludeWays で外す近道（206）、林道（207 highway=track。外さない）、道でない線（208 waterway）。
- gap.json : 2つの切れた線（つなぎ目の点がない。約221m 離れている）。
- catalog.json : 上の3つを問い合わせる見本の道のリスト（src/lib/catalog/schema.ts の形）。

座標・点の ID・way の ID・名前はすべてテストのために作ったもので、OpenStreetMap の本物のデータではない
（ODbL のデータを含まない）。出典 URL も見本（example.com）。

Synthetic fixtures for scripts/catalog tests. Not OpenStreetMap data.
