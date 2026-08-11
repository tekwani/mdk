'use strict'

const test = require('brittle')
const path = require('path')
const HttpTransport = require('../../../transports/http.transport')

function makeMock (ctx = {}, state = {}) {
  return { constructor: { dir: path.join(__dirname, '..', '..', '..') }, ctx, state }
}

test('listen() boots a fastify app, registers routes, and exposes ctx/state per request', async (t) => {
  let seen
  const transport = new HttpTransport(makeMock({ host: '127.0.0.1' }, { on: true }), {
    routes: (app) => {
      app.get('/status', async (req) => {
        seen = { ctx: req.ctx, state: req.state }
        return { ok: true }
      })
    }
  })

  const app = transport.listen('127.0.0.1', 0)
  t.is(app, transport.server, 'listen() returns the fastify app, stored as .server')
  await transport.ready

  const res = await app.inject({ method: 'GET', url: '/status' })
  t.is(res.statusCode, 200)
  t.alike(JSON.parse(res.payload), { ok: true })
  t.alike(seen.state, { on: true }, 'onRequest hook attaches mock state to the request')

  await transport.close()
  t.pass()
})

test('auth(app) is invoked at boot when provided', async (t) => {
  let authCalledWith = null
  const transport = new HttpTransport(makeMock(), {
    routes: (app) => { app.get('/x', async () => ({})) },
    auth: (app) => { authCalledWith = app }
  })
  const app = transport.listen('127.0.0.1', 0)
  await transport.ready
  t.is(authCalledWith, app)
  await transport.close()
  t.pass()
})

test('onSend hook delays the response when ctx.delay is set', async (t) => {
  const transport = new HttpTransport(makeMock({ delay: 30 }), {
    routes: (app) => { app.get('/slow', async () => ({ slow: true })) }
  })
  transport.listen('127.0.0.1', 0)
  await transport.ready

  const start = Date.now()
  const res = await transport.server.inject({ method: 'GET', url: '/slow' })
  const elapsed = Date.now() - start
  t.is(res.statusCode, 200)
  t.ok(elapsed >= 25, 'response should be delayed by roughly ctx.delay ms')

  await transport.close()
  t.pass()
})

test('onClose hook fires when provided and the app closes', async (t) => {
  let resolveClosed
  const closed = new Promise((resolve) => { resolveClosed = resolve })
  const transport = new HttpTransport(makeMock(), {
    routes: (app) => { app.get('/x', async () => ({})) },
    onClose: () => resolveClosed()
  })
  transport.listen('127.0.0.1', 0)
  await transport.ready

  transport.close()
  await closed
  t.pass()
})

test('listening getter reflects the underlying HTTP server state', async (t) => {
  const transport = new HttpTransport(makeMock(), {
    routes: (app) => { app.get('/x', async () => ({})) }
  })
  t.absent(transport.listening, 'false before listen()')
  transport.listen('127.0.0.1', 0)
  await transport.ready
  t.ok(transport.listening, 'true once listening')

  const originalClose = transport.server.close.bind(transport.server)
  let closePromise
  transport.server.close = (...args) => { closePromise = originalClose(...args); return closePromise }

  t.execution(() => transport.close(), 'close() should not throw')
  await closePromise
  t.absent(transport.listening, 'false again after the app finishes closing')
  t.pass()
})
