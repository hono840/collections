# 公道レビュー（road-review）コスト見積もり

- 作成: CFO（調査は cost-analyzer に委譲、レビュー1回で承認）
- 確認日: 2026-10-06（出典は下の公式ページで、すべてこの日に確認）
- 前提: MVP（最初の小さな版）は Hiro 1人だけが使う非公開アプリ。お金をもらう要素（広告・課金）はなし。

## 1. 結論

**月額 $0（年額 $0）です。**

- Vercel Hobby、Supabase Free、Leaflet、地理院タイルは、どれも公表されている無料枠の中で使えます。
- MVP ではドメイン（独自のURL）も、Resend（メール配信サービス）も使いません。
- **事前に1つ確認が要ります。** Hiro が今動かしている Supabase の無料プロジェクトが2つ未満かどうかです。詳しくは第7章を見てください。

## 2. サービス別内訳

| サービス | 何に使うか | 無料枠（公式） | 今回の使用見込み（概算） | 月額 |
|---|---|---|---|---|
| Vercel Hobby | アプリを置く場所（ホスティング） | 転送量 100GB/月、関数の呼び出し 100万回/月、Active CPU（処理時間）4時間/月、画像変換 5,000回/月、プロジェクト200個まで | 転送 約0.03GB/月、画像変換 0回 | $0 |
| Supabase Free | ログイン、データベース、写真の保存 | DB 500MB、Storage（ファイル置き場）1GB、egress（外へ送るデータ量）5GB/月（キャッシュ経由は別に5GB）、MAU（月の利用者数）5万人、1ファイル50MBまで、無料のアクティブプロジェクトは2つまで | Storage 約0.144GB/年、egress 約0.1GB/月、MAU 1人 | $0 |
| Supabase 標準メール | ログイン用リンクのメール送信 | 1時間に2通、チームメンバー宛てだけ | 1日に数通以下 | $0 |
| 地理院タイル | 地図の画像 | 出典を書けば無料・申請なし | ブラウザが国土地理院から直接受け取る | $0 |
| Leaflet | 地図を表示する道具 | BSD-2ライセンス（無料で自由に使える） | - | $0 |
| ドメイン | URL | `*.vercel.app` は無料 | 使わない（参考: Cloudflare の .com は $10.46/年） | $0 |
| GitHub Actions | 休止を防ぐための定期実行 | 公開リポジトリは無料、非公開でも Free アカウントは月2,000分まで | 1日1回、数秒 | $0 |
| **合計** | | | | **$0/月** |

為替: 合計が $0 なので円への換算はしていません。今日時点の公式な為替レートは取れませんでした。

## 3. 無料枠の制限と根拠

### Vercel Hobby
- **商用利用はできません。** 規約には "non-commercial, personal use only" とあります。決済・広告・アフィリエイトなどは商用にあたります。
- **無料枠を超えても請求は来ません。** その機能が最大30日止まるだけです。"you will have to wait until 30 days have passed"。
- **画像は `unoptimized`（Vercel 側で画像を変換しない設定）にしてください。** Supabase の署名付きURL（期限つきのリンク）は、発行するたびに中身が変わります。そのため Vercel のキャッシュ（一時保存）が効かず、毎回「変換1回」と数えられる可能性が高いです（公式の仕組みから考えた推定）。写真はアップロード前に長辺2048pxまで縮めるので、Vercel で変換し直す意味はほとんどありません。

### Supabase Free
- **無料プロジェクトの数え方:** "The project limit applies across all organizations where you are an Owner or Administrator." 上限は組織ごとではなく、本人が持つ全組織の合計です。無料の組織を新しく作っても、3つ目は無料になりません。
- **止めてあるプロジェクトは数えません:** "Paused projects do not count towards your quota."
- **しばらく使わないと止まります:** 「直近1週間、データベースへのアクセスが足りないと止まる」とあり、防ぐ目安は「毎日数回のアクセス」です。止まったプロジェクトは管理画面から元に戻せます。
- **自動バックアップはありません。** 公式は CLI の `db dump`（中身を手元に書き出すコマンド）を勧めています。
- **有料の Pro は組織単位で $25/月です。** サーバー代の補助 $10/月 が付き、一番小さいサイズ（Micro）のプロジェクト1つ分はそれでまかなえます。2つ目以降は1つ約 $10/月 です。

