import { describe, expect, it } from 'vitest'
import { CHART_EMPTY_DESCRIPTION, CHART_TITLES } from '../charts'

describe('chart constants', () => {
  it('should have chart titles', () => {
    expect(CHART_TITLES.HASH_RATE).toBe('Hash Rate')
    expect(CHART_TITLES.POWER_CONSUMPTION).toBe('Power Consumption')
    expect(CHART_TITLES.POWER_CONSUMED).toBe('Power Consumed')
    expect(CHART_TITLES.REACTIVE_ENERGY).toBe('Reactive Energy')
    expect(CHART_TITLES.TANK_OIL_TEMP).toContain('Temperature')
    expect(CHART_TITLES.TANK_PRESSURE).toBe('Tank Pressure')
    expect(CHART_TITLES.SPOT_PRICE).toBe('Spot Price')
    expect(CHART_TITLES.EFFICIENCY).toBe('Efficiency')
    expect(CHART_TITLES.MINERS_ONLINE).toBe('Miners Online')
    expect(CHART_TITLES.REALTIME_CONSUMPTION).toBe('Realtime Consumption')
    expect(CHART_TITLES.HASH_RATE_BY_MINER_TYPE).toBe('Hash Rate By Miner Type')
  })

  it('should have empty state description', () => {
    expect(CHART_EMPTY_DESCRIPTION).toBe('No data available at the moment')
  })
})
