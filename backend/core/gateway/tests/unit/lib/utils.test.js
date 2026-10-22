'use strict'

const test = require('brittle')
const path = require('path')
const { getRpcTimeout, resolveStoreDir } = require('../../../workers/lib/utils')
const { RPC_TIMEOUT } = require('../../../workers/lib/constants')

test('getRpcTimeout - with custom timeout in conf', (t) => {
  const result = getRpcTimeout({ rpcTimeout: 30000 })

  t.is(result, 30000, 'should return custom timeout')
})

test('getRpcTimeout - without custom timeout in conf', (t) => {
  const result = getRpcTimeout({})

  t.is(result, RPC_TIMEOUT, 'should return default timeout')
})

test('getRpcTimeout - with zero timeout in conf', (t) => {
  const result = getRpcTimeout({ rpcTimeout: 0 })

  t.is(result, RPC_TIMEOUT, 'should fall back to default for falsy timeout')
})

test('resolveStoreDir - anchors the working-directory default under ctx.root', (t) => {
  t.is(resolveStoreDir('store/http', { root: '/data/gateway' }), path.join('/data/gateway', 'store', 'http'))
})

test('resolveStoreDir - prefers ctx.tmpdir outside test env', (t) => {
  t.is(resolveStoreDir('store/http', { root: '/data/gateway', tmpdir: '/tmp/gw' }), path.join('/tmp/gw', 'store', 'http'))
})

test('resolveStoreDir - leaves the test-env tmpdir placement alone', (t) => {
  t.is(resolveStoreDir('tests/integration/store/http', { env: 'test', tmpdir: 'tests/integration', root: '/svc' }), 'tests/integration/store/http')
})

test('resolveStoreDir - keeps an absolute path, and a relative one with no base', (t) => {
  t.is(resolveStoreDir('/abs/store/http', { root: '/data/gateway' }), '/abs/store/http')
  t.is(resolveStoreDir('store/http', {}), 'store/http')
})
