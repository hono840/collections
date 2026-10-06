# 公道レビュー（road-review）市場分析

- 作成: CSO（market-researcher と competitive-analyst の調査を統合）
- 調査日: 2026-10-06
- 表記ルール: 【事実】は出典URLに書かれている内容です。【推計】は自分で計算した数字で、計算の元も書いています。確認できなかったものは「未確認」と書いています。

---

## 結論

**作るべきです。** 日本には、名前のついた道を1本ずつ採点するレビューの仕組み（峠やスカイラインごとに、景色・路面などを点数で評価する仕組み）を持つアプリが、今回の調査範囲では見つかりませんでした。一方で「走った道を集める」タイプのアプリは2026年7月に続けて出ており、関心は高まっています。

ただし条件が1つあります。速度・タイム・ランキングを一切扱わない「法律の範囲内で楽しむ」設計にすることです。これを最初から決めておくことが前提です。

---

## 1. 市場概要

### 運転する人の数
- 【事実】2024年末の運転免許保有者は約8,174万人です。 https://www8.cao.go.jp/koutu/taisaku/r07kou_haku/zenbun/genkyo/h1/h1b1s2_3.html

### ドライブをする人
- 【事実】レジャー白書2025では、観光・行楽のうち「ドライブ」の参加率が30.2%で2位でした。年に平均14.5回行っています。1位は国内観光旅行で、参加率48.3%、参加人口4,680万人です。 https://www.travelvoice.jp/20250715-158067 / https://kyodonewsprwire.jp/release/202507142119
- 【推計】ドライブの参加人口は約2,930万人です。計算は「4,680万人 ÷ 48.3% × 30.2%」で、同じ調査の中の数字だけを使いました。
- 【事実】国内の宿泊旅行で使う交通手段は、自家用車が50.0%で1位です（じゃらん観光国内宿泊旅行調査2025）。 https://jrc.jalan.net/wp-content/uploads/2025/07/Jalasyuku2025Market_Trends.pdf

### バイク
- 【事実】2024年3月末の保有台数は、小型二輪（251cc以上）が191万8,542台で過去最高、軽二輪（126〜250cc）が211万6,890台です。 https://bestcarweb.jp/?p=1322226
- 【事実】バイクの使い道は「ツーリング」が50%で、上位に入っています（自工会 2023年度二輪車市場動向調査）。 https://www.jama.or.jp/release/docs/release/2024/20240417_2023Motorcycle.pdf
- 【推計】ツーリングをするライダーは約200万人です。計算は「126cc以上の約403万台 × 50%」です。この50%は原付も含めた全体の数字なので、少なめの見積もりです。
- 【事実】新車の出荷は2025年に36万1,990台で、前年の98.4%でした。ブームは一段落しています。 https://response.jp/article/2026/01/15/406049.html

### 関連するインフラ
- 【事実】道の駅は全国に1,231駅あります（2025年12月の第64回登録時点）。 https://www.mlit.go.jp/report/press/road01_hh_002138.html
- 【事実】国交省の「日本風景街道」には142ルートが登録されています（2019年3月時点の記載）。 https://www.mlit.go.jp/road/sisaku/fukeikaidou/index-map2.html
- 【事実】日本の峠は約3,773か所あるとされています。 https://young-machine.com/2025/05/19/647570/

---

## 2. ターゲットユーザー

| 人物像 | 根拠データ | 求めていること |
|---|---|---|
| **A. ベテランのツーリングライダー（中心）** | 新車バイクを買う人の平均年齢は55.5歳（2023年度）。 https://bestcarweb.jp/?p=869040 / 初めて行く場所の情報源は「ネット・SNS」が1位（高知工科大の調査、74人と少人数なので参考程度）。 https://www.kochi-tech.ac.jp/library/ron/pdf/2019/03/15/a1200471.pdf | 走った峠を記録に残したい。道の状態や通行規制を前もって知りたい |
| **B. 車でドライブする人（数が最も多い）** | ドライブ参加人口は約2,930万人【推計】。みんカラは180万ダウンロード。 https://apps.apple.com/jp/app/id346528801 | 景色、施設、冬に通れない時期の情報 |
| **C. 「全部走りたい」収集型マニア（少数だが熱心）** | 全国2,954の峠を回った本が出版されている。 https://www.nikkan-gendai.com/articles/view/life/261713 / 国道459路線の走破を管理する「おにコレ」がある。 https://mwm.ai/apps/app/6787720099 | 走った道の数を数えたい。制覇を目に見える形で残したい |

