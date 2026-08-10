'use strict'

const test = require('brittle')
const ModbusTransport = require('../../../transports/modbus.transport')

function makeMock () {
  return { ctx: {}, state: {} }
}

// modbus-stream is a leaf-package dependency resolved via BaseTransport#_require, not a
// dependency of this shared framework package — stub it rather than adding a real dep here.
function fakeModbusStream (fakeServer) {
  return {
    tcp: {
      server: (opts, onConnection) => {
        fakeServer.onConnection = onConnection
        return fakeServer
      }
    }
  }
}

test('listen() creates a modbus TCP server and binds incoming connections', (t) => {
  const listenCalls = []
  const fakeServer = {
    listen: (port, host) => { listenCalls.push([port, host]); return fakeServer }
  }

  const boundConnections = []
  const transport = new ModbusTransport(makeMock(), { bind: (conn) => boundConnections.push(conn) })
  transport._require = (id) => {
    t.is(id, 'modbus-stream', 'requests the modbus-stream module')
    return fakeModbusStream(fakeServer)
  }

  const result = transport.listen('127.0.0.1', 5020)

  t.alike(listenCalls, [[5020, '127.0.0.1']], 'listens on the given host/port')
  t.is(result, fakeServer, 'returns the underlying modbus server')
  t.is(transport.server, fakeServer, 'stores the server on the transport')

  fakeServer.onConnection('fake-connection')
  t.alike(boundConnections, ['fake-connection'], 'bind() is invoked for each incoming connection')
  t.pass()
})
