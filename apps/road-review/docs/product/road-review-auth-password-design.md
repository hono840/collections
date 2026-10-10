> 状態（2026-10-07）: 組織と調査基準の作り直し後に再レビューするため保留。

# 公道レビュー ログイン方式変更 設計提案：メールアドレス＋パスワード（v1・実装前）

- 作成: CTO（2026-10-07）／調査: code-architect（公式ドキュメントと Supabase Auth（GoTrue）のソースコードで確かめた）
- 状態: **提案中（CEO承認待ち）**。承認されるまで、コードと本番の設定は一切変えない。
- 前提: CEO決定「Magic Link（メールで届くリンクを押してログインする方式）をやめて、メール＋パスワードにする」
- 新ルール（CEO）: ①管理用の鍵（secret key）を手元のPCに置かない ②本番のDB（データベース）でテストしない ③開発用と本番を分ける ④本番の変更は、実行前にレビューし、実行後に確かめる

> 凡例: 【確認済】＝公式ドキュメントまたはソースで確かめた。【未確認】＝確かめられなかった。実際の作業手順の中で確かめる。

---

## 0. 結論（先に要点）

| 項目 | 決めること |
|---|---|
| ログイン | Server Action（サーバー側で動く処理）で `signInWithPassword` を呼ぶ。失敗したときの表示は1種類だけにする（アカウントがあるかどうかを外から見分けられないようにするため） |
| 最初のパスワード | Hiro がいま使えるログイン（Magic Link）でログインし、アプリの中に作る「パスワードを設定」画面で `updateUser({ password })` を呼んで決める。**管理用の鍵は使わない** |
| パスワードの決まり | 15文字以上。文字の種類の決まり（大文字・記号などを必ず混ぜる決まり）は付けない（NIST の基準に合わせる）。パスワードは、パスワード管理アプリで作ったランダムな文字列にする |
| パスワードを忘れたとき | ①Supabase 標準のメールで再設定する（届くかは保証されない）②届かなければ Hiro が Supabase のダッシュボード（管理画面）から自分で直す。どちらでも、手元に管理用の鍵は置かない |
| 2段階認証（TOTP） | **後回し（第2段階）**。メールが当てにならない今は、スマホをなくすとログインできなくなる危険の方が大きい |
| 消すもの | Magic Link・6桁コードの画面とその処理、`/auth/confirm`、メールテンプレート |
| 残すもの | `/auth/callback`（パスワード再設定のメールから戻ってくる場所として使う） |
| 開発用と本番を分ける | RLS テスト・E2E テストは **GitHub Actions の中で、その場で作る使い捨ての Supabase（`supabase start`）** に対して実行する。Docker（アプリを箱に入れて動かす仕組み）は GitHub のサーバーの中で動き、Hiro の PC には入れない。本番の鍵は使わない |
| 鍵 | 一度ファイルに書き出した `sb_secret_...` は**削除する**。代わりの鍵は作らない（上のテスト方式なら要らない）。古い鍵（legacy）は無効のままにする |

---

## 1. ログインの流れ（signInWithPassword）

### 1.1 ゴールから逆にたどった流れ
- **ゴール:** 正しいメールアドレスとパスワードを入れたら、元のページ（`next`）に戻る。
- **そのために:** Server Action `signInWithPassword(prevState, formData)` を作る。サーバー用の Supabase クライアント（`@/lib/supabase/server`）で `supabase.auth.signInWithPassword({ email, password })` を呼ぶ。成功すると @supabase/ssr がログイン情報をクッキー（ブラウザに保存する小さなデータ）に書き込む。
- **さらにそのために:** 入力は zod（入力チェック用のライブラリ）で確かめる。メールアドレスの形と、パスワードが空でないことだけを見る（長さの決まりはログインのときには確かめない。決まりが変わっても今のパスワードでログインできるようにするため。【確認済】Supabase docs「決まりを強くしても、今のパスワードでログインできる」）。
- **戻る先:** `next` は今の仕組み（`safeNextPath` で確かめてから `redirect()` する）を使う。パスワードログインはリンクを経由しないので、クッキー `rr_next` は使わない。フォームの hidden 項目（画面に出さない入力項目）`next` を Server Action の中で `safeNextPath` に通し、`redirect()` する（よそのサイトへ飛ばされる穴は今と同じ方法でふさぐ）。

