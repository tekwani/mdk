'use strict'

const test = require('brittle')
const path = require('path')
const BaseTransport = require('../../../transports/base.transport')

test('ctx/state getters proxy to the owning mock', (t) => {
  const mock = { ctx: { host: '127.0.0.1' }, state: { on: true } }
  const transport = new BaseTransport(mock, { onData: () => {} })
  t.is(transport.ctx, mock.ctx)
  t.is(transport.state, mock.state)
  t.is(transport.handlers.onData && typeof transport.handlers.onData, 'function')
  t.is(transport.server, null)
  t.pass()
})

test('listen() throws ERR_ABSTRACT on the base class', (t) => {
  const transport = new BaseTransport({ ctx: {}, state: {} })
  t.exception(() => transport.listen('127.0.0.1', 0), /ERR_ABSTRACT/)
  t.pass()
})

test('close() is a no-op when no server has been assigned', (t) => {
  const transport = new BaseTransport({ ctx: {}, state: {} })
  t.execution(() => transport.close())
  t.pass()
})

test('close() calls server.close() when a server is assigned', (t) => {
  const transport = new BaseTransport({ ctx: {}, state: {} })
  let closed = false
  transport.server = { close: () => { closed = true } }
  transport.close()
  t.ok(closed)
  t.pass()
})

test('listening getter reflects the server\'s listening state', (t) => {
  const transport = new BaseTransport({ ctx: {}, state: {} })
  t.absent(transport.listening, 'false with no server')
  transport.server = { listening: false }
  t.absent(transport.listening, 'false when server.listening is false')
  transport.server = { listening: true }
  t.ok(transport.listening, 'true when server.listening is true')
  t.pass()
})

test('_require() resolves modules relative to the mock package\'s server.js', (t) => {
  const mock = { constructor: { dir: path.join(__dirname, '..', '..', '..') }, ctx: {}, state: {} }
  const transport = new BaseTransport(mock)
  const pkg = transport._require('./package.json')
  t.is(pkg.name, '@tetherto/mdk-worker-mock')
  t.pass()
})
