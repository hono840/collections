# 調査: ログインなし・ブラウザ内保存（ローカル保存）にしたとき、データは消えないか

- 作成: 2026-10-08（調査担当サブエージェント）
- 深さ: L2（判断用）。`docs/org/research/07-research-methodology.md` の作法に従う
- 表記: 【事実】＝出典に書いてある（または公開ソースコードで確かめた）／【推論】＝根拠から考えたこと／【未確認】＝確かめられていない
- 前提: road-review（Next.js 16.3.6 / Vercel）を「ログインなし・サーバーにデータを置かない・スマホ優先・JSON の書き出し/読み込みあり」に切り替える。利用者は週末に運転するので、**7日以上アプリを開かないことが普通にある**。

> **この報告の限界（先に書く）**
> 1. Web ページの取得ツールは本文を小さな AI に要約させて返す。要約を挟んだ箇所は、可能な限り **元の文章（MDN の GitHub 原稿）や公開ソースコード（WebKit / Chromium）を直接ダウンロードして**確かめた。
> 2. このセッションでは Web 検索の上限に達しており、検索での「反対の証拠探し」は十分にできなかった。代わりにソースコードの変更履歴（コミット）を読んだ。
> 3. WebKit（Safari の中身）はオープンソースだが、**Safari 本体がどの設定値で動かしているかは公開されていない**。ソースコードから分かるのは「仕組み」まで。
> 4. 実機（iPhone / Android）での動作確認はしていない。

---

## 0. 結論（中学生向けに）

**ゴール**: 利用者が記録した道路・走行ログを「勝手に消えない」ようにすること。

→ **そのために一番の敵は iPhone の Safari**。Safari は「**Safari を使った日が7日分たまる間に、そのサイトを一度も触らなかったら、サイトが保存したデータを全部消す**」というルールを持っている【事実】。週末だけ使う人は、平日に Safari でほかのサイトを見ているだけで、この7日を超える可能性が高い【推論】。

→ **そのために「ホーム画面に追加」して使ってもらう**。ホーム画面から開くアプリ（Web アプリ）は、この削除ルールの対象外として扱われる【事実：Apple/WebKit の公式ブログ＋ WebKit のソースコード】。

→ **さらに「保存してね」と頼む命令（`navigator.storage.persist()`）は、Safari のタブでは効かない**。WebKit のソースコードでは「もともと削除対象外のサイト（ホーム画面アプリなど）にだけ OK を返す」作りになっている【事実：ソースコード】。つまり persist() は「抜け道」ではない。

→ **それでも最後の命綱として JSON の書き出し（バックアップ）を必須にする**。端末の故障・機種変更・ブラウザのデータ消去・プライベートブラウズでは、どの方法でもデータは消えるため。

**おすすめ構成（要点）**
1. 保存先: 数百件・文字だけなら **localStorage でも足りる**（上限 約5MiB）。写真を入れる予定があるなら最初から **IndexedDB**。どちらを選んでも Safari の7日ルールの対象は同じ（どちらも消える）。
2. iPhone では「ホーム画面に追加」を強く案内する（Safari の「共有」→「ホーム画面に追加」）。iOS 26 からは、追加したサイトは基本的に Web アプリとして開く【事実】。
3. 書き出しは「**ファイルとしてダウンロード**」を基本にする。Web Share（共有シート）でファイルを送る方法は、**Android の Chrome では `.json` が送れない**【事実：Chromium ソースコード】ので、補助扱いにする。
4. 読み込みは `<input type="file" accept="application/json,.json">`。

---

## 1. Safari / WebKit の「7日で消える」ルール

### 1.1 ルールの正確な中身
- 【事実】2020-03-24、WebKit 公式ブログが発表。iOS / iPadOS 13.4 と macOS の Safari 13.1 から、**「Safari を7日使う間に、そのサイトでユーザーの操作（タップ・クリック）がなければ、そのサイトがスクリプトで書き込んだ保存データを全部消す」**。
  対象: **IndexedDB / localStorage / メディアキー / sessionStorage / Service Worker の登録とキャッシュ（Cache API）**。
  出典: <https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/>
