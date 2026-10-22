export { WEBAPP_DISPLAY_NAME, WEBAPP_NAME, WEBAPP_SHORT_NAME } from '@tetherto/mdk-ui-foundation'
export const DATE_RANGE = {
  M1: '1m',
  M5: '5m',
  H1: '1h',
  H3: '3h',
  D1: '1D',
  W1: '1W',
  M15: '15m',
  M30: '30m',
  MONTH1: '1M',
} as const

export const REVENUE_MULTIPLIER = {
  [DATE_RANGE.D1]: 24,
  [DATE_RANGE.W1]: 24 * 7,
  [DATE_RANGE.MONTH1]: 24 * 30,
} as const
export const TIME = {
  ONE_MIN: 60000,
  TEN_MINS: 600000,
  FIVE_MIN: 60000 * 5,
} as const

export const RESPONSE_CODE = {
  SUCCESS: 200,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  SERVER_ERROR: 500,
} as const

// Type exports
export type TimeKey = keyof typeof TIME
export type DateRangeKey = keyof typeof DATE_RANGE
export type ResponseCodeKey = keyof typeof RESPONSE_CODE
export type DateRangeValue = (typeof DATE_RANGE)[DateRangeKey]
export type RevenueMultiplierKey = keyof typeof REVENUE_MULTIPLIER
export type ResponseCodeValue = (typeof RESPONSE_CODE)[ResponseCodeKey]
