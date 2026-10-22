'use strict'

const test = require('brittle')
const path = require('path')
const fs = require('fs')
const os = require('os')
const Corestore = require('corestore')
const Hyperbee = require('hyperbee')
const { CommandStateMachine } = require('../../lib/modules/command-state-machine')
const { COMMAND_STATES, VERIFICATION_STATES } = require('../../lib/modules/command-state-machine/states')
const { COMMAND_SCOPES } = require('../../lib/protocol/actions')

async function createTestBee (t) {
  const tmpDir = path.join(os.tmpdir(), `mdk-csm-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  fs.mkdirSync(tmpDir, { recursive: true })
  const store = new Corestore(tmpDir)
  const core = store.get({ name: 'csm-test' })
  const bee = new Hyperbee(core, { keyEncoding: 'utf-8' })
  await bee.ready()
  t.teardown(async () => {
    await bee.close()
    await store.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
  return bee
}

function createCSM (walStore, opts = {}) {
  const registry = {
    resolveWorkerForDevice () {
      if (opts.noWorker) return null
      return { workerId: 'w1', channel: opts.channel || {} }
    },
    resolveWorker (workerId) {
      if (opts.noWorker) return null
      if (workerId === 'rack-1') return { workerId, channel: opts.channel || {} }
      return null
    },
    isRoutable () { return opts.routable !== false }
  }
  const workerChannel = {
    async send (channel, envelope, sendOpts) {
      if (opts.sendFn) return opts.sendFn(envelope)
      if (opts.shouldTimeout) throw new Error('ERR_CHANNEL_TIMEOUT')
      return { payload: { status: 'SUCCESS', result: { ok: true } } }
    }
  }
  return new CommandStateMachine({
    wal: walStore,
    workerChannel,
    registry,
    telemetryCollector: opts.telemetryCollector,
    timeoutMs: opts.timeoutMs || 5000,
    resultTtlMs: opts.resultTtlMs,
    verifyIntervalMs: opts.verifyIntervalMs || 10
  })
}

function telemetryReturning (...values) {
  const pulls = []
  return {
    pulls,
    async pull (deviceId, query) {
      pulls.push({ deviceId, query })
      const value = values[Math.min(pulls.length, values.length) - 1]
      return value instanceof Error
        ? { deviceId, error: value.message, timestamp: Date.now() }
        : { deviceId, name: query.type, value, timestamp: Date.now() }
    }
  }
}

async function waitForVerification (csm, commandId) {
  for (;;) {
    const entry = await csm.getState(commandId)
    if (entry.verification && entry.verification.state !== VERIFICATION_STATES.PENDING) return entry
    await new Promise(resolve => setTimeout(resolve, 5))
  }
}

const VERIFY = { telemetry: 'power_limit', expected: 2500, withinMs: 1000 }

function waitForCommand (csm, commandId) {
  return new Promise(resolve => {
    csm.on('command:done', function handler (data) {
      if (data.commandId === commandId) {
        csm.off('command:done', handler)
        resolve(data)
      }
    })
  })
}

test('csm - enqueue returns commandId before dispatch completes', async (t) => {
  const bee = await createTestBee(t)
  const csm = createCSM(bee.sub('wal'))

  let dispatchStarted = false
  csm.workerChannel = {
    async send () {
      dispatchStarted = true
      return { payload: { status: 'SUCCESS', result: {} } }
    }
  }

  const before = Date.now()
  const commandId = await csm.enqueue({ deviceId: 'wm001', command: 'reboot', params: {}, requesterId: 'test' })
  const elapsed = Date.now() - before

  t.ok(commandId, 'commandId returned')
  t.ok(elapsed < 100, 'enqueue returned immediately (not blocked by dispatch)')

  await waitForCommand(csm, commandId)
  t.ok(dispatchStarted, 'dispatch still ran')
})

test('csm - enqueue + dispatch → SUCCESS with real WAL', async (t) => {
  const bee = await createTestBee(t)
  const csm = createCSM(bee.sub('wal'))

  const commandId = await csm.enqueue({
    deviceId: 'wm001',
    command: 'reboot',
    params: {},
    requesterId: 'test'
  })

  const done = await waitForCommand(csm, commandId)
  t.is(done.state, COMMAND_STATES.SUCCESS, 'command succeeded')
  t.absent(csm._commands.has(commandId), 'terminal state removed from memory')
  const entry = await csm.getState(commandId)
  t.is(entry.state, COMMAND_STATES.SUCCESS, 'terminal state still readable from the WAL')
  t.alike(entry.result, { ok: true })
  t.alike(entry.verification, { state: VERIFICATION_STATES.NOT_DECLARED })
  t.ok(entry.updatedAt >= entry.createdAt)
})

test('csm - enqueue worker-targeted command dispatches via workerId', async (t) => {
  const bee = await createTestBee(t)
  const csm = createCSM(bee.sub('wal'))

  const commandId = await csm.enqueue({
    scope: COMMAND_SCOPES.WORKER,
    workerId: 'rack-1',
    command: 'registerThing',
    params: {},
    requesterId: 'test'
  })

  const done = await waitForCommand(csm, commandId)
  t.is(done.state, COMMAND_STATES.SUCCESS, 'worker-targeted command succeeded')
})

test('csm - dispatch to unreachable worker stays QUEUED', async (t) => {
  const bee = await createTestBee(t)
  const csm = createCSM(bee.sub('wal'), { noWorker: true })

  const commandId = await csm.enqueue({
    deviceId: 'wm001',
    command: 'reboot',
    params: {},
    requesterId: 'test'
  })

  await new Promise(resolve => setImmediate(resolve))
  const state = await csm.getState(commandId)
  t.ok(state, 'command still exists')
  t.is(state.state, COMMAND_STATES.QUEUED, 'stays QUEUED when worker unavailable')
})

test('csm - unconfirmed send settles TIMEOUT and is never re-sent', async (t) => {
  for (const sendErr of ['ERR_CHANNEL_TIMEOUT', 'CHANNEL_CLOSED']) {
    const bee = await createTestBee(t)
    let callCount = 0

    const csm = createCSM(bee.sub('wal'), {
      sendFn: async () => {
        callCount++
        if (callCount === 1) throw new Error(sendErr)
        return { payload: { status: 'SUCCESS', result: {} } }
      }
    })

    const commandId = await csm.enqueue({ deviceId: 'wm001', command: 'reboot', params: {}, requesterId: 'test' })
    const done = await waitForCommand(csm, commandId)
    await new Promise(resolve => setImmediate(resolve))

    t.is(done.state, COMMAND_STATES.TIMEOUT, `${sendErr} → TIMEOUT`)
    t.is(done.error, 'ERR_COMMAND_UNCONFIRMED')
    t.is(callCount, 1, `${sendErr}: sent exactly once`)
    t.is((await csm.getState(commandId)).state, COMMAND_STATES.TIMEOUT, 'TIMEOUT stays readable')
  }
})

test('csm - worker returns FAILED status', async (t) => {
  const bee = await createTestBee(t)
  const csm = createCSM(bee.sub('wal'), {
    sendFn: () => ({ payload: { status: 'FAILED', error: 'ERR_DEVICE_OFFLINE' } })
  })

  const commandId = await csm.enqueue({ deviceId: 'wm001', command: 'reboot', params: {}, requesterId: 'test' })
  const done = await waitForCommand(csm, commandId)

  t.is(done.state, COMMAND_STATES.FAILED)
  t.is(done.error, 'ERR_DEVICE_OFFLINE')
  const pending = await csm.wal.getPending()
  t.is(pending.length, 0, 'FAILED is terminal')
})

test('csm - cancel QUEUED command emits command:done', async (t) => {
  const bee = await createTestBee(t)
  const csm = createCSM(bee.sub('wal'), { noWorker: true })

  const commandId = await csm.enqueue({ deviceId: 'wm001', command: 'reboot', params: {}, requesterId: 'test' })
  await new Promise(resolve => setImmediate(resolve))

  t.ok(await csm.getState(commandId), 'command exists before cancel')

  const donePromise = waitForCommand(csm, commandId)
  const cancelled = await csm.cancel(commandId)
  const done = await donePromise

  t.ok(cancelled, 'cancel returned true')
  t.is(done.state, COMMAND_STATES.FAILED)
  t.is(done.error, 'ERR_CANCELLED')
  const entry = await csm.getState(commandId)
  t.is(entry.state, COMMAND_STATES.FAILED, 'cancelled command stays readable')
  t.is(entry.error, 'ERR_CANCELLED')
})

test('csm - cancel non-QUEUED command returns false', async (t) => {
  const bee = await createTestBee(t)
  const csm = createCSM(bee.sub('wal'))

  await csm.enqueue({ deviceId: 'wm001', command: 'reboot', params: {}, requesterId: 'test' })
  const cancelled = await csm.cancel('nonexistent')
  t.absent(cancelled, 'cannot cancel nonexistent command')
})

test('csm - recover settles in-flight commands TIMEOUT without re-sending', async (t) => {
  const bee = await createTestBee(t)
  const walStore = bee.sub('wal')

  const csm1 = createCSM(walStore)
  for (const state of [COMMAND_STATES.DISPATCHED, COMMAND_STATES.EXECUTING]) {
    await csm1.wal.append(`cmd-${state}`, { state, deviceId: 'wm001', command: 'reboot', params: {}, createdAt: Date.now() })
  }

  let sendCalled = false
  const csm2 = createCSM(walStore, {
    sendFn: async () => {
      sendCalled = true
      return { payload: { status: 'SUCCESS', result: {} } }
    }
  })
  await csm2.recover()

  for (const state of [COMMAND_STATES.DISPATCHED, COMMAND_STATES.EXECUTING]) {
    const walEntry = await csm2.wal.get(`cmd-${state}`)
    t.is(walEntry.state, COMMAND_STATES.TIMEOUT, `${state} → TIMEOUT`)
    t.is(walEntry.error, 'ERR_COMMAND_UNCONFIRMED')
    t.absent(csm2._commands.has(`cmd-${state}`), `${state} not restored to the queue`)
  }
  t.absent(await csm2.cancel('cmd-EXECUTING'), 'unconfirmed command cannot be cancelled')
  t.absent(sendCalled, 'nothing re-sent')
})

test('csm - recover keeps terminal entries until resultTtlMs, then compacts them', async (t) => {
  const bee = await createTestBee(t)
  const walStore = bee.sub('wal')
  const terminal = [COMMAND_STATES.SUCCESS, COMMAND_STATES.FAILED, COMMAND_STATES.TIMEOUT]

  const csm1 = createCSM(walStore)
  for (const state of terminal) {
    await csm1.wal.append(`cmd-${state}`, { state, deviceId: 'wm001', command: 'reboot', params: {}, createdAt: Date.now() })
  }

  await createCSM(walStore).recover()
  for (const state of terminal) {
    t.is((await csm1.wal.get(`cmd-${state}`)).state, state, `${state} kept within the TTL`)
  }

  await new Promise(resolve => setTimeout(resolve, 20))
  await createCSM(walStore, { resultTtlMs: 10 }).recover()
  for (const state of terminal) {
    t.absent(await csm1.wal.get(`cmd-${state}`), `${state} compacted once past the TTL`)
  }
})

test('csm - recover settles interrupted verification UNVERIFIED', async (t) => {
  const bee = await createTestBee(t)
  const walStore = bee.sub('wal')
  const csm1 = createCSM(walStore)
  const verify = { telemetry: 'power_limit', expected: 2500, withinMs: 1000 }

  await csm1.wal.append('cmd-pending', {
    state: COMMAND_STATES.SUCCESS,
    verify,
    verification: { state: VERIFICATION_STATES.PENDING, telemetry: 'power_limit', expected: 2500, observed: 2000, at: 1 },
    createdAt: Date.now()
  })
  await csm1.wal.append('cmd-inflight', { state: COMMAND_STATES.EXECUTING, verify, createdAt: Date.now() })

  await createCSM(walStore).recover()

  const pending = await csm1.wal.get('cmd-pending')
  t.is(pending.verification.state, VERIFICATION_STATES.UNVERIFIED)
  t.is(pending.verification.observed, 2000, 'last reading kept')
  const inflight = await csm1.wal.get('cmd-inflight')
  t.is(inflight.state, COMMAND_STATES.TIMEOUT)
  t.alike(inflight.verification, { state: VERIFICATION_STATES.UNVERIFIED, telemetry: 'power_limit', expected: 2500, observed: null, at: null })
})

test('csm - prune deletes only terminal entries past resultTtlMs', async (t) => {
  const bee = await createTestBee(t)
  const csm = createCSM(bee.sub('wal'), { resultTtlMs: 300 })
  await csm.wal.append('cmd-old', { state: COMMAND_STATES.SUCCESS, createdAt: Date.now() })
  await csm.wal.append('cmd-queued', { state: COMMAND_STATES.QUEUED, createdAt: Date.now() })
  await new Promise(resolve => setTimeout(resolve, 400))
  await csm.wal.append('cmd-new', { state: COMMAND_STATES.FAILED, createdAt: Date.now() })

  await csm.prune()

  t.absent(await csm.wal.get('cmd-old'), 'expired terminal entry pruned')
  t.ok(await csm.wal.get('cmd-queued'), 'QUEUED entry kept')
  t.ok(await csm.wal.get('cmd-new'), 'fresh terminal entry kept')
})

test('csm - enqueue prunes once the prune interval has passed', async (t) => {
  const bee = await createTestBee(t)
  const csm = createCSM(bee.sub('wal'), { resultTtlMs: 10, noWorker: true })
  await csm.wal.append('cmd-old', { state: COMMAND_STATES.SUCCESS, createdAt: Date.now() })
  await new Promise(resolve => setTimeout(resolve, 20))

  await csm.enqueue({ deviceId: 'wm001', command: 'reboot', params: {}, requesterId: 'test' })
  await new Promise(resolve => setTimeout(resolve, 20))

  t.absent(await csm.wal.get('cmd-old'), 'expired entry pruned by enqueue')
})

test('csm - SUCCESS with verify reads telemetry back until it matches → VERIFIED', async (t) => {
  const bee = await createTestBee(t)
  const telemetry = telemetryReturning(2000, new Error('ERR_DEVICE_UNAVAILABLE'), 2500)
  const csm = createCSM(bee.sub('wal'), { telemetryCollector: telemetry })

  const commandId = await csm.enqueue({ deviceId: 'wm001', command: 'setPowerLimit', params: { limit_watts: 2500 }, requesterId: 'test', verify: VERIFY })
  await waitForCommand(csm, commandId)
  const settled = await csm.getState(commandId)
  t.is(settled.state, COMMAND_STATES.SUCCESS, 'level 2: SUCCESS')
  t.is(settled.verification.state, VERIFICATION_STATES.PENDING, 'level 3 still pending at command:done')

  const entry = await waitForVerification(csm, commandId)
  t.is(entry.verification.state, VERIFICATION_STATES.VERIFIED)
  t.is(entry.verification.observed, 2500)
  t.is(entry.verification.expected, 2500)
  t.ok(entry.verification.at)
  t.is(telemetry.pulls.length, 3, 'read back until it matched')
  t.alike(telemetry.pulls[0], { deviceId: 'wm001', query: { type: 'power_limit' } })
})

test('csm - telemetry that never matches within withinMs → UNVERIFIED', async (t) => {
  const bee = await createTestBee(t)
  const telemetry = telemetryReturning(2000)
  const csm = createCSM(bee.sub('wal'), { telemetryCollector: telemetry })

  const commandId = await csm.enqueue({ deviceId: 'wm001', command: 'setPowerLimit', params: { limit_watts: 2500 }, requesterId: 'test', verify: { ...VERIFY, withinMs: 50 } })
  const entry = await waitForVerification(csm, commandId)

  t.is(entry.state, COMMAND_STATES.SUCCESS, 'level 2 SUCCESS is not upgraded')
  t.is(entry.verification.state, VERIFICATION_STATES.UNVERIFIED)
  t.is(entry.verification.observed, 2000, 'last reading reported')
  t.ok(telemetry.pulls.length > 1, 'kept reading back during the window')
})

test('csm - unconfirmed TIMEOUT is read back too', async (t) => {
  const bee = await createTestBee(t)
  const telemetry = telemetryReturning(2500)
  const csm = createCSM(bee.sub('wal'), { telemetryCollector: telemetry, shouldTimeout: true })

  const commandId = await csm.enqueue({ deviceId: 'wm001', command: 'setPowerLimit', params: { limit_watts: 2500 }, requesterId: 'test', verify: VERIFY })
  const entry = await waitForVerification(csm, commandId)

  t.is(entry.state, COMMAND_STATES.TIMEOUT)
  t.is(entry.error, 'ERR_COMMAND_UNCONFIRMED')
  t.is(entry.verification.state, VERIFICATION_STATES.VERIFIED, 'device reached the requested state')
})

test('csm - FAILED command is not read back', async (t) => {
  const bee = await createTestBee(t)
  const telemetry = telemetryReturning(2500)
  const csm = createCSM(bee.sub('wal'), {
    telemetryCollector: telemetry,
    sendFn: () => ({ payload: { status: 'FAILED', error: 'ERR_DEVICE_OFFLINE' } })
  })

  const commandId = await csm.enqueue({ deviceId: 'wm001', command: 'setPowerLimit', params: { limit_watts: 2500 }, requesterId: 'test', verify: VERIFY })
  await waitForCommand(csm, commandId)
  await new Promise(resolve => setTimeout(resolve, 30))

  const entry = await csm.getState(commandId)
  t.is(entry.state, COMMAND_STATES.FAILED)
  t.is(entry.verification, undefined, 'no verification for FAILED')
  t.is(telemetry.pulls.length, 0)
})

test('csm - drain clears all commands from memory', async (t) => {
  const bee = await createTestBee(t)
  const csm = createCSM(bee.sub('wal'), { noWorker: true })

  await csm.enqueue({ deviceId: 'wm001', command: 'reboot', params: {}, requesterId: 'test' })
  await new Promise(resolve => setImmediate(resolve))

  await csm.drain()
  t.is(csm._commands.size, 0, 'all commands cleared from memory')
})

test('csm - drain marks EXECUTING command TIMEOUT in WAL with ERR_KERNEL_SHUTDOWN', async (t) => {
  const bee = await createTestBee(t)
  const walStore = bee.sub('wal')
  const csm = createCSM(walStore)

  // Inject an EXECUTING entry directly into the CSM
  const entry = {
    state: COMMAND_STATES.EXECUTING,
    deviceId: 'wm001',
    command: 'reboot',
    params: {},
    retries: 2,
    createdAt: Date.now()
  }
  csm._commands.set('cmd-exec', entry)
  await csm.wal.append('cmd-exec', entry)

  await csm.drain()

  const walEntry = await csm.wal.get('cmd-exec')
  t.ok(walEntry, 'WAL entry persisted')
  t.is(walEntry.state, COMMAND_STATES.TIMEOUT, 'EXECUTING → TIMEOUT on drain')
  t.is(walEntry.error, 'ERR_KERNEL_SHUTDOWN', 'error set to ERR_KERNEL_SHUTDOWN')
  t.alike(walEntry.verification, { state: VERIFICATION_STATES.NOT_DECLARED })
  t.is(csm._commands.size, 0, 'commands cleared')
})

test('csm - drain marks DISPATCHED command TIMEOUT in WAL', async (t) => {
  const bee = await createTestBee(t)
  const walStore = bee.sub('wal')
  const csm = createCSM(walStore)

  const entry = {
    state: COMMAND_STATES.DISPATCHED,
    deviceId: 'wm001',
    command: 'setPowerMode',
    params: { mode: 'low' },
    retries: 1,
    createdAt: Date.now()
  }
  csm._commands.set('cmd-disp', entry)
  await csm.wal.append('cmd-disp', entry)

  await csm.drain()

  const walEntry = await csm.wal.get('cmd-disp')
  t.is(walEntry.state, COMMAND_STATES.TIMEOUT, 'DISPATCHED → TIMEOUT on drain')
  t.is(walEntry.error, 'ERR_KERNEL_SHUTDOWN')
})

test('csm - drain does not overwrite QUEUED entry in WAL', async (t) => {
  const bee = await createTestBee(t)
  const walStore = bee.sub('wal')
  const csm = createCSM(walStore, { noWorker: true })

  const commandId = await csm.enqueue({ deviceId: 'wm001', command: 'reboot', params: {}, requesterId: 'test' })
  await new Promise(resolve => setImmediate(resolve))

  await csm.drain()

  const walEntry = await csm.wal.get(commandId)
  t.ok(walEntry, 'QUEUED WAL entry survives drain')
  t.is(walEntry.state, COMMAND_STATES.QUEUED, 'QUEUED state preserved for next recover()')
})

test('csm - _dispatch on draining CSM exits without WAL write', async (t) => {
  const bee = await createTestBee(t)
  const walStore = bee.sub('wal')

  let sendCalled = false
  const csm = createCSM(walStore, {
    sendFn: async () => {
      sendCalled = true
      return { payload: { status: 'SUCCESS', result: {} } }
    }
  })

  csm._draining = true

  const entry = {
    state: COMMAND_STATES.QUEUED,
    deviceId: 'wm001',
    command: 'reboot',
    params: {},
    retries: 3,
    createdAt: Date.now()
  }
  csm._commands.set('cmd-drain', entry)
  await csm.wal.append('cmd-drain', entry)

  await csm._dispatch('cmd-drain', entry)

  t.absent(sendCalled, 'workerChannel.send not called when draining')
  const walEntry = await csm.wal.get('cmd-drain')
  t.is(walEntry.state, COMMAND_STATES.QUEUED, 'WAL entry unchanged — dispatch bailed immediately')
})

test('csm - drain sets _draining flag', async (t) => {
  const bee = await createTestBee(t)
  const csm = createCSM(bee.sub('wal'))

  t.absent(csm._draining, 'not draining before drain()')
  await csm.drain()
  t.ok(csm._draining, '_draining set after drain()')
})