- 【事実】MDN（2026年時点の原稿）も同じ内容: 「クロスサイトトラッキング防止がオンのとき、**直近7日間のブラウザ使用中に**クリックやタップなどの操作がなかったサイトは、スクリプトで作ったデータが消える。サーバーが設定した Cookie は対象外」。
  出典: <https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria>（GitHub の原稿 `files/en-us/web/api/storage_api/storage_quotas_and_eviction_criteria/index.md` 176行目を直接確認）
- 【事実】「7日」は**カレンダーの7日ではなく、ブラウザを使った日（operating dates）の7日分**。WebKit のソース `ResourceLoadStatisticsStore.cpp` に `operatingDatesWindowShort { 7 }`（日）と `operatingDatesWindowLong { 30 }`（日）が定義されている。
  出典: <https://github.com/WebKit/WebKit/blob/main/Source/WebKit/NetworkProcess/Classifier/ResourceLoadStatisticsStore.cpp>
  - 【推論】つまり「Safari を毎日使う人」なら約1週間、「Safari をめったに開かない人」ならもっと長く持つ。週末だけ road-review を開き、平日は Safari でニュース等を見る人は、7日分を超えやすい。

### 1.2 反対の証拠（30日になっている可能性）
- 【事実】2024-02 の WebKit の変更（コミット 4506123001「Introduce DataRemovalFrequency…」）で、削除の間隔に「短い＝7日」「長い＝30日」の2種類が作られた。コミット説明では「**現在の動作は変えない。AllButCookies モードでは、従来どおり7日で消す**」と書かれている。
- 【事実】ただし現在のソースコードの判定（`shouldRemoveAllButCookiesFor`）を読むと、「短い」の印が付いていないサイトには30日の窓を使う書き方になっている。
- 【未確認】Safari 本体がどのモード・設定で動いているかは非公開。**Apple の公式文書で「7日ルールをやめた／30日にした」という発表は見つけられなかった**（ただし検索上限のため探し切れていない）。MDN も今も「7日」と書いている。
- → **設計は「7日で消える」と考えて作るのが安全**【推論】。

### 1.3 iOS / iPadOS 17〜26、macOS での現状
- 【事実】このルールを実装しているコード（`registrableDomainsToDeleteOrRestrictWebsiteDataFor`）は、2026年10月時点の WebKit の main ブランチにも残っている。
- 【未確認】iOS 17〜26 それぞれの Safari で実際にどう設定されているかを、Apple の文書で版ごとに確かめることはできなかった。
- 【事実】ルールは「クロスサイトトラッキング防止」がオンのときに働く（MDN）。この設定は既定でオン。利用者が設定でオフにすることもできるが、それを前提にはできない【推論】。
- 【事実】参考: 2026-05 に WebKit に「**トラッキング防止をオフにしている人向けに、180日使われていないサイトのデータを消す**」仕組みが追加された。ただし「既定ではオフ」とコミット説明にある（コミット 4fb2a0985c）。persist 済みのサイトは対象外。

### 1.4 ホーム画面の Web アプリは対象外
- 【事実】2020年の WebKit 公式ブログ: ホーム画面に追加した Web アプリは Safari の一部ではなく、**自分専用の「使用日数カウンター」を持つ**。アプリを使えばカウンターがリセットされるので、自分のサイトのデータが消えることは想定されていない。（上記 10218 の記事）
- 【事実】web.dev（Google、2024-09-23 更新）も「この削除ルールはホーム画面に追加された PWA には適用されない」と書いている。<https://web.dev/articles/storage-for-the-web>
- 【事実】WebKit のソースコードでは、削除対象外リスト `domainsExemptFromWebsiteDataDeletion()` に **「単独起動アプリ（standalone application）のドメイン」** が入っており、コメントに「ホーム画面の Web アプリ、App-Bound Domains など」とある。
- 【事実】iOS 26 / iPadOS 26 からは、**ホーム画面に追加したサイトは、既定ですべて Web アプリとして開く**（manifest がなくても）。利用者が「Web アプリとして開く」をオフにした場合は、ただのブックマーク（Safari で開く）になる。
  出典: <https://webkit.org/blog/17333/webkit-features-in-safari-26-0/>
  - 【推論】ブックマークとして追加された場合は Safari で開くので、7日ルールの対象のまま。案内文で「Web アプリとして開く」をオンのままにするよう伝えるとよい。