### 1.2 エラーの扱い（アカウントがあるかどうかを外から分からなくする）
| Supabase の返し方 | 画面の表示 | 理由 |
|---|---|---|
| `invalid_credentials`（400） | 「メールアドレスまたはパスワードが正しくありません」 | 【確認済】アカウントが無いときもパスワードが違うときも、Supabase は同じエラーを返す（GoTrue の `token.go`） |
| `email_not_confirmed` | 上と同じ文言 | パスワードが正しいときだけ出るので危険は小さい。それでも表示は同じにする。Hiro は確認済みのユーザーなので普通は出ない |
| 429・`over_request_rate_limit` | 「時間をおいてもう一度お試しください」 | 回数の上限に達したとき |
| `email_provider_disabled`（422）・500番台・その他 | 「時間をおいてもう一度お試しください」＋**サーバーのログにエラーの種類だけを残す**（メールアドレスとパスワードは残さない） | 21章の障害（設定ミスに画面から気づけなかった）と、22.1の学びを生かす |

- 判定には `error.code` を使う。HTTP の番号は使わない（【確認済】Supabase の error-codes ページが「HTTP の番号に頼らないこと」と書いている）。
- パスワードの欄は `autocomplete="current-password"`、メールの欄は `autocomplete="username"` にする（パスワード管理アプリが正しく入力できるようにするため）。失敗したときもパスワードの欄は空に戻す。

### 1.3 回数の制限（Rate limit）
- **Supabase に最初から付いている制限**【確認済】: `/auth/v1/token`（パスワードでのログインとログイン状態の更新が同じ窓口）は **1つのIPアドレス（ネット上の住所）あたり、5分で150回まで**。
- **注意点**【確認済】: 今回のログインは Vercel のサーバーから Supabase を呼ぶ。そのため Supabase から見ると、**すべての人が Vercel のIPアドレスから来たことになる**。お客さん本人のIPを伝える方法（`Sb-Forwarded-For` という項目）は **secret key でしか使えない**。
  - 起きうること: 誰かがログイン画面で何度も失敗し続けると、Vercel のIPに割り当てられた回数を使い切る。すると Hiro のログインや、ログイン状態の更新（proxy が行う）まで、一時的に止まるかもしれない（嫌がらせでサービスを止められる危険）。
  - 一方で、パスワードを総当たりで当てる攻撃は、攻撃する人が Supabase の窓口を直接呼べばアプリを通らずにできる（publishable key は公開されている鍵なので）。だから**アプリ側で回数を制限しても、総当たり攻撃は防げない**。総当たりへの本当の守りは「長くてランダムなパスワード」（1.4）。
- **決定（MVP）:** アプリ側の回数制限は**今は作らない**。理由: 使うのは1人だけ／総当たりには効かない／作るには、回数を保存する場所が別に要る。止められる危険は「受け入れるリスク」として記録する（8章の R-3）。他の人に使ってもらう前に、CAPTCHA（人間かどうかを確かめる仕組み。hCaptcha・Turnstile に対応【確認済】。無料プランで使えるかは【未確認】）か、IP転送の方式を考え直す。

### 1.4 パスワードの決まり
- `[auth] minimum_password_length = 15`。`password_requirements = ""`（文字の種類の決まりは付けない）。
  - 根拠【確認済】: NIST SP 800-63B-4（米国の公的な認証の基準）は「パスワードだけでログインさせるなら **15文字以上を必須**」「文字の種類を混ぜる決まりを**付けてはならない**」「最大で64文字以上を受け付けるべき」としている。
- **漏れたパスワードのチェック（HaveIBeenPwned）**: 【確認済】**Pro プラン以上だけ**。無料プランでは使えない。代わりに運用で守る: パスワード管理アプリで作った、ほかで使っていないランダムな20文字以上にする（手順書に書く）。
- アプリ側の zod でも「15文字以上・72バイト以下」を確かめる（72バイトは bcrypt という保存方式の上限。Supabase の内部で bcrypt が使われているかは【未確認】なので、実装のときに `weak_password` と長いパスワードの扱いをテストで確かめる）。Supabase が返す `weak_password` は「15文字以上にしてください」と表示する。