---

## 3. 需要シグナル（求められているサイン）

- **「全部回る」楽しみ方は、アプリとして成り立っています。**
  - 道の駅スタンプラリーの「みちめぐ」（1,227駅を収録）。 https://apps.apple.com/jp/app/id1667225050
  - 国道の走破を管理する「おにコレ」（Pro版は買い切り490円）。
  - 走った道で地図を塗りつぶす「ココドライブ!」（2026年7月公開）。 https://response.jp/release/prtimes/20260716/297545.html
- **ツーリングを後押しする仕組みが続いています。**
  - NEXCOは2026年4月1日〜11月30日に、ETC付きバイク向けの乗り放題プランを全22コースで実施しています。 https://www.e-nexco.co.jp/pressroom/head_office/2026/0324/00016046.html
- **自治体も道の駅スタンプラリーを主催しています**（長野県など）。 https://www.pref.nagano.lg.jp/michikanri/happyou/documents/2022sutanpu.pdf
- **通行規制の情報には需要があります。**
  - 冬の通行止めの解除日は、道ごとにバラバラです。例: ビーナスラインは2026年4月21日、磐梯吾妻スカイラインは4月下旬。
  - https://www.pref.nagano.lg.jp/suwaken/jigyo/documents/r8_suwa_press_toukiheisa_kaijo.pdf / https://www.pref.fukushima.lg.jp/sec/41035c/20221021-kankoudouro.html
- **既存の投稿型SNSは評価が低めです。**
  - モトクルのApp Store評価は2.9（738件）です。不満として、関係ない投稿や無断転載画像が挙がっています。 https://apps.apple.com/jp/app/id1347027399
- **未確認のもの**
  - Instagram・Xのハッシュタグ投稿数、ツーリングサポーターのダウンロード数、モトクルの会員数。

---

## 4. 競合一覧と比較表

### 主な競合
- **ツーリングサポーター（ナビタイムジャパン）**
  - バイク専用のナビです。編集部が選んだ「ツーリングロード」を370ルート超収録しています。
  - App Store評価は4.6（約2.9万件）。プレミアムは月600円・年5,700円です。
  - https://apps.apple.com/JP/app/id958072896
- **モトクル**
  - バイクの写真共有SNSです。ツーリングスポットは「地点」単位で投稿されます。
- **ツーリングスポッシェア（個人開発）**
  - 走った道を地図に描き、都道府県の制覇やバッジを集められます。月480〜980円で、評価件数は7件です。
  - https://apps.apple.com/jp/app/id1466607921
- **HondaGO RIDE / RISER**
  - 走行記録と共有ができます。 https://global.honda/jp/appli/hondago-ride/
- **ココドライブ! / おにコレ**
  - どちらも2026年に出た「集める」タイプです。制覇の単位は、ココドライブ!が都道府県、おにコレが国道です。
- **ツーリングマップル + アプリ「Route!」（昭文社）**
  - 紙の地図帳（3,300円）にアプリの利用コードがついています。 https://www.maruzenjunkudo.co.jp/products/9784398658500
- **calimoto**
  - カーブの多い道を優先してルートを作ります。区間の「楽しさ」をカーブの形から**自動で点数にする**機能（Calimeter）がありますが、ユーザーが評価するものではありません。利用者は300万人超です。
  - https://support.calimoto.com/hc/en-us/articles/9952945507484-The-Calimeter
