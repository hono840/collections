export const CURRENCIES = {
  JPY: { code: 'JPY', symbol: '¥', locale: 'ja-JP', decimals: 0 },
  USD: { code: 'USD', symbol: '$', locale: 'en-US', decimals: 2 },
} as const

export type CurrencyCode = keyof typeof CURRENCIES
export const DEFAULT_CURRENCY: CurrencyCode = 'JPY'
