'use strict'

const test = require('brittle')
const { ActionCaller } = require('../../lib/modules/action-caller')
const { createActionCallerProxy } = require('../../lib/modules/action-manager/caller-proxy')

function createCaller (opts = {}) {
  const workers = opts.workers || []
  const registry = {
    getReadyWorkers: () => workers,
    resolveWorkerForDevice: (id) => {
      const w = workers.find((w) => (w.deviceIds || []).includes(id))
      return w ? { workerId: w.workerId } : null
    }
  }
  const workerChannel = {
    send: async () => ({
      payload: { calls: [{ id: 'dev-1', tags: [] }], reqVotes: 1 }
    })
  }
  const dispatcher = {
    dispatch: async () => ({ commandId: 'cmd-99', status: 'QUEUED' })
  }
  return new ActionCaller({ registry, workerChannel, dispatcher, ...opts.callerOpts })
}

test('action caller proxy - exposes action names as callTargets methods', async (t) => {
  const caller = createCaller({
    workers: [{
      workerId: 'miner-worker',
      deviceFamily: 'miner',
      channel: { id: 'ch-1' },
      deviceIds: ['dev-1']
    }]
  })

  const proxy = createActionCallerProxy(caller)
  const targets = { 'miner-worker': { calls: [{ id: 'dev-1', tags: [] }] } }

  await proxy.reboot([{ mode: 'eco' }], targets)
  t.is(targets['miner-worker'].calls[0].commandId, 'cmd-99')
})

test('action caller proxy - never exposes real ActionCaller methods', async (t) => {
  const seen = []
  const caller = {
    getWriteCalls: () => { throw new Error('must not be reached') },
    _callTarget: () => { throw new Error('must not be reached') },
    callTargets: async (action, params, targets) => { seen.push(action) }
  }
  const proxy = createActionCallerProxy(caller)

  for (const name of ['getWriteCalls', '_callTarget', 'callTargets', 'constructor', '__proto__']) {
    await proxy[name]([], {})
  }
  t.alike(seen, ['getWriteCalls', '_callTarget', 'callTargets', 'constructor', '__proto__'])
  t.is(proxy.then, undefined, 'not a thenable')
  t.absent(Array.isArray(proxy))
})
