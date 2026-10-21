/**
 * 特定商取引法に基づく表記（/legal/tokushoho）— Server Component・静的（PRD 11.3）。
 * 有料販売（Pro）に必須の法定表示。販売者名・所在地・連絡先などは公開前に Hiro が記入する
 * 【要記入】プレースホルダで明示。販売価格・支払方法・提供時期・返品規定は記載済み。
 */
import type { Metadata } from 'next'
import { LegalPageLayout, LegalPlaceholder } from '@/components/organisms/LegalPageLayout'
import { MarketingTemplate } from '@/components/templates/MarketingTemplate'

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記',
  description: '原価電卓 Pro の販売に関する、特定商取引法に基づく表記です。',
  alternates: { canonical: '/legal/tokushoho' },
}

export default function TokushohoPage() {
  return (
    <MarketingTemplate>
      <LegalPageLayout title="特定商取引法に基づく表記" updatedAt="2026年7月9日">
        <p>
          特定商取引法に基づき、有料プラン（原価電卓 Pro）の販売に関する事項を以下のとおり表示します。
        </p>

        <dl>
          <dt>販売事業者名</dt>
          <dd>
            <LegalPlaceholder />
          </dd>

          <dt>運営統括責任者</dt>
          <dd>
            <LegalPlaceholder />
          </dd>

          <dt>所在地</dt>
          <dd>
            <LegalPlaceholder>（請求があれば遅滞なく開示します）</LegalPlaceholder>
          </dd>

          <dt>電話番号</dt>
          <dd>
            <LegalPlaceholder>（請求があれば遅滞なく開示します）</LegalPlaceholder>
          </dd>

          <dt>メールアドレス（お問い合わせ先）</dt>
          <dd>
            <LegalPlaceholder />
          </dd>

          <dt>販売価格</dt>
          <dd>
            Pro 月額 ¥980（税込）／年額 ¥9,800（税込）。
            <br />
            <LegalPlaceholder>（税込・税抜の別を最終確定）</LegalPlaceholder>
          </dd>

          <dt>商品代金以外の必要料金</dt>
          <dd>なし。ただしインターネット接続料金・通信料はお客様のご負担となります。</dd>

          <dt>支払方法</dt>
          <dd>クレジットカード（Stripe による決済）。</dd>

          <dt>支払時期</dt>
          <dd>決済時にお支払いいただきます。サブスクリプションは各更新日に自動的に決済されます。</dd>

          <dt>商品の引渡し時期</dt>
          <dd>
            決済完了後、Pro を解錠するライセンスキーをメールにて送付します（当面は手動発行のため、決済完了後{' '}
            <LegalPlaceholder>（目安時間・例: 24時間）</LegalPlaceholder> 以内）。
          </dd>

          <dt>返品・キャンセル・解約</dt>
          <dd>
            デジタル商品の性質上、購入後の返金は原則としてお受けできません。サブスクリプションの解約は Stripe の購入者ポータルから次回更新日の前までに行えます。解約後も、当該請求期間の終了までは Pro をご利用いただけます。
            <LegalPlaceholder>（返金・返品ポリシーの詳細を確定）</LegalPlaceholder>
          </dd>

          <dt>動作環境</dt>
          <dd>
            最新版の Google Chrome / Safari / Microsoft Edge / Firefox。ライセンス照合には Ed25519 に対応したブラウザが必要です。
          </dd>

          <dt>適格請求書発行事業者 登録番号</dt>
          <dd>
            <LegalPlaceholder>（登録状況に応じて記載）</LegalPlaceholder>
          </dd>
        </dl>
      </LegalPageLayout>
    </MarketingTemplate>
  )
}
