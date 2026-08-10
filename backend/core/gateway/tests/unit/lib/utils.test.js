'use strict'

const test = require('brittle')
const { getRpcTimeout } = require('../../../workers/lib/utils')
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
