'use strict'

const test = require('brittle')
const { scheduleJob, scheduledJobs } = require('../../lib/services/pool-utils/scheduler')

const tick = (ms) => new Promise(resolve => setTimeout(resolve, ms))

test('scheduleJob returns null for a rule that does not parse', (t) => {
  const before = scheduledJobs.size
  t.is(scheduleJob('not a cron', () => {}), null)
  t.is(scheduleJob({ rule: '0 0 0 * * *', tz: 'Not/AZone' }, () => {}), null)
  t.is(scheduledJobs.size, before, 'nothing is tracked for an unscheduled rule')
})

test('scheduleJob fires with the fire date and stops after cancel', async (t) => {
  const fired = []
  const job = scheduleJob('* * * * * *', (fireDate) => fired.push(fireDate))
  t.ok(scheduledJobs.has(job))

  await tick(1100)
  t.ok(fired.length >= 1, 'fired on the next second boundary')
  t.ok(fired[0] instanceof Date, 'callback receives a Date')
  t.is(fired[0].getMilliseconds(), 0, 'fire date is the cron tick, not the wall clock')

  job.cancel()
  t.absent(scheduledJobs.has(job), 'cancel untracks the job')
  const count = fired.length
  await tick(1100)
  t.is(fired.length, count, 'no fires after cancel')
})

test('scheduleJob accepts { rule, tz } and never arms an overflowing timer', async (t) => {
  const warnings = []
  const onWarning = (w) => warnings.push(w.name)
  process.on('warning', onWarning)
  t.teardown(() => process.off('warning', onWarning))

  const job = scheduleJob({ rule: '0 0 0 1 1 *', tz: 'Etc/UTC' }, () => t.fail('yearly job must not fire'))
  t.ok(job, 'object spec parses')
  await tick(20)
  job.cancel()
  t.absent(warnings.includes('TimeoutOverflowWarning'), 'far-off fire is armed in chunks')
})