- **REVER / Scenic / Kurviger**
  - 海外のバイク向けルートアプリです。REVERは200万ユーザー超（2023年）です。 https://businessden.com/?p=28758
- **Google マップ**
  - クチコミはお店やスポットが対象で、道路そのものは「問題の報告」しかできません。 https://serai.jp/?p=1063722
  - 移動履歴（タイムライン）はウェブ版が終わり、端末の中だけに保存されるようになりました。 https://www.techradar.com/phones/youve-got-more-time-the-great-google-maps-timeline-switch-gets-a-new-deadline-date
- **みんカラ**
  - 車好きのSNSです。峠ごとのまとめページはありますが、星評価や採点項目はなく「イイね!」だけです。 https://minkara.carview.co.jp/summary/2425/
- **SUBAROAD（スバル）**
  - 編集部が選んだドライブコースを、音声ガイドつきで案内します。 https://kuruma-news.jp/post/564524

### 比較表

| アプリ | 主な対象 | 道1本ずつのレビュー | 走行記録 | 制覇の要素 | 峠の一覧データ | 価格 | 規模 |
|---|---|---|---|---|---|---|---|
| **公道レビュー（自社案）** | 車+バイク | **あり（複数の観点で採点）** | あり | 峠・道単位 | 作る予定 | 未定 | — |
| ツーリングサポーター | バイク | なし（編集部のルート） | あり | なし | ルート集のみ | 月600円〜 | 評価約2.9万件 |
| モトクル | バイク | なし（地点投稿） | なし | なし | なし | 無料 | 評価738件 |
| ツーリングスポッシェア | バイク | なし（地点） | あり | 都道府県 | なし | 月480〜980円 | 評価7件 |
| ココドライブ! | 車中心 | なし | あり（自動） | 都道府県 | なし | 無料+課金 | 非公開 |
| おにコレ | 車・バイク | なし | 走破の管理 | 国道459路線 | なし | 買い切り490円 | 評価6件 |
| calimoto | バイク | 自動の点数のみ | あり（傾き角も記録） | なし | なし | 年59.99ユーロ | 300万人超 |
| REVER | バイク | なし | あり | なし | なし | 年39.99ドル | 200万人超 |
| Google マップ | 全般 | なし | 端末内のみ | なし | なし | 無料 | 非公開 |
| みんカラ | 車 | なし（まとめ+イイね!） | なし | なし | まとめページ | 無料 | 180万DL |

---

## 5. SWOT

| 強み | 弱み |
|---|---|
| 名前のついた道1本ずつを、景色・路面・道幅・交通量・施設・通行規制で採点する仕組みは、調べた範囲で前例がない | 最初は投稿がゼロで、中身が増えるまで価値が出にくい |
| 車とバイクの両方が対象（既存のアプリはほぼどちらか一方） | 峠や道の名前と区間をまとめたデータを、自分で作る必要がある（峠は約3,773か所） |
| 自分専用の「制覇の記録」として、1人でも楽しめる | ナビ機能ではNAVITIMEやYahooに勝てない（勝負する場所にしない） |
| 速度を扱わないので、App Storeの審査に通りやすい | 個人開発なので、不適切な投稿を見張る手間をかけにくい |

| 機会 | 脅威 |
|---|---|
| Googleタイムラインが端末内保存になり、走った道の履歴を残す場所がなくなった人がいる | NAVITIMEが370ルートにユーザー評価を足せば、すぐ真似できる |
| 「集める」タイプのアプリが続けて出ており、関心が高まっている | 暴走行為と結びつけられる評判の危険 |
| 二輪の通行規制や冬の通行止めの情報が、あちこちに散らばっている | 規制情報が古いままだと信用を失う |
| 日本風景街道の142ルートを、最初に載せるデータの候補にできる（再利用してよいかは未確認） | ココドライブ!やおにコレが、峠単位まで機能を広げる可能性 |

---

## 6. 差別化の推奨切り口