- 【未確認】**ホーム画面アプリと Safari タブのデータは共有されない（別の保存場所）**と広く言われているが、Apple の公式文書では確認できなかった。もし別なら、「Safari で使い始めた後にホーム画面に追加すると、データが空に見える」ことになる。→ **最初の画面でホーム画面追加を案内し、移行には JSON 書き出し→読み込みを使う**のが安全【推論】。

### 1.5 `navigator.storage.persist()` は Safari で効くか
- 【事実】Safari が `persist()` を持ったのは **Safari 15.2**（MDN の互換性データ browser-compat-data。iOS 版も同じ番号）。`navigator.storage.estimate()` は Safari 17。
- 【事実】WebKit 公式ブログ（2023-08-10、Safari 17）: 「persistent モードのサイトは（容量不足による）削除から除外されうる」。<https://webkit.org/blog/14403/updates-to-storage-policy/>
- 【事実】**ただし、persist() が OK になる条件**は WebKit のコミット fb634d8ebf（2023-05、タイトル「**Allow origin to be persisted if it is exempt from ITP deletion**」＝ITP の削除対象外のサイトだけ persist を許す）で決まっている。現在のソース `NetworkStorageManager::persistOrigin()` も、**削除対象外リストに入っていないサイトには false を返し、persist の印を消す**。
  出典: <https://github.com/WebKit/WebKit/blob/main/Source/WebKit/NetworkProcess/storage/NetworkStorageManager.cpp>
- → **結論**: Safari のタブで persist() を呼んでも、7日ルールから逃れる手段にはならない【事実＋推論】。ホーム画面アプリでは true が返ると考えられるが、それは「もともと対象外だから」【推論】。MDN の「Safari はユーザーの利用履歴をもとに自動で許可/拒否する」という書き方は大まかすぎる。
- 【推論】それでも persist() は呼んで損はない（Chrome では効くし、ホーム画面アプリでは容量不足での削除も防げる）。

### 1.6 iOS のほかのブラウザ（Chrome / Edge など）と EU・日本
- 【事実】Apple の審査ガイドライン 2.5.6: 「Web を表示するアプリは WebKit を使うこと。EU と日本では別エンジンを使う許可を申請できる」。<https://developer.apple.com/app-store/review/guidelines/>
- 【事実】EU: iOS 17.4 以上（iPadOS は 18 以上）で別エンジンのブラウザが許される。<https://developer.apple.com/support/alternative-browser-engines/>
- 【事実】日本: **iOS 26.2 以上**で、日本の利用者向けに WebKit 以外のエンジンが使える。<https://developer.apple.com/support/app-distribution-in-japan/>
- 【事実】iOS 14 以降、WKWebView を使う全アプリで ITP が既定でオン。ブラウザ用の権限を持つアプリは、利用者が設定で ITP をオフにできる。<https://webkit.org/blog/10882/app-bound-domains/>
- 【未確認】iOS 版 Chrome（WebKit 版）で7日ルールが Safari と全く同じ条件で働くか、また日本で実際に別エンジン版の Chrome が配布されているかは確認できなかった。
- 【推論】**iPhone ではどのブラウザでも「消える前提」で作る**のが安全。

---

## 2. Chrome / Android の削除ルール

- 【事実】Chrome には Safari のような「7日で消す」ルールは**ない**。消えるのは主に「端末の空き容量が足りなくなったとき」で、**最後に使われたのが古いサイトから順に（LRU）**、サイト単位でまとめて消す。persist 済みのサイトは飛ばされる。（MDN、web.dev）
- 【事実】web.dev: 「Chrome が自動でデータを消すことは**とてもまれ**。利用者が手動で消すほうがずっと多い」。<https://web.dev/articles/persistent-storage>
- 【事実】Chrome の persist() は**ダイアログを出さず自動判定**。判断材料は「サイトへの関わり度（site engagement）」「インストール済みかブックマーク済みか」「通知の許可」。重要と判断されれば許可、そうでなければ黙って拒否。（web.dev）
- 【事実】web.dev の推奨: ページを開いた瞬間ではなく、**大事なデータを保存する操作のとき**に persist() を頼む。

