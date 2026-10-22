import { describe, expect, it } from 'vitest'
import { PERIOD, TIMEFRAME_TYPE } from '../ranges'

describe('ranges constants', () => {
  it('should have period types', () => {
    expect(PERIOD.DAILY).toBe('daily')
    expect(PERIOD.YEARLY).toBe('yearly')
    expect(PERIOD.WEEKLY).toBe('weekly')
    expect(PERIOD.MONTHLY).toBe('monthly')
  })

  it('should have timeframe types', () => {
    expect(TIMEFRAME_TYPE.YEAR).toBe('year')
    expect(TIMEFRAME_TYPE.WEEK).toBe('week')
    expect(TIMEFRAME_TYPE.MONTH).toBe('month')
  })
  it('should have all period options', () => {
    const periodValues = Object.values(PERIOD)
    expect(periodValues).toHaveLength(4)
  })
})