### 1.5 ログインの状態（セッション）
- 今の仕組みをそのまま使う: proxy（Next.js 16 で `middleware` から名前が変わったもの【確認済】）で `getClaims()` を呼んでログイン状態を更新する。Server Action と各ページは、そのたびにログインを確かめる（【確認済】Next.js docs「proxy だけに頼らず、Server Function ごとにログインを確かめる」、Supabase docs「サーバーでは `getSession()` を信用しない」）。
- `jwt_expiry = 3600`（ログインの証明書の有効期限は1時間）、`enable_refresh_token_rotation = true`（更新用の鍵を毎回作り直す）は変えない。
- パスワードを変えた後は `signOut({ scope: 'others' })` で、ほかの端末のログインを切る。

---

## 2. Hiro の最初のパスワードを、管理用の鍵を使わずに決める方法

### 2.1 仕組み【確認済：GoTrue `user.go`】
- パスワードがまだ無いユーザーが `updateUser({ password })` を呼ぶと、今のパスワードを聞かれずに設定できる（「最初のパスワードを足す」扱い。email の identity（ログイン方法の記録）も作られる）。
- 止められるのは「再認証が必要」の設定（`secure_password_change`／GoTrue の `UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION`）が ON で、しかも**ログインしてから24時間より経っている**場合だけ。そのときはメールで届く使い捨ての番号（nonce）が必要になり、メールの上限（1時間に2通）を使う。

### 2.2 手順
1. 新しく画面 `/settings/password`「パスワードを設定・変更」を作る（ログインしている人だけが開ける）。
2. Hiro は**今の Magic Link でログインする**（この段階ではまだ Magic Link を消さない）。ログインしてから24時間以内に設定する。
3. 画面で新しいパスワードを2回入れる → Server Action が `updateUser({ password })` を呼ぶ → 成功したら「設定しました」と表示する。
4. 一度ログアウトし、メール＋パスワードでログインできることを確かめる（**本番での確認**）。

### 2.3 2回目からの変更（設定の比較）
| 設定 | 良いところ | 困るところ | 決定 |
|---|---|---|---|
| 再認証（nonce をメールで送る） | 乗っ取られたログインでパスワードを変えられにくい | **メールが当てにならない**ので、変えられなくなるかもしれない | **OFF のまま** |
| 今のパスワードを入力させる（`current_password`。supabase-js v2.102.0 以上【確認済】） | メールを使わない。パスワードが無いとき（最初の設定）と、再設定メールから来たときは聞かれない【確認済】 | ホスト版（Supabase のサーバー）でこの設定をどこで ON にするか、config.toml の項目名が【未確認】 | **使う**。手順 S-1 で devops-engineer がダッシュボードで設定の場所を確かめる。見つからない場合は「アプリが保存しない一時的なクライアントで `signInWithPassword` を呼び、今のパスワードを確かめてから変える」方式にする（CTO が再レビューする） |

- 注意: 今の config.toml のコメントと Supabase の CLI リファレンスで、`secure_password_change` の説明が食い違っている（【確認済】食い違いがある。どちらが正しいかは【未確認】）。だから **`secure_password_change = false` をはっきり書き**、push した後に本番の動きで確かめる。

---

## 3. パスワードを忘れたとき（メールが当てにならない前提）

- **前提**【確認済】: 標準のメール送信は「組織のメンバーのアドレスにしか送らない」「1時間に2通」「届く保証なし」。Hiro は組織のオーナーなので送り先には入っている（22.1 で、Hiro に届いた記録がある）。
- **方法A（画面から・届けばラッキー）:** ログイン画面に「パスワードを忘れた」を置く → `resetPasswordForEmail(email, { redirectTo: ${origin}/auth/callback })`（PKCE 方式【確認済】）。戻る先は `/settings/password` にする（クッキー `rr_next` に入れる。今の `/auth/callback` の仕組みをそのまま使う）。表示はいつも「登録されていれば送りました」にする（【確認済】Supabase 自身も、アカウントがあるかどうかを返さない）。再設定のメールから来たときは、今のパスワードを聞かれない【確認済】。
  - 制約: 標準のテンプレートは変えられないので、**メールを頼んだのと同じブラウザで開く必要がある**（PKCE のため。21章と同じ）。
