'use strict'

const test = require('brittle')
const { createDataProxy } = require('../../../workers/lib/data.proxy')

const createCtx = (jRequest, overrides = {}) => ({
  conf: { kernels: { 'cluster-1': { rpcPublicKey: 'key-1' } } },
  net_r0: { jRequest },
  ...overrides
})

test('requestData collects one result per kernel', async (t) => {
  const ctx = createCtx(async () => ({ ok: true }))
  const proxy = createDataProxy(ctx)

  const results = await proxy.requestData('listWorkers', {})
  t.alike(results, [{ ok: true }], 'should return the rpc response per kernel')
})

test('requestData pushes rpc errors as error entries', async (t) => {
  const ctx = createCtx(async () => { throw new Error('ERR_RPC_DOWN') })
  const proxy = createDataProxy(ctx)

  const results = await proxy.requestData('listWorkers', {})
  t.alike(results, [{ error: 'ERR_RPC_DOWN' }], 'should surface the error message')
})

test('requestData routes results through a custom errorHandler', async (t) => {
  const ctx = createCtx(async () => ({ value: 7 }))
  const proxy = createDataProxy(ctx)

  const results = await proxy.requestData('listWorkers', {}, (res, acc) => {
    acc.push({ wrapped: res.value })
  })
  t.alike(results, [{ wrapped: 7 }], 'should apply the errorHandler to each response')
})

test('requestDataMap maps kernels and propagates rejections', async (t) => {
  const okCtx = createCtx(async (key, method) => `${method}-done`)
  const okProxy = createDataProxy(okCtx)
  t.alike(await okProxy.requestDataMap('tailLog', {}), ['tailLog-done'], 'should map the rpc response')

  const badCtx = createCtx(async () => { throw new Error('ERR_RPC_DOWN') })
  const badProxy = createDataProxy(badCtx)
  await t.exception(badProxy.requestDataMap('tailLog', {}), /ERR_RPC_DOWN/, 'should reject on rpc failure')
})

test('requestDataAllPages pages until a short batch', async (t) => {
  const pages = [[1, 2], [3]]
  let call = 0
  const ctx = createCtx(async (key, method, params) => {
    t.is(params.limit, 2, 'should request the page limit')
    return pages[call++] || []
  })
  const proxy = createDataProxy(ctx)

  const results = await proxy.requestDataAllPages('listThings', {}, 2)
  t.alike(results, [[1, 2, 3]], 'should concatenate pages per kernel')
})

test('non-rpc mode calls the in-process kernel directly', async (t) => {
  const kernel = { listWorkers: async (params) => ({ direct: true, params }) }
  const ctx = createCtx(async () => t.fail('rpc must not be used'), { isRpcMode: false, kernel })
  const proxy = createDataProxy(ctx)

  t.alike(await proxy.requestData('listWorkers', { a: 1 }), { direct: true, params: { a: 1 } }, 'requestData uses the kernel')
  t.alike(await proxy.requestDataMap('listWorkers', {}), { direct: true, params: {} }, 'requestDataMap uses the kernel')
  t.alike(await proxy.requestDataAllPages('listWorkers', {}), { direct: true, params: {} }, 'requestDataAllPages uses the kernel')
})