## 4. 保存容量の増え方の見積もり

### 仮定（Hiro の実際の使い方を想定した値）
- 月に4回ドライブして記録する（週末に1回）。
- 1回の記録に写真を3枚付ける（上限は5枚）。
- 写真を見るのは月に約100枚。
- アプリの画面を開くのは月に約30回。

### 写真1枚の大きさ（概算）: 1MB
- 2048×1536 の写真は約315万画素で、圧縮前は約9.4MB です（1画素あたり3バイト）。
- JPEG はふつう約10分の1に圧縮されます（Wikipedia の JPEG の記事）。これで約0.94MB になります。
- 景色の写真は細かい模様が多く、ファイルが大きくなりやすいので、多めに **1MB** としました。

### 見積もり結果

| 項目 | 増え方（概算） | 無料枠 | 枠に届くまで |
|---|---|---|---|
| 写真（Storage） | 12枚/月 → 144枚/年 → **約0.144GB/年** | 1GB | **約7年** |
| DB | 記録1件あたり約10KB × 48件/年 = 約0.5MB。検索用の目次（索引）を足して **約1MB/年** | 500MB | 実質届かない |
| Supabase の送信量（写真を見る分） | 100枚 × 1MB = **約0.1GB/月** | 5GB/月 | 枠の約2% |
| Vercel の転送量 | 画面30回 × 約1MB = **約0.03GB/月** | 100GB/月 | 枠の0.1%未満 |
| 地図タイル | ブラウザが国土地理院のサーバーから直接受け取る | 対象外 | Vercel・Supabase の枠は使わない |

## 5. ログイン用リンクのメール（マジックリンク）

マジックリンクとは、パスワードの代わりにメールで届くログイン用リンクのことです。

### Supabase 標準のメール送信
- **送れる量:** "2 emails per hour with the built-in email provider"（1時間に2通まで）。
- **同じ人への再送:** 60秒待つ必要があります。
- **送れる相手:** "Send messages only to pre-authorized addresses" とあり、プロジェクトのチームメンバー宛てだけです（2026-10-06 時点で確認）。
- **MVP ではこのままで大丈夫です。** Hiro はオーナー（チームメンバー）なのでメールは届きます。1人で使うなら1時間2通でも足りるので、追加のメールサーバー（SMTP）は要りません。$0 です。

### 公開共有を始めるとき
Hiro 以外の人にメールを送るには、独自のメール送信サービスが必要になります。
- **Resend 無料プラン:** 1日100通、月3,000通、ドメイン3つまで。
- **有料にする場合:** Pro が $20/月 で、月5万通まで送れます。
- **ドメインが必須:** "You must add and verify at least one domain to send emails with Resend." ドメイン代は .com で $10.46/年（Cloudflare）が目安です。
- **テスト用アドレスの制限:** `onboarding@resend.dev` からは、自分のアドレスにしか送れないとされています（第三者サイトでの確認で、公式ページでは確認できていません）。

## 6. 地図タイルの利用規約（地理院タイル）

- **料金:** 無料です。国土地理院コンテンツ利用規約では、誰でも使えるオープンデータとされています。商用でも使えます。
- **申請:** 承認申請 Q&A に「地理院タイルをリアルタイムで読み込み表示するウェブサイトやソフトウェアを製作する場合、地理院タイルは出典の明示のみで申請不要」とあります。
- **出典の書き方:** 「地理院タイル」と書いて、一覧ページへのリンクを付けます。Leaflet の出典表示（attribution）は `<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>` にします。
- **アクセス量:** 大量アクセスについての具体的な数字は、一覧ページにも規約にも書かれていませんでした。個人で使う量なら問題ありません。