## 3. 容量（どれくらい入るか）

| 環境 | 1サイトあたりの上限 | 出典 |
|---|---|---|
| Chrome（Android 含む） | ディスク全体の **約60%**（persist の有無に関係なく） | MDN |
| Chrome シークレットモード | 約5%（web.dev の記載） | web.dev |
| Safari 17 以降（iOS 17+ / macOS 14+） ブラウザアプリ | ディスク全体の **約60%**、全サイト合計で80% | WebKit ブログ 14403、MDN |
| 他アプリ内の WebView | 約15%（合計20%） | 同上 |
| ホーム画面 Web アプリ | ブラウザアプリと同じ（約60%） | WebKit ブログ 14403 |
| Safari 16 以前 | 最初 1GiB、超えると許可を求める | MDN |
| localStorage（全ブラウザ） | **約5MiB**（sessionStorage と別に5MiB） | MDN |

- 【事実】プライベートブラウズ（シークレットモード）では容量が違うことがあり、**モードを終えるとデータは基本的に消える**（MDN）。
- 【推論】数百件の道路・走行ログ（文字だけ）なら、1件1KB としても数百KB。**どの環境でも容量は問題にならない**。問題は「容量」ではなく「消されるかどうか」。
- 【推論】プライベートブラウズで使われると、タブを閉じた時点で記録が消える。検出は確実にはできないので、「書き出しをしてね」の案内でカバーする。

## 4. localStorage と IndexedDB のどちらにするか

| 観点 | localStorage | IndexedDB |
|---|---|---|
| 動き方 | **同期**（処理が終わるまで画面の処理が止まる） | **非同期**（Promise 等で待つ） |
| 入るもの | 文字列だけ（JSON に変換して入れる） | オブジェクト、Blob（写真など）もそのまま |
| 上限 | 約5MiB | ディスクの約60% |
| Safari 7日ルール | **対象** | **対象**（違いなし） |
| コードの簡単さ | とても簡単 | 生の API は複雑。`idb` などの薄いラッパーがほぼ必須 |
| テスト | jsdom でそのまま動く | `fake-indexeddb` 等が必要【推論】 |

- 【事実】web.dev は「localStorage は同期で画面の処理を止める、約5MB・文字列のみなので**避ける**。IndexedDB（できれば Promise のラッパー付き）を使う」と推奨している。
- 【推論】ただし止まる時間はデータ量に比例する。数百KB の JSON の読み書きなら体感できるほどではないと考えられる（実測はしていない）。
- **おすすめ**【推論】
  - **写真を保存しない（文字だけ）なら localStorage で十分**。1つのキーに「スキーマ版番号つきの JSON」をまとめて保存し、保存処理は1つのモジュールに閉じ込めて、後から IndexedDB に差し替えられるようにする。
  - **写真・地図の画像などを保存する予定があるなら、最初から IndexedDB**（localStorage の5MiB はすぐ超える）。
  - IndexedDB を使う場合のラッパー `idb`（作者 Jake Archibald、依存パッケージなし）について: 最新版 8.0.4 は **2026-10-06 公開＝2日前**で、このリポジトリの「公開から7日待つ」ルール（`minimumReleaseAge`）に引っかかる。入れるなら 8.0.3（2025-05-07 公開）か、7日経ってから。Socket のスコア確認はこのセッションでは接続エラーで**未実施**【未確認】。
- 【推論】どちらでも、`QuotaExceededError` を try/catch で受けて「保存できませんでした」と表示する処理は必須（MDN の推奨と同じ）。

## 5. 「ホーム画面に追加」（PWA）の条件

### Android（Chrome）
- 【事実】Chrome でインストールできる条件（web.dev、2024-09-19 更新 <https://web.dev/articles/install-criteria>）:
  - HTTPS で配信
  - manifest に `short_name` か `name`、**192px と 512px のアイコン**、`start_url`、`display` が `fullscreen` / `standalone` / `minimal-ui` / `window-controls-overlay` のどれか、`prefer_related_applications` がないか false
  - 利用者がページを1回以上タップし、30秒以上見ていること