1. **道1本ずつ × 複数の観点で採点するレビュー**
   - 景色・路面・道幅・交通量・施設・通行できる時期を点数にします。
   - 既存のサービスは「地点」「都道府県」「編集部のおすすめ」「自動の点数」のどれかで、ユーザーが道そのものを採点する形はありません（4章の出典）。
2. **峠・スカイライン単位の「制覇コレクション」**
   - 既存アプリの制覇は、都道府県単位か国道単位です。名前のついた峠や観光道路を数える仕組みは見つかりませんでした。
3. **道ごとの「通行ルール」をまとめて見せる**
   - 二輪の通行止め、夜間の通行止め、冬の閉鎖、有料かどうかを、道のページにまとめます。
   - 例: 奥多摩周遊道路は夜間通行止め。 https://tabi-mag.jp/tk1370/
   - 二輪の通行止めは全国に約450か所あります。 https://young-machine.com/2019/06/18/37184/
   - これは安全面での印象づけにもなります。

補足:
- 車とバイクの両方の目線を、1つのアプリで分けて見せることも差別化になります。
- 記録を外に書き出せる機能（データを自分で持てること）も、Googleタイムラインからの乗り換え先として役立ちます。

---

## 7. リスク（法的・安全面含む）

### 安全・法律
- 【事実】Appleの審査ガイドライン1.4.4は、速度の出しすぎなど危険な運転をあおるアプリを禁止しています。 https://developer.apple.com/app-store/review/guidelines/
- 【事実】自転車・ランニングアプリのStravaでは、区間タイムのランキングに車やバイクの記録が入り込みました。乗り物の記録は大量に削除されています。 https://the5krunner.com/2025/05/21/strava-removed-cars-leaderboard / https://road.cc/content/news/strava-koms-are-being-hijacked-112mph-motorbikers-296049
- 【事実】共同危険行為（2台以上で連なって危険な走り方をすること）は道路交通法68条で禁止されています。違反点数は25点で、一発で免許取り消しです。仲間同士のツーリングでも対象になりえます。 https://www.webcartop.jp/?p=1234253
- 【事実】茨城県警は筑波山周辺でドリフトをする集団を検挙しています。 https://kuruma-news.jp/post/1108123
- 【事実】箱根峠では深夜のスピード超過による事故があり、すべり止め舗装などの対策が取られています。 https://www.cbr.mlit.go.jp/shizukoku/upload/0608_1.pdf
- 【事実】京都府では、ツーリング中のバイク単独事故の約57%が重傷か死亡でした（2019〜2023年）。 https://www.pref.kyoto.jp/fukei/kotu/koki_k_t/bike/nirin_jikoboshi.html

### 守るべき設計ルール（上の事実から決めた方針）
- 速度・タイム・傾き角・ランキングは、表示も保存もしない。
- 採点項目に「攻めがいがある」のような、速度を連想させる言葉を使わない。
- 規制情報や「法律の範囲内で楽しむ」という方針を、アプリの目立つ場所に出す。
- 投稿のルールに、危険な運転をすすめる内容の禁止を書き、通報機能をつける。

### 事業面のリスク
- 最初は投稿が少なく、レビューとしての価値が出にくいです。そこで「自分の記録帳」として1人でも役立つことを最優先にします。
- 道路データを作る手間がかかり、規制情報も古くなっていきます。そこで最初の道は数を絞り、情報には「いつ確認したか」の日付を表示します。
- 大手（NAVITIME）に真似される危険があります。速さで勝負せず、制覇の記録と車・バイク両方のレビューで差をつけます。

### 未確認の項目
- 日本風景街道のデータを再利用してよい条件。
- ツーリングサポーターとモトクルの利用者数。
- NEXCOのバイク向け割引の2025年の利用件数（要約記事にしか出ておらず、元の資料で確かめられていない）。

---

## 8. 収益化の参考（実際の掲載価格）

