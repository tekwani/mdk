'use strict'

const test = require('brittle')
const constants = require('../../../workers/lib/constants')
const { RPC_TIMEOUT, RPC_CONCURRENCY_LIMIT, RPC_PAGE_LIMIT } = constants

test('constants - RPC_TIMEOUT', (t) => {
  t.is(RPC_TIMEOUT, 15000, 'should be 15000 milliseconds')
  t.ok(typeof RPC_TIMEOUT === 'number', 'should be number')
  t.ok(RPC_TIMEOUT > 0, 'should be positive')
})

test('constants - RPC_CONCURRENCY_LIMIT', (t) => {
  t.is(RPC_CONCURRENCY_LIMIT, 2, 'should be 2')
  t.ok(typeof RPC_CONCURRENCY_LIMIT === 'number', 'should be number')
  t.ok(RPC_CONCURRENCY_LIMIT > 0, 'should be positive')
})

test('constants - RPC_PAGE_LIMIT', (t) => {
  t.is(RPC_PAGE_LIMIT, 100, 'should be 100')
  t.ok(typeof RPC_PAGE_LIMIT === 'number', 'should be number')
  t.ok(RPC_PAGE_LIMIT > 0, 'should be positive')
})

test('constants - exports only the RPC constants', (t) => {
  t.alike(
    Object.keys(constants).sort(),
    ['RPC_CONCURRENCY_LIMIT', 'RPC_PAGE_LIMIT', 'RPC_TIMEOUT'],
    'should export exactly the three RPC constants'
  )
})