- 【事実】この条件一覧に **Service Worker は含まれていない**。Next.js の PWA ガイドも「オフライン対応がなくてもインストールの案内は出せる」と書いている（`node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`）。
- 【事実】条件を満たすと `beforeinstallprompt` イベントが来るので、自前の「インストール」ボタンを出せる。

### iOS（Safari）
- 【事実】iOS には `beforeinstallprompt` のような「インストールを促す仕組み」はない。利用者が **共有ボタン →「ホーム画面に追加」**を自分で押す（WebKit ブログ 2023-02-16 <https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/>）。
- 【事実】iOS / iPadOS 16.4 から、ほかのブラウザ（条件を満たすもの）も共有メニューからホーム画面に追加できる。
- 【事実】iOS 26 からは manifest がなくても Web アプリとして開く。manifest があればアイコン等が使われる（Safari 26.0 の記事）。
- 【事実】Next.js 公式ガイドの例: `window.matchMedia('(display-mode: standalone)').matches` で「すでにホーム画面から開いているか」を判定し、iOS の場合だけ「共有ボタン →『ホーム画面に追加』」と文字で案内するコンポーネントを出す。

### road-review でやること【推論】
- `src/app/manifest.ts`（Next.js の決まった置き場所。現在は**まだ無い**）に `name` / `short_name` / `start_url: "/"` / `display: "standalone"` / 192px・512px アイコン / `theme_color` / `background_color` を書く。
- Service Worker は**今回は不要**（オフライン対応をしたくなったら追加）。
- iPhone で、かつ standalone でないときだけ、「データを消さないために、共有ボタン →『ホーム画面に追加』してね」というカードを出す。理由（7日で消える）も短く書く。

## 6. 書き出し（エクスポート）と読み込み（インポート）

### 6.1 ファイルとしてダウンロード
- 【事実】`<a download>` は iOS Safari 13 から対応（browser-compat-data）。`Blob` → `URL.createObjectURL()` → `<a download="road-review-2026-10-08.json">` をクリック、で保存できる。
- 【未確認】iOS で保存先が「ファイル」アプリのダウンロードフォルダになる等の細かい画面の流れは、公式文書で確認できなかった（実機で確認が必要）。

### 6.2 Web Share（共有シート）でファイルを送る
- 【事実】`navigator.share({ files })` の対応: Chrome Android 76、Safari 14（iOS 14）から（browser-compat-data）。HTTPS 必須（MDN）。
- 【事実】Chrome は**ユーザーの操作（タップ）の直後でないと share() を拒否**する（Chromium `navigator_share.cc`）。
- 【事実・重要】**Chrome（Android もデスクトップも）は共有できるファイルの種類を限定しており、`.json` / `application/json` は許可リストに入っていない**。許可されているのは画像・音声・動画・PDF・`.txt`・`.csv`・`.html` 等。
  出典: Chromium `components/browser_ui/webshare/android/.../ShareServiceImpl.java`（`PERMITTED_EXTENSIONS`）、`chrome/browser/webshare/share_service_impl.cc`
- 【事実・落とし穴】しかも Chrome の `canShare()` は**ファイルの種類をチェックしない**（`CanShareInternal` はデータが空かと URL しか見ない）。だから `canShare({files:[json]})` が true でも、`share()` で **NotAllowedError** になる。
- 【事実】WebKit（Safari）の share() のコードには、ファイルの種類の許可リストは見当たらなかった（`Navigator.cpp`）。
- 【推論】→ Web Share を使うなら、JSON の中身を `.txt`（`text/plain`）として送る必要がある。ただしそうすると下の「読み込み」で iPhone の選択画面に出なくなる恐れがある。**基本はダウンロード、Web Share は「iPhone で AirDrop やメールに送りたい人向けの補助」**にする。

### 6.3 読み込み（`<input type="file">`）
- 【事実】iOS の WebKit は `accept` に書かれた MIME タイプや拡張子を iOS のファイル種別（UTType）に変換し、**ファイル選択画面で、その種類のファイルだけ選べるようにする**（`WKFileUploadPanel.mm` の `UTIsForMIMETypes`）。`accept` に変換できる種類がなければ全ファイルが選べる。
- 【推論】→ `accept="application/json,.json"` にすると、iPhone では `.json` のファイルだけが選べる。`.txt` で保存したバックアップは選べなくなるので、**書き出しは必ず `.json` 拡張子**に揃える。読み込み後は中身を必ず検査する（JSON として読めるか、スキーマ版番号、必須項目）。

