'use strict'

const { HOUR_MS, HOURS_24_MS } = require('./constants')

const isCurrentMonth = (month) => {
  return parseInt(month.split('-')[0]) === new Date().getMonth() + 1
}

const convertMsToSeconds = (timestampMs) => {
  return Math.floor(timestampMs / 1000)
}

// Upper bound on buckets one call may build (~1 year hourly, ~27 years
// daily). start/end come from callers, so an unbounded span is a cheap way to
// allocate an arbitrarily large array.
const MAX_TIME_RANGES = 9000

const getTimeRanges = (start, end, isHourly = true) => {
  if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error('ERR_TIME_RANGE_INVALID')
  if (start >= end) return []

  const step = isHourly ? HOUR_MS : HOURS_24_MS
  if ((end - start) / step > MAX_TIME_RANGES) throw new Error('ERR_TIME_RANGE_TOO_LARGE')

  const ranges = []
  const timeDiff = isHourly ? HOUR_MS : HOURS_24_MS
  let endTime = new Date(start + timeDiff)

  if (isHourly) {
    endTime.setUTCMinutes(0, 0, 0)
  } else {
    endTime.setUTCHours(0, 0, 0, 0)
  }

  endTime = endTime.getTime()
  while (start < end) {
    ranges.push({ start, end: endTime })
    start = endTime
    endTime += timeDiff
  }
  return ranges
}

module.exports = {
  isCurrentMonth,
  convertMsToSeconds,
  getTimeRanges,
  MAX_TIME_RANGES
}
