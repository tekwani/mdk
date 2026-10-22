'use strict'

const test = require('brittle')
const { ACTIONS, MESSAGE_TYPES } = require('../../lib/protocol/actions')
const { build } = require('../../lib/protocol/envelope')
const { routeEnvelope } = require('../../lib/transport/envelope-router')

function createDeps (actionManagerOverrides = {}) {
  const calls = { push: [], vote: [], query: [], cancel: [] }
  const actionManager = {
    pushAction: async (payload) => {
      calls.push.push(payload)
      return { id: 123, data: { id: 123 }, errors: [] }
    },
    pushActionsBatch: async (payload) => {
      calls.push.push(payload)
      return [{ id: 124 }]
    },
    getAction: async (payload) => ({ id: payload.id, type: payload.type }),
    getActionsBatch: async (payload) => [{ id: payload.ids[0], type: 'voting' }],
    queryActions: async (payload) => {
      calls.query.push(payload)
      return { voting: [] }
    },
    voteAction: async (payload) => {
      calls.vote.push(payload)
      return 1
    },
    cancelActionsBatch: async (payload) => {
      calls.cancel.push(payload)
      return ['cancelled']
    },
    ...actionManagerOverrides
  }

  return {
    calls,
    deps: {
      dispatcher: { dispatch: async () => ({ status: 'QUEUED' }) },
      telemetryCollector: { pull: async () => ({}), pullState: async () => ({}) },
      registry: {
        listWorkers: () => [{ workerId: 'w-1' }],
        getCapabilities: () => ({ commands: [] }),
        terminate: async () => {}
      },
      actionManager
    }
  }
}

test('envelope router - routes action.push to action manager', async (t) => {
  const { calls, deps } = createDeps()
  const envelope = build({
    action: ACTIONS.ACTION_PUSH,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway',
    payload: {
      query: { id: 'dev-1' },
      action: 'reboot',
      params: [],
      voter: 'user@example.com',
      authPerms: ['miner:w']
    }
  })

  const result = await routeEnvelope(envelope, deps)
  t.is(calls.push.length, 1)
  t.is(calls.push[0].action, 'reboot')
  t.is(result.id, 123)
})

test('envelope router - routes all action lifecycle envelopes', async (t) => {
  const { calls, deps } = createDeps()

  await routeEnvelope(build({
    action: ACTIONS.ACTION_PUSH_BATCH,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway',
    payload: { batchActionsPayload: [], voter: 'user@example.com', authPerms: [] }
  }), deps)
  t.is(calls.push.length, 1)

  const getRes = await routeEnvelope(build({
    action: ACTIONS.ACTION_GET,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway',
    payload: { id: 7, type: 'voting' }
  }), deps)
  t.is(getRes.id, 7)

  const batchRes = await routeEnvelope(build({
    action: ACTIONS.ACTION_GET_BATCH,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway',
    payload: { ids: [8] }
  }), deps)
  t.is(batchRes[0].id, 8)

  await routeEnvelope(build({
    action: ACTIONS.ACTION_QUERY,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway',
    payload: { queries: [{ type: 'voting' }] }
  }), deps)
  t.is(calls.query.length, 1)

  const voteRes = await routeEnvelope(build({
    action: ACTIONS.ACTION_VOTE,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway',
    payload: { id: 9, voter: 'user@example.com', approve: true, authPerms: ['miner:w'] }
  }), deps)
  t.is(voteRes, 1)
  t.is(calls.vote[0].id, 9)

  const cancelRes = await routeEnvelope(build({
    action: ACTIONS.ACTION_CANCEL_BATCH,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway',
    payload: { ids: [10], voter: 'user@example.com' }
  }), deps)
  t.alike(cancelRes, ['cancelled'])
})

test('envelope router - still routes worker and command envelopes', async (t) => {
  const { deps } = createDeps()
  let terminated = null
  deps.registry.terminate = async (workerId) => { terminated = workerId }

  const workers = await routeEnvelope(build({
    action: ACTIONS.WORKER_LIST,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway'
  }), deps)
  t.is(workers.workers.length, 1)

  const terminateRes = await routeEnvelope(build({
    action: ACTIONS.WORKER_TERMINATE,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway',
    payload: { workerId: 'w-1' }
  }), deps)
  t.is(terminated, 'w-1')
  t.is(terminateRes.status, 'TERMINATED')
})

