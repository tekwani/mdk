import { describe, expect, it } from 'vitest'

import {
  circularArrayAccess,
  getAvgFromWeighted,
  getNestedValue,
  getWeightedAverage,
} from '../array'

describe('getNestedValue', () => {
  it('gets nested values by dot path', () => {
    expect(getNestedValue({ a: { b: 42 } }, 'a.b')).toBe(42)
    expect(getNestedValue({ x: 1 }, 'x')).toBe(1)
  })

  it('returns undefined for missing paths', () => {
    expect(getNestedValue({ a: 1 }, 'b.c')).toBe(undefined)
  })
})

describe('getWeightedAverage', () => {
  it('calculates weighted average', () => {
    const data = [
      { value: 100, weight: 10 },
      { value: 200, weight: 20 },
    ]
    const result = getWeightedAverage(data, 'value', 'weight')
    expect(result.avg).toBeCloseTo(166.67, 1)
    expect(result.totalWeight).toBe(30)
  })

  it('returns 0 avg when total weight is 0', () => {
    const result = getWeightedAverage([], 'value', 'weight')
    expect(result.avg).toBe(0)
  })
})

describe('circularArrayAccess', () => {
  it('cycles through array elements', () => {
    const gen = circularArrayAccess(['a', 'b', 'c'])
    expect(gen.next().value).toBe('a')
    expect(gen.next().value).toBe('b')
    expect(gen.next().value).toBe('c')
    expect(gen.next().value).toBe('a')
  })

  it('returns immediately for empty array', () => {
    const gen = circularArrayAccess([])
    expect(gen.next().done).toBe(true)
  })
})

describe('getWeightedAverage edge cases', () => {
  it('treats a missing value or weight as 0', () => {
    expect(getWeightedAverage([{ weight: 10 }, { hashrate: 100 }], 'hashrate', 'weight')).toEqual({
      avg: 0,
      totalWeight: 10,
      weightedValue: 0,
    })
  })

  it('skips entries whose value or weight is not a number', () => {
    const data = [
      { hashrate: 'n/a', weight: 5 },
      { hashrate: 100, weight: 'x' },
      { hashrate: 200, weight: 2 },
    ]
    expect(getWeightedAverage(data, 'hashrate', 'weight')).toEqual({
      avg: 200,
      totalWeight: 2,
      weightedValue: 400,
    })
  })

  it('returns an average of 0 when the total weight is 0', () => {
    expect(getWeightedAverage([], 'hashrate', 'weight').avg).toBe(0)
  })
})

describe('getAvgFromWeighted', () => {
  it('divides the weighted average by the total weight', () => {
    expect(getAvgFromWeighted({ avg: 300, totalWeight: 3 })).toBe(100)
  })

  it('returns null for missing or non-finite inputs, or a total weight that is not positive', () => {
    expect(getAvgFromWeighted(undefined)).toBeNull()
    expect(getAvgFromWeighted({ totalWeight: 3 })).toBeNull()
    expect(getAvgFromWeighted({ avg: Number.NaN, totalWeight: 3 })).toBeNull()
    expect(getAvgFromWeighted({ avg: 300 })).toBeNull()
    expect(getAvgFromWeighted({ avg: 300, totalWeight: Number.POSITIVE_INFINITY })).toBeNull()
    expect(getAvgFromWeighted({ avg: 300, totalWeight: 0 })).toBeNull()
  })
})
