'use strict'

const test = require('brittle')
const {
  isCurrentMonth,
  convertMsToSeconds,
  getTimeRanges,
  MAX_TIME_RANGES
} = require('../../lib/services/pool-utils/time')
const { HOUR_MS, HOURS_24_MS } = require('../../lib/services/pool-utils/constants')

test('convertMsToSeconds floors ms to seconds', (t) => {
  t.is(convertMsToSeconds(1500), 1)
  t.is(convertMsToSeconds(1999), 1)
  t.is(convertMsToSeconds(2000), 2)
})

test('getTimeRanges empty when start >= end', (t) => {
  t.is(getTimeRanges(100, 100, true).length, 0)
})

test('getTimeRanges returns hourly buckets between start and end', (t) => {
  const start = Date.UTC(2024, 0, 1, 10, 15, 0)
  const end = start + 3 * HOUR_MS
  const ranges = getTimeRanges(start, end, true)
  t.ok(ranges.length >= 2)
  t.is(ranges[0].start, start)
})

test('getTimeRanges daily mode uses HOURS_24_MS', (t) => {
  const start = Date.UTC(2024, 0, 1, 0, 0, 0)
  const end = start + 2 * HOURS_24_MS
  const ranges = getTimeRanges(start, end, false)
  t.ok(ranges.length >= 1)
})

test('isCurrentMonth matches calendar month', (t) => {
  const m = new Date().getMonth() + 1
  const y = new Date().getFullYear()
  t.ok(isCurrentMonth(`${m}-${y}`))
  t.ok(!isCurrentMonth(`${m === 1 ? 12 : m - 1}-${y}`))
})

test('getTimeRanges rejects non-numeric and oversized spans', (t) => {
  t.exception(() => getTimeRanges('a', 10, true), /ERR_TIME_RANGE_INVALID/)
  t.exception(() => getTimeRanges(0, Infinity, true), /ERR_TIME_RANGE_INVALID/)
  const HOUR = 60 * 60 * 1000
  t.exception(() => getTimeRanges(0, (MAX_TIME_RANGES + 2) * HOUR, true), /ERR_TIME_RANGE_TOO_LARGE/)
  t.ok(getTimeRanges(0, (MAX_TIME_RANGES + 2) * HOUR, false).length > 0, 'same span is fine daily')
})