### 6.4 おすすめの流れ【推論】
1. 設定画面に「バックアップを書き出す（.json）」「バックアップから読み込む」の2ボタン。
2. 書き出しは Blob ダウンロード。ファイル名に日付を入れる。
3. 読み込みは「置き換える／追加する」を選ばせ、置き換えの前に確認ダイアログ。
4. 最後に書き出してから日数がたったら、ホームで「バックアップしよう」と軽く知らせる（例: 最終書き出し日を保存しておく）。
5. 保存時（初回の記録時）に `navigator.storage.persist()` を呼ぶ。

---

## 7. 確かめられなかったこと（次にやるなら）
- 【未確認】Safari 本体が今も「7日」で動いているか（ソース上は30日の経路もある）。→ 実機で確かめるには7日以上かかる。公式な発表を待つか、WebKit のバグ管理（bugs.webkit.org）を追う。
- 【未確認】ホーム画面アプリと Safari タブでデータが共有されないこと（公式文書なし）。→ 実機で「Safari で保存 → ホーム画面に追加 → 開いて中身を見る」で数分で確認できる。
- 【未確認】iOS 版 Chrome（WebKit 版）での7日ルールの扱い。
- 【未確認】`idb` パッケージの Socket スコア（接続エラーのため）。

## 出典一覧
- WebKit ブログ「Full Third-Party Cookie Blocking and More」2020-03-24: <https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/>
- WebKit ブログ「App-Bound Domains」2020-06-26: <https://webkit.org/blog/10882/app-bound-domains/>
- WebKit ブログ「Web Push for Web Apps on iOS and iPadOS」2023-02-16: <https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/>
- WebKit ブログ「Updates to Storage Policy」2023-08-10: <https://webkit.org/blog/14403/updates-to-storage-policy/>
- WebKit ブログ「WebKit Features in Safari 26.0」: <https://webkit.org/blog/17333/webkit-features-in-safari-26-0/>
- WebKit ソース: `Source/WebKit/NetworkProcess/Classifier/ResourceLoadStatisticsStore.cpp`、`Source/WebKit/NetworkProcess/storage/NetworkStorageManager.cpp`、`Source/WebCore/page/Navigator.cpp`、`Source/WebKit/UIProcess/ios/forms/WKFileUploadPanel.mm`（<https://github.com/WebKit/WebKit>、2026-10-08 時点の main）。コミット fb634d8ebf（2023-05-18）、4506123001（2024-02-09）、63ef7c135a（2024-07-22）、4fb2a0985c（2026-05-06）
- MDN「Storage quotas and eviction criteria」: <https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria>
- MDN「Navigator.canShare()」: <https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare>
- MDN browser-compat-data（`api/Navigator.json`、`api/StorageManager.json`、`html/elements/a.json`）: <https://github.com/mdn/browser-compat-data>
- web.dev「Storage for the web」2024-09-23 更新: <https://web.dev/articles/storage-for-the-web>
- web.dev「Persistent storage」: <https://web.dev/articles/persistent-storage>
- web.dev「What does it take to be installable?」2024-09-19 更新: <https://web.dev/articles/install-criteria>
- Chromium ソース: `components/browser_ui/webshare/android/java/src/org/chromium/components/browser_ui/webshare/ShareServiceImpl.java`、`chrome/browser/webshare/share_service_impl.cc`、`third_party/blink/renderer/modules/webshare/navigator_share.cc`（<https://chromium.googlesource.com/chromium/src/>）
- Apple「App Review Guidelines」2.5.6: <https://developer.apple.com/app-store/review/guidelines/>
- Apple「Alternative browser engines」: <https://developer.apple.com/support/alternative-browser-engines/>
- Apple「App distribution in Japan」: <https://developer.apple.com/support/app-distribution-in-japan/>
- Next.js 16 同梱ドキュメント: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md`、`.../02-guides/progressive-web-apps.md`
- npm レジストリ（idb の公開日）: <https://registry.npmjs.org/idb>
