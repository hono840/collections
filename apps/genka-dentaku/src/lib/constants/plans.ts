/**
 * 料金・ライセンス有効期間（architecture §1 / §6.3・裁定1）。
 * 価格は円（税込表記の運用はマーケ側）。CTA の主役は年額。
 */

/** 課金サイクル。ライセンスキー payload の plan と一致（monthly | annual）。 */
export type PlanCycle = 'monthly' | 'annual'

/** 月額プラン価格（円）。 */
export const PRICE_MONTHLY = 980

/** 年額プラン価格（円・主 CTA。実質 ¥817/月 相当）。 */
export const PRICE_ANNUAL = 9800

/**
 * mint 時にライセンスキーへ焼き込む有効日数（発行日からの exp 設定）。
 * monthly=30日+約8日バッファ / annual=365日+約8日バッファ。末尾 GRACE_DAYS は更新バナー期間。
 */
export const KEY_VALIDITY_DAYS: Record<PlanCycle, number> = {
  monthly: 38,
  annual: 373,
}

/** 期限切れ猶予日数。exp までの残り GRACE_DAYS 以内は Pro 継続 + 更新バナー（architecture §6.3）。 */
export const GRACE_DAYS = 7
