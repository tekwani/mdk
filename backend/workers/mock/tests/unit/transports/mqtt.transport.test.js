'use strict'

const test = require('brittle')
const { EventEmitter } = require('events')
const MqttTransport = require('../../../transports/mqtt.transport')

function makeMock (ctx = {}, state = {}) {
  return { ctx, state }
}

// mqtt is a leaf-package dependency resolved via BaseTransport#_require, not a dependency of
// this shared framework package — stub it with a minimal EventEmitter-based fake client.
class FakeMqttClient extends EventEmitter {
  constructor () {
    super()
    this.connected = true
    this.ended = false
  }

  end (force) {
    this.ended = true
    this.connected = false
    this.emit('end')
  }
}

function fakeMqtt (client) {
  return { connect: (url) => { client.connectedTo = url; return client } }
}

test('listen() connects the mqtt client and runs the emitter handler', (t) => {
  const client = new FakeMqttClient()
  const emitterCalls = []
  const transport = new MqttTransport(makeMock({ ok: true }, { s: 1 }), {
    emitter: (ctx, mqttClient, state) => {
      emitterCalls.push({ ctx, mqttClient, state })
      return () => {}
    }
  })
  transport._require = (id) => {
    t.is(id, 'mqtt', 'requests the mqtt module')
    return fakeMqtt(client)
  }

  const result = transport.listen('127.0.0.1', 10883)

  t.is(client.connectedTo, 'mqtt://127.0.0.1:10883', 'connects to the given host/port')
  t.is(result, transport, 'listen() returns the transport itself')
  t.is(emitterCalls.length, 1)
  t.is(emitterCalls[0].mqttClient, client)
  t.alike(emitterCalls[0].ctx, { ok: true })
  t.alike(emitterCalls[0].state, { s: 1 })
  t.pass()
})

test('listening getter reflects client.connected', (t) => {
  const client = new FakeMqttClient()
  const transport = new MqttTransport(makeMock(), { emitter: () => () => {} })
  transport._require = () => fakeMqtt(client)
  t.absent(transport.listening, 'false before listen()')
  transport.listen('127.0.0.1', 10883)
  t.ok(transport.listening, 'true once connected')
  client.connected = false
  t.absent(transport.listening, 'false once client reports disconnected')
  t.pass()
})

test('the client "end" event runs cleanup exactly once', (t) => {
  const client = new FakeMqttClient()
  let cleanupCalls = 0
  const transport = new MqttTransport(makeMock(), {
    emitter: () => () => { cleanupCalls++ }
  })
  transport._require = () => fakeMqtt(client)
  transport.listen('127.0.0.1', 10883)

  client.emit('end')
  t.is(cleanupCalls, 1, 'cleanup ran once on end')
  t.is(transport._cleanup, null, 'cleanup reference is cleared after running')

  transport._runCleanup()
  t.is(cleanupCalls, 1, 'running cleanup again is a no-op once cleared')
  t.pass()
})

test('close() force-ends the client and runs cleanup', (t) => {
  const client = new FakeMqttClient()
  let cleanupCalls = 0
  const transport = new MqttTransport(makeMock(), {
    emitter: () => () => { cleanupCalls++ }
  })
  transport._require = () => fakeMqtt(client)
  transport.listen('127.0.0.1', 10883)

  transport.close()
  t.ok(client.ended, 'client.end(true) was called')
  t.is(cleanupCalls, 1, 'cleanup ran as part of close()')
  t.pass()
})

test('close() is safe to call when there is no client (never listened)', (t) => {
  const transport = new MqttTransport(makeMock(), { emitter: () => () => {} })
  t.execution(() => transport.close())
  t.pass()
})

test('emitter that returns no cleanup function is tolerated', (t) => {
  const client = new FakeMqttClient()
  const transport = new MqttTransport(makeMock(), { emitter: () => undefined })
  transport._require = () => fakeMqtt(client)
  transport.listen('127.0.0.1', 10883)
  t.execution(() => transport.close())
  t.pass()
})