| サービス | 価格 |
|---|---|
| ツーリングサポーター プレミアム | 月600円 / 年5,700円 |
| ツーリングサポーター プレミアムプラス | 月1,000円 / 年9,800円 |
| おにコレ Pro | 買い切り490円 |
| ツーリングスポッシェア | 月480〜980円 |
| ココドライブ! / モトクル / みんカラ | 無料 |

- 【推計】ナビ機能のない記録・レビューアプリは、ナビ込みで月600円のツーリングサポーターより安くしないと、比べられたときに選ばれにくいです。目安は買い切り500円前後です。おにコレの490円とツーリングサポーターの600円が根拠です。

---

## 9. 出典
- https://www8.cao.go.jp/koutu/taisaku/r07kou_haku/zenbun/genkyo/h1/h1b1s2_3.html
- https://www.travelvoice.jp/20250715-158067
- https://kyodonewsprwire.jp/release/202507142119
- https://jrc.jalan.net/wp-content/uploads/2025/07/Jalasyuku2025Market_Trends.pdf
- https://bestcarweb.jp/?p=1322226
- https://bestcarweb.jp/?p=869040
- https://www.jama.or.jp/release/docs/release/2024/20240417_2023Motorcycle.pdf
- https://response.jp/article/2026/01/15/406049.html
- https://www.mlit.go.jp/report/press/road01_hh_002138.html
- https://www.mlit.go.jp/road/sisaku/fukeikaidou/index-map2.html
- https://young-machine.com/2025/05/19/647570/
- https://young-machine.com/2019/06/18/37184/
- https://www.kochi-tech.ac.jp/library/ron/pdf/2019/03/15/a1200471.pdf
- https://www.nikkan-gendai.com/articles/view/life/261713
- https://apps.apple.com/jp/app/id1667225050
- https://mwm.ai/apps/app/6787720099
- https://response.jp/release/prtimes/20260716/297545.html
- https://www.e-nexco.co.jp/pressroom/head_office/2026/0324/00016046.html
- https://www.pref.nagano.lg.jp/michikanri/happyou/documents/2022sutanpu.pdf
- https://www.pref.nagano.lg.jp/suwaken/jigyo/documents/r8_suwa_press_toukiheisa_kaijo.pdf
- https://www.pref.fukushima.lg.jp/sec/41035c/20221021-kankoudouro.html
- https://apps.apple.com/JP/app/id958072896
- https://apps.apple.com/jp/app/id1347027399
- https://apps.apple.com/jp/app/id1466607921
- https://apps.apple.com/jp/app/id346528801
- https://global.honda/jp/appli/hondago-ride/
- https://www.maruzenjunkudo.co.jp/products/9784398658500
- https://support.calimoto.com/hc/en-us/articles/9952945507484-The-Calimeter
- https://businessden.com/?p=28758
- https://serai.jp/?p=1063722
- https://www.techradar.com/phones/youve-got-more-time-the-great-google-maps-timeline-switch-gets-a-new-deadline-date
- https://minkara.carview.co.jp/summary/2425/
- https://kuruma-news.jp/post/564524
- https://developer.apple.com/app-store/review/guidelines/
- https://the5krunner.com/2025/05/21/strava-removed-cars-leaderboard
- https://road.cc/content/news/strava-koms-are-being-hijacked-112mph-motorbikers-296049
- https://www.webcartop.jp/?p=1234253
- https://kuruma-news.jp/post/1108123
- https://www.cbr.mlit.go.jp/shizukoku/upload/0608_1.pdf
- https://www.pref.kyoto.jp/fukei/kotu/koki_k_t/bike/nirin_jikoboshi.html
- https://tabi-mag.jp/tk1370/

---

## CSOメモ（PDCAの記録）
- 2つの調査はどちらも1回目で承認。CSOが統合時に不足点を修正。
  - 調査間で食い違った項目は確実な方の出典を採用（Route!の価格は書籍ページ、道の駅の数は国交省の1,231駅）。
  - 同じ記事が2つの日付の出来事の出典になっていた箇所は、確実に言える内容だけを残した。
- 3章・7章の「未確認の項目」は、PRD確定前に追加確認を推奨。