- **方法B（正式な非常口）:** Hiro が Supabase のダッシュボード（GitHub ログイン＋2段階認証で守る）から、Authentication > Users > 対象のユーザー >「Send password recovery」または「Send magic link」を押す。この操作の名前と場所は【未確認】なので、手順 S-1 で devops-engineer がスクリーンショット付きで手順書にまとめる。
- **やらないこと:** 手元のPCで secret key を使って `admin.updateUserById` を呼ぶ／SQL で `auth.users` を直接書き換える（公式の方法ではないため）。
- どうしてもメールが届かない状態が続いたら、方法Cとして「独自のメール送信（SMTP）を入れる」を CEO にもう一度相談する（無料プランでも独自の SMTP は使える【確認済】）。

---

## 4. 2段階認証（TOTP。スマホアプリで6桁の数字を出す方式）

- 【確認済】無料プランで使える（「TOTP は無料で、すべてのプロジェクトで有効」）。config.toml にある「Pro だけ」というコメントは古い。
- **決定: 後回し（第2段階）。** 理由: メールが当てにならない今は、スマホをなくすと方法Aが使えず、ダッシュボードから2段階認証を外す方法（【未確認】）しか残らない。
- 第2段階に進む条件: パスワードログインが2週間問題なく動くこと＋ダッシュボードで「登録した2段階認証を外す」手順を確かめたこと。進めるときは、proxy で `getAuthenticatorAssuranceLevel()` を見て、AAL2（2段階目まで済んだ状態）でなければ確認の画面へ送る。

---

## 5. 消すもの・残すもの

| 対象 | 扱い |
|---|---|
| `requestMagicLink` / `verifyOtpCode` / `confirmMagicLink`（`features/auth/actions.ts`） | 消す。`signInWithPassword` / `updatePassword` / `requestPasswordReset` を足す。`signOut` は残す |
| `LoginForm` | メール＋パスワードの形に作り直す（organisms）。送った後の「メールを送りました」の表示は消す |
| `OtpForm`・`ConfirmLoginForm`・`/auth/confirm`（page とテスト） | 消す（21章の「コードは残す」をこの設計で置き換える） |
| `/auth/callback` | **残す**（方法Aの戻り先）。テストもそのまま |
| `supabase/templates/*.html`・config.toml でコメントにしているテンプレート設定 | 消す（変えられないため） |
| `magicLinkSchema` / `verifyOtpSchema` | 消して `passwordLoginSchema` / `newPasswordSchema` にする |
| `tests/helpers/supabase-test-users.ts` | `generateLink` をやめ、`admin.createUser({ email, password, email_confirm: true })` → `signInWithPassword` に変える。**使い捨ての Supabase（6章）でだけ動く**ようにする（URL が `127.0.0.1`／`localhost` でなければ、すぐに失敗させる仕組みを入れる） |
| E2E `auth.spec.ts` / `support/login.ts` | 画面からパスワードでログインする形に書き直す |
| config.toml | `[auth] enable_signup = false`（そのまま）、`[auth.email] enable_signup = true`（**必ず true**。【確認済】メールのプロバイダが無効だと、パスワードログインも `email_provider_disabled` で止まる）、`minimum_password_length = 15`、`secure_password_change = false`（はっきり書く）、`[remotes.production.auth] additional_redirect_urls` から `http://localhost:3000/**` を消す（開発で本番につながなくなるため） |

- **正直に書いておくこと:** 画面から Magic Link を消しても、Supabase 側では Magic Link の仕組みは動いたままになる（メールのプロバイダを ON にすると、パスワードと Magic Link の両方が使えるため。Magic Link だけを OFF にする設定は見つからなかった）。誰かが Hiro のアドレスで直接 Magic Link を頼むと、メールが Hiro に届くことはある。ただし、ログインするにはそのメールを開ける必要があるので、乗っ取りにはつながらない。受け入れるリスク（R-5）として記録する。

---

## 6. 開発用と本番を分ける・テストのやり方

