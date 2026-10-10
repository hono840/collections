テスト用の見本（道のリスト）

- valid-root/ : 正しい見本。アプリの置き場所（data/・public/data/catalog/・src/generated/）と同じ形。
  catalog.data.test.ts の検査（C1〜C9・C11・C12）が全部通ることを確かめる。
- broken/*.json : わざと壊したリスト（下書きが混ざる・未確認の注意・乗鞍・禁止語・ID の重複・二輪の印に出典がない）。
  schema.test.ts で、承認済みとして断られることを確かめる。

道の形（geometry）の座標は、テストのために作った点の列で、OpenStreetMap の本物のデータではない。
名前・ID・出典 URL も見本で、アプリの承認済みリストではない。

Test fixtures. Coordinates are synthetic (not copied from OpenStreetMap).
