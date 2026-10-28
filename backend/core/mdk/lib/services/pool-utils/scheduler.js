'use strict'

const { CronExpressionParser } = require('cron-parser')

// Node clamps setTimeout delays above 2^31-1 ms down to 1 ms, which would
// turn a far-off cron fire into a hot loop. Longer waits are armed in chunks.
const MAX_TIMEOUT_MS = 2 ** 31 - 1

const scheduledJobs = new Set()

// Cron-string subset of node-schedule's scheduleJob. `spec` is a cron
// expression (5 or 6 fields) or `{ rule, tz }`. Returns null when the rule
// does not parse, so callers can store the result and `?.cancel()` it.
//
// Fire dates come from the parser's iterator, not from "now": the next fire is
// armed before `fn` runs, and a tick the process slept through still fires once
// it wakes, in order. Both match node-schedule, which this replaced.
function scheduleJob (spec, fn) {
  const { rule, tz } = (spec !== null && typeof spec === 'object') ? spec : { rule: spec }
  let interval, first
  try {
    interval = CronExpressionParser.parse(rule, { tz })
    first = interval.next().toDate()
  } catch (err) {
    return null
  }

  let timer = null
  const job = {
    cancel () {
      clearTimeout(timer)
      timer = null
      scheduledJobs.delete(job)
    }
  }

  const arm = (fireDate) => {
    const delay = fireDate.getTime() - Date.now()
    if (delay > MAX_TIMEOUT_MS) {
      timer = setTimeout(() => arm(fireDate), MAX_TIMEOUT_MS)
      return
    }
    timer = setTimeout(() => {
      arm(interval.next().toDate())
      fn(fireDate)
    }, Math.max(delay, 0))
  }

  scheduledJobs.add(job)
  arm(first)
  return job
}

module.exports = { scheduleJob, scheduledJobs }