| 案 | 中身 | 判断 |
|---|---|---|
| **A（推奨）GitHub Actions の中で使い捨ての Supabase** | CI（GitHub が自動でテストを動かす仕組み）で `supabase/setup-cli` → `supabase start` → マイグレーション（DBの変更手順）を適用 → RLS テストと E2E テスト（`next build && next start`）を動かし、終わったら捨てる。【確認済】Supabase 公式の CI ガイドが、この方法を示している | 鍵はその場で作られる、その時だけの値なので、本番の鍵も GitHub Secrets（GitHub に預ける秘密の値）も要らない。本番の DB にさわらない。無料プランの枠も使わない。Docker は GitHub のサーバーの中だけで動く |
| B 開発用の Supabase プロジェクトを作る | 無料枠は2つとも使用中【確認済：無料は同時に2つまで。一時停止したプロジェクトは数えない】。作るには budget-app などを止める必要がある | 今は採らない |
| C Supabase Branching（開発用のコピーを自動で作る機能） | 【確認済】Pro プラン以上だけ（有料） | 採らない |

- **案Aにしたときの、手元での開発:** 手元の `pnpm dev` は本番の Supabase につながなくなる。手元では単体テスト（Vitest。Supabase は偽物に差し替える）だけを動かし、本物の DB を使う確認は PR（変更を取り込む前の確認依頼）を出したときの CI で行う。画面を目で見て確かめるのは、本番に出した後に Hiro 自身のアカウントで行う（テスト用のデータは本番に作らない）。
- これに合わせて、手元の `.env.local` には本番の URL と publishable key（公開してよい鍵）だけを置くか、何も置かない（CEO が選ぶ。8章の判断 D-4）。
- 21章にある「RLS テストを本番の DB で行った（65/66）」は、今後は禁止する。テスト中に本番に作ったテストユーザーが残っていないか、S-0 で確かめる。

---

## 7. 鍵の入れ替え・削除

- **デフォルトの `sb_secret_...`:** 一度ファイルに書き出した（その後に削除した）ので、**漏れたかもしれないものとして扱い、削除する**。案Aなら secret key を使う場所が1つも無いので、新しい鍵は作らない。【確認済】secret key はいくつでも作れて、Settings > API Keys から個別に消せる（消すと元に戻せない）。
  - 消す前に、Vercel の環境変数・GitHub Secrets・keep-alive（プロジェクトを止めないための定期アクセス）に secret key が使われていないことを確かめる。keep-alive は publishable key を使っているので影響しないはず。消した後も keep-alive が動くことを確かめる。
- **古い鍵（anon / service_role）:** 無効のままにする。【確認済】無効にした鍵は、また有効に戻せる。だから「戻さない」ことを手順書に書く。
- **過去に漏れていないかの確認:** `.env.local` にあった service_role key が git の記録に入っていないか（`git log -p` で探す）と、それがあった期間の API ログに、知らないアクセスが無いかを security-auditor が確かめる。
- 将来どうしても secret key が要る場合は、用途ごとに名前を付けて作り、**GitHub Actions の Secrets だけ**に置く（手元のPCと Vercel には置かない）。

---

## 8. リスク一覧

| # | リスク | 対策・扱い |
|---|---|---|
| R-1 | 最初のパスワードを設定する前に、Magic Link を消してしまう | Magic Link を消すのは、本番でパスワードログインを確かめた**後**にする（9章 S-4 → S-6 の順番） |
| R-2 | メールが届かず、パスワードを再設定できない | 方法B（ダッシュボード）を手順書にしておく。パスワード管理アプリに保存する |
| R-3 | Vercel のIPの回数上限を使い切られ、ログインが止まる | 受け入れる（1人だけで使うため）。他の人に使ってもらう前に、CAPTCHA かIP転送を考える |
| R-4 | 漏れたパスワードのチェックが無い | 長くてランダムなパスワードと、パスワード管理アプリで補う |
| R-5 | Supabase 側では Magic Link が動いたまま | ログインにはメールを開ける必要があるので受け入れる |
| R-6 | `config push` で、思わぬ設定まで変わる（21章の障害のように） | push の前に `config diff` を CTO がレビューする。push の後に、本番の Auth の窓口を直接呼んでエラーコードを確かめる |
| R-7 | 設定の場所が【未確認】（今のパスワードを入力させる設定・ダッシュボードの再設定ボタン） | S-1 で確かめる。見つからない場合の代わりの方法は2.3に書いてある |
| R-8 | テスト用の処理が、間違って本番につながる | テスト用の処理は URL が localhost でなければ失敗させる。本番の secret key はどこにも置かない |
| R-9 | ログイン失敗のエラーコードをログに出すとき、個人情報まで出してしまう | エラーの種類だけを出す。code-reviewer と security-auditor が確かめる |

