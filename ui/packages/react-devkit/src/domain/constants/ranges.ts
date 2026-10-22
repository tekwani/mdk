export const PERIOD = {
  DAILY: 'daily',
  YEARLY: 'yearly',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
} as const

export const TIMEFRAME_TYPE = {
  YEAR: 'year',
  WEEK: 'week',
  MONTH: 'month',
} as const

// Type exports
export type PeriodKey = keyof typeof PERIOD
export type PeriodValue = (typeof PERIOD)[PeriodKey]
export type TimeframeTypeKey = keyof typeof TIMEFRAME_TYPE
export type TimeframeTypeValue = (typeof TIMEFRAME_TYPE)[TimeframeTypeKey]