## 7. リスクと推奨アクション

1. **【最優先・要確認】Supabase の無料プロジェクトに空きがあるか**
   - budget-app と carskiida が動いている（アクティブな）プロジェクトかどうかは、こちらからは確認できません。
   - Hiro に、Supabase の管理画面で「今動いている無料プロジェクトの数」を見てもらいます。
   - 2つちょうどの場合、$0 のまま進める方法は2つあります。
     - 使っていない方を一時停止する（止めてあるプロジェクトは数に入らない）。
     - 既存のプロジェクトに road-review 用のテーブルを同居させる。ただし、ログイン用のユーザー情報が他のアプリと共有になります。
   - 有料にする場合は、road-review 専用の組織を Pro にする $25/月 が一番安いです。お金がかかるので Hiro の承認が必要です。
2. **休止を防ぐ（$0）**
   - 週に1回使うだけでは「毎日数回のアクセス」の目安に届きません。
   - GitHub Actions で1日1回、軽くデータを読みにいく設定を入れます（carskiida と同じやり方）。
   - 注意: 公開リポジトリは、60日間なにも動きがないと定期実行が自動で止まります。
3. **画像は `unoptimized` にする**（CTO に伝える）。画像変換の枠を使わずに済み、Supabase と Vercel の両方で転送量を使ってしまうのも防げます。
4. **月1回、手動でバックアップする**（$0）。`supabase db dump` で DB を書き出します。写真は Storage にしか残らないことも覚えておいてください。
5. **お金が動く変更は Hiro の承認が必要**
   - 広告や課金を入れると、Vercel は Pro（$20/月〜）にする必要があります。
   - 公開共有を始めると、ドメイン（$10.46/年）と Resend の無料プランが必要になります。

## 8. 出典（すべて 2026-10-06 確認）

- Vercel Hobby: https://vercel.com/docs/plans/hobby
- Vercel 商用の定義: https://vercel.com/docs/limits/fair-use-guidelines
- Vercel 画像変換の上限: https://vercel.com/docs/image-optimization/limits-and-pricing
- Vercel 画像変換の仕組み: https://vercel.com/docs/image-optimization
- Supabase 料金: https://supabase.com/pricing
- Supabase 請求とプロジェクト上限: https://supabase.com/docs/guides/platform/billing-on-supabase
- Supabase 請求 FAQ: https://supabase.com/docs/guides/platform/billing-faq
- Supabase サーバー代（コンピュート）: https://supabase.com/docs/guides/platform/manage-your-usage/compute
- Supabase 送信量（egress）: https://supabase.com/docs/guides/platform/manage-your-usage/egress
- Supabase アップロード上限: https://supabase.com/docs/guides/storage/uploads/file-limits
- Supabase 一時停止: https://supabase.com/docs/guides/platform/free-project-pausing
- Supabase バックアップ: https://supabase.com/docs/guides/platform/backups
- Supabase Auth のメール送信: https://supabase.com/docs/guides/auth/auth-smtp
- Supabase Auth の送信制限: https://supabase.com/docs/guides/auth/rate-limits
- Resend 料金: https://resend.com/pricing
- Resend ドメイン: https://resend.com/docs/dashboard/domains/introduction
- Resend テスト用アドレス（第三者の解説）: https://apidog.com/blog/resend-api-key/
- 地理院タイル一覧: https://maps.gsi.go.jp/development/ichiran.html
- 国土地理院 承認申請 Q&A: https://www.gsi.go.jp/LAW/2930-qa.html
- 国土地理院コンテンツ利用規約: https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html
- Cloudflare ドメイン料金: https://cfdomainpricing.com/
- GitHub Actions 料金: https://docs.github.com/en/billing/concepts/product-billing/github-actions
- GitHub 定期実行の自動停止: https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/disabling-and-enabling-a-workflow
- JPEG の圧縮率: https://en.wikipedia.org/wiki/JPEG