---

## 9. 本番に出す手順（どの手順も「実行前のレビュー → 実行 → 実行後の確認」）

| 手順 | 中身 | 担当 | Hiro の作業・承認 |
|---|---|---|---|
| S-0 | この設計の承認／鍵が漏れていないかの調査（7章）／本番にテストユーザーが残っていないか、数だけ確かめる | security-auditor | **承認** |
| S-1 | ダッシュボードを読むだけの調査: 再設定・Magic Link を送るボタンの場所、今のパスワードを入力させる設定、再認証の設定の今の値、Phone プロバイダが無効か | Hiro がダッシュボードを開き、devops-engineer が手順を案内する | **Hiro が操作**（スクリーンショット） |
| S-2 | CI に使い捨ての Supabase のジョブを作る（案A）。GitHub の action は SHA（変更できない番号）で固定する | devops-engineer → supply-chain-auditor | PR のマージを承認 |
| S-3 | TDD（テストを先に書く開発）: Red → Green → Refactor（パスワードログイン・`/settings/password`・再設定・テスト用の処理）。**この時点では Magic Link を残す** | test-writer → backend/frontend → code-reviewer → security-auditor | PR のマージを承認 |
| S-4 | 本番の Auth 設定（`minimum_password_length = 15` など）: `config diff` を CTO がレビュー → push → `/auth/v1/token` に、ありえないアカウントで1回だけ送り、`invalid_credentials` が返ることを確かめる（`email_provider_disabled` ではないこと） | devops-engineer | **実行前の承認** |
| S-5 | 本番にデプロイ → Hiro が Magic Link でログイン → `/settings/password` でパスワードを設定 → ログアウト → パスワードでログインできることを確かめる | Hiro | **Hiro が操作** |
| S-6 | Magic Link・6桁コード・`/auth/confirm`・テンプレートを消す PR（TDD）／本番の Redirect URLs から localhost を消す（diff をレビュー → push → 確かめる） | 各担当 | 承認 |
| S-7 | `sb_secret_...` を削除 → アプリでのログイン・keep-alive・CI が動き続けることを確かめる | Hiro（ダッシュボード） | **Hiro が操作** |
| S-8 | 方法Aの再設定を1回だけ試す（1時間に2通の上限に注意）／方法Bの手順書を完成させる／設計書の21章・12章・13章・14章を、この設計に合わせて書き直す | devops-engineer・Hiro | 確認 |

- どの手順でも、失敗したら直前の状態に戻す（config は元の内容に戻して push する。アプリは Vercel の前のデプロイに戻す）。

---

## 付録: 根拠にした資料
- https://supabase.com/docs/reference/javascript/auth-signinwithpassword ／ https://github.com/supabase/auth/blob/master/internal/api/token.go（アカウントが無いときもパスワードが違うときも同じエラー、`email_provider_disabled`）
- https://supabase.com/docs/guides/auth/debugging/error-codes
- https://supabase.com/docs/guides/auth/rate-limits（`/token` は5分で150回・IP単位、`Sb-Forwarded-For` は secret key が必要）
- https://supabase.com/docs/guides/auth/auth-captcha
- https://supabase.com/docs/guides/auth/password-security ／ https://supabase.com/pricing（漏れたパスワードのチェックは Pro 以上、Branching は Pro 以上、無料は同時に2プロジェクトまで）
- https://supabase.com/docs/guides/auth/passwords ／ https://github.com/supabase/auth/blob/master/internal/api/user.go（`current_password`・再認証は24時間・最初のパスワードの設定）
- https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail ／ https://supabase.com/docs/guides/auth/auth-smtp（標準のメールはメンバー宛てだけ・1時間に2通）
- https://supabase.com/docs/guides/auth/auth-mfa/totp（TOTP は無料）
- https://supabase.com/docs/guides/platform/billing-on-supabase（一時停止したプロジェクトは数に入らない）
- https://supabase.com/docs/guides/api/api-keys（secret key を複数作れる・削除・legacy を無効にする）
- https://supabase.com/docs/guides/deployment/ci/testing（CI で `supabase start`）
- https://supabase.com/docs/guides/auth/server-side/nextjs ／ https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- https://pages.nist.gov/800-63-4/sp800-63b.html（15文字以上・文字の種類の決まりを付けない・最大64文字以上）