const CALLER_KEY = 'ab'.repeat(32)

test('envelope router - rejects a payload that fails its schema (validateFull)', async (t) => {
  const { calls, deps } = createDeps()
  const res = await routeEnvelope(build({
    action: ACTIONS.ACTION_PUSH,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway',
    payload: { action: 'reboot', voter: 'u', authPerms: [], params: [] }
  }), deps)
  t.is(res.error, 'ERR_PAYLOAD_QUERY_REQUIRED')
  t.is(calls.push.length, 0, 'action manager never reached')
})

test('envelope router - rejects oversized arrays', async (t) => {
  const { deps } = createDeps()
  const res = await routeEnvelope(build({
    action: ACTIONS.ACTION_GET_BATCH,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway',
    payload: { ids: new Array(5000).fill(1) }
  }), deps)
  t.ok(/ERR_PAYLOAD_IDS_TOO_MANY/.test(res.error))
})

test('envelope router - read-only caller cannot command, vote or terminate', async (t) => {
  const { calls, deps } = createDeps()
  const caller = { publicKey: CALLER_KEY, roles: ['read'] }

  const list = await routeEnvelope(build({ action: ACTIONS.WORKER_LIST, type: MESSAGE_TYPES.REQUEST, sender: 'x' }), deps, caller)
  t.is(list.workers.length, 1, 'read allowed')

  const cmd = await routeEnvelope(build({
    action: ACTIONS.COMMAND_REQUEST, type: MESSAGE_TYPES.REQUEST, sender: 'x', deviceId: 'd', payload: { command: 'reboot' }
  }), deps, caller)
  t.ok(/ERR_KERNEL_ACTION_FORBIDDEN/.test(cmd.error))

  const vote = await routeEnvelope(build({
    action: ACTIONS.ACTION_VOTE, type: MESSAGE_TYPES.REQUEST, sender: 'x', payload: { id: 1, voter: 'v', approve: true, authPerms: [] }
  }), deps, caller)
  t.ok(/ERR_KERNEL_ACTION_FORBIDDEN/.test(vote.error))
  t.is(calls.vote.length, 0)

  const term = await routeEnvelope(build({
    action: ACTIONS.WORKER_TERMINATE, type: MESSAGE_TYPES.REQUEST, sender: 'x', payload: { workerId: 'w-1' }
  }), deps, { publicKey: CALLER_KEY, roles: ['write'] })
  t.ok(/requires role admin/.test(term.error), 'terminate needs admin')
})

test('envelope router - non-admin caller votes and requests as its transport key', async (t) => {
  const { calls, deps } = createDeps()
  let dispatchOpts = null
  deps.dispatcher.dispatch = async (_env, opts) => { dispatchOpts = opts; return { status: 'QUEUED' } }
  const caller = { publicKey: CALLER_KEY, roles: ['write'] }

  await routeEnvelope(build({
    action: ACTIONS.ACTION_VOTE, type: MESSAGE_TYPES.REQUEST, sender: 'x', payload: { id: 1, voter: 'someone-else', approve: true, authPerms: [] }
  }), deps, caller)
  t.is(calls.vote[0].voter, CALLER_KEY, 'self-asserted voter replaced')

  await routeEnvelope(build({
    action: ACTIONS.COMMAND_REQUEST, type: MESSAGE_TYPES.REQUEST, sender: 'spoofed', deviceId: 'd', payload: { command: 'reboot' }
  }), deps, caller)
  t.is(dispatchOpts.requesterId, CALLER_KEY, 'requester is the transport key, not envelope.sender')
})

test('envelope router - admin caller keeps the delegated payload voter', async (t) => {
  const { calls, deps } = createDeps()
  await routeEnvelope(build({
    action: ACTIONS.ACTION_VOTE, type: MESSAGE_TYPES.REQUEST, sender: 'gateway', payload: { id: 1, voter: 'user@example.com', approve: true, authPerms: [] }
  }), deps, { publicKey: CALLER_KEY, roles: ['admin'] })
  t.is(calls.vote[0].voter, 'user@example.com')
})
