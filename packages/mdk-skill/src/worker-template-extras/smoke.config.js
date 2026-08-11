'use strict'

// Smoke-harness glue for scripts/worker-smoke.mjs: setup() boots this
// worker's device mock and returns { config, commands, teardown }. Adapt all
// three when copying the template.

const os = require('os')
const path = require('path')
const net = require('net')

const mock = require('./mock/server')

function freePort () {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.once('error', reject)
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address()
      s.close(() => resolve(port))
    })
  })
}

module.exports = {
  setup: async () => {
    const port = await freePort()
    const handle = mock.createServer({ host: '127.0.0.1', port, serial: 'WM3-SMOKE' })
    const dbPath = path.join(os.tmpdir(), `worker-smoke-${process.pid}-${Date.now()}.db`)

    return {
      config: { host: '127.0.0.1', port, dbPath },
      commands: {
        reboot: {},
        setPowerMode: { mode: 'eco' }
      },
      teardown: async () => { handle.exit() }
    }
  }
}
