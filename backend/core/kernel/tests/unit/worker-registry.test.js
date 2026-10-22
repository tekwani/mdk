'use strict'

const test = require('brittle')
const { WorkerRegistry } = require('../../lib/modules/worker-registry')

function createMockStore () {
  const data = new Map()
  const store = {
    puts: 0,
    async get (key) { const v = data.get(key); return v ? { value: v } : null },
    async put (key, value) { store.puts++; data.set(key, value) },
    async del (key) { data.delete(key) },
    createReadStream () {
      const entries = [...data.entries()].map(([key, value]) => ({ key, value }))
      return (async function * () { for (const e of entries) yield e })()
    }
  }
  return store
}

async function setup () {
  const store = createMockStore()
  const registry = new WorkerRegistry({ store, capabilityStore: createMockStore() })
  await registry.register({ workerId: 'w1', deviceIds: ['d1', 'd2'], rpcKey: 'aa', channel: 'ch' })
  store.puts = 0
  return { registry, store }
}

test('worker-registry - syncDeviceIds skips the store write when the device list is unchanged', async (t) => {
  const { registry, store } = await setup()

  await registry.syncDeviceIds('w1', ['d1', 'd2'], 'ch')
  await registry.syncDeviceIds('w1', ['d2', 'd1'], 'ch')

  t.is(store.puts, 0, 'same devices (any order) are not rewritten')
  t.is(registry.resolveWorkerForDevice('d1').workerId, 'w1')
  t.is(registry.resolveWorkerForDevice('d2').workerId, 'w1')
})

test('worker-registry - syncDeviceIds persists and reindexes a changed device list', async (t) => {
  const { registry, store } = await setup()

  await registry.syncDeviceIds('w1', ['d2', 'd3'], 'ch')

  t.is(store.puts, 1, 'changed list is persisted once')
  t.is(registry.resolveWorkerForDevice('d1'), null, 'removed device is unmapped')
  t.is(registry.resolveWorkerForDevice('d3').workerId, 'w1', 'added device is mapped')
  const persisted = JSON.parse((await store.get('w1')).value.toString())
  t.alike(persisted.deviceIds, ['d2', 'd3'])
})

test('worker-registry - syncDeviceIds ignores unknown workers', async (t) => {
  const { registry, store } = await setup()

  await registry.syncDeviceIds('nope', ['x'], 'ch')

  t.is(store.puts, 0)
  t.is(registry.resolveWorkerForDevice('x'), null)
})

test('worker-registry - a workerId stays bound to its first rpcKey', async (t) => {
  const { registry } = await setup()

  const hijack = await registry.register({ workerId: 'w1', deviceIds: ['d1'], rpcKey: 'evil', channel: 'ch2' })
  t.is(hijack, false, 'different key for a known workerId is rejected')
  t.is(registry.listWorkers()[0].rpcKey, 'aa')

  const same = await registry.register({ workerId: 'w1', deviceIds: ['d1', 'd2'], rpcKey: 'aa', channel: 'ch' })
  t.is(same, true, 'the bound key may re-register')

  await registry.terminate('w1')
  const rebound = await registry.register({ workerId: 'w1', deviceIds: ['d1'], rpcKey: 'bb', channel: 'ch3' })
  t.is(rebound, true, 'after an admin terminate the id can bind to a new key')
})

test('worker-registry - binding survives recover()', async (t) => {
  const { registry, store } = await setup()
  const recovered = new WorkerRegistry({ store, capabilityStore: createMockStore() })
  await recovered.recover()
  t.is(await recovered.register({ workerId: 'w1', deviceIds: ['d1'], rpcKey: 'evil', channel: 'x' }), false)
  t.ok(registry)
})

test('worker-registry - a worker cannot unmap devices another worker owns', async (t) => {
  const { registry } = await setup()
  await registry.register({ workerId: 'w2', deviceIds: ['d9'], rpcKey: 'cc', channel: 'ch9' })

  // w1 claims d9 vanished from its own list (it never owned it)
  const w1 = registry._workerIndex.get('w1')
  w1.deviceIds = ['d1', 'd2', 'd9']
  await registry.syncDeviceIds('w1', ['d1'], 'ch')
  t.is(registry.resolveWorkerForDevice('d9').workerId, 'w2', 'sync leaves the other worker mapping')

  w1.deviceIds = ['d1', 'd9']
  await registry.terminate('w1')
  t.is(registry.resolveWorkerForDevice('d9').workerId, 'w2', 'terminate leaves the other worker mapping')
  t.is(registry.resolveWorkerForDevice('d1'), null)
})
