/**
 * プライバシーポリシー（/legal/privacy）— Server Component・静的（PRD 11.4）。
 * 「サーバーを持たず、入力データは端末内で完結・外部送信しない」を中核に据える。
 * アクセス解析（GA4）は導入する場合のプレースホルダとして記載。
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPageLayout, LegalPlaceholder } from '@/components/organisms/LegalPageLayout'
import { MarketingTemplate } from '@/components/templates/MarketingTemplate'

export const metadata: Metadata = {
  title: 'プライバシーポリシー',
  description:
    '原価電卓のプライバシーポリシー。レシピ・仕入価格・原価データは端末内（localStorage）にのみ保存し、外部サーバーに送信しません。',
  alternates: { canonical: '/legal/privacy' },
}

export default function PrivacyPage() {
  return (
    <MarketingTemplate>
      <LegalPageLayout title="プライバシーポリシー" updatedAt="2026年7月9日">
        <p>
          原価電卓（以下「本サービス」）における利用データの取扱いについて定めます。本サービスはサーバーを持たず、入力データを利用者の端末内で完結させることを基本方針とします。
        </p>

        <h2>1. 収集しない情報</h2>
        <p>
          本サービスは、利用者が入力したレシピ・食材の仕入価格・原価データを外部サーバーへ送信・収集しません。これらは営業上の秘密であり、端末の外に出ることはありません。
        </p>

        <h2>2. データの保存場所（localStorage）</h2>
        <p>
          入力データは利用者のブラウザ内（localStorage）にのみ保存されます。ブラウザの履歴・キャッシュ削除や端末の変更により消失する場合があります。バックアップは本サービスの JSON エクスポート機能をご利用ください（復元も JSON から行えます）。
        </p>

        <h2>3. 決済時のデータ取扱い</h2>
        <p>
          Pro の決済は Stripe, Inc. が処理します。クレジットカード情報は Stripe が取得・管理し、当社（運営者）はカード番号等の決済情報を保持しません。決済における取扱いは Stripe のプライバシーポリシーに従います。
        </p>

        <h2>4. アクセス解析</h2>
        <p>
          本サービスは、利用状況の把握と改善のためにアクセス解析ツール（Google Analytics 4 等）を利用する場合があります。
          <LegalPlaceholder>（導入する場合は、取得項目・利用目的・オプトアウト方法をここに記載）</LegalPlaceholder>
          アクセス解析を導入する場合でも、レシピや仕入価格などの入力データを送信することはありません。
        </p>

        <h2>5. Cookie・類似技術</h2>
        <p>
          本サービスはログイン機能を持たず、認証目的の Cookie は使用しません。アクセス解析を導入する場合、解析ツールが Cookie 等を利用することがあります。
        </p>

        <h2>6. 第三者提供</h2>
        <p>
          法令に基づく場合を除き、利用者のデータを第三者へ提供することはありません（本サービスはそもそも入力データを収集していません）。
        </p>

        <h2>7. お問い合わせ・改定</h2>
        <p>
          本ポリシーに関するお問い合わせ先および事業者情報は、
          <Link href="/legal/tokushoho">特定商取引法に基づく表記</Link>
          をご確認ください。本ポリシーは必要に応じて改定し、改定日を本ページに表示します。
        </p>
      </LegalPageLayout>
    </MarketingTemplate>
  )
}
