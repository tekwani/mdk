'use strict'

// Device spec for `mdk validate worker --path . --smoke`: setup() starts the
// simulator from mock/server.js and returns how to reach it, one sample param
// set per command to execute, and teardown() to stop it. After teardown() the
// smoke run checks that every handler fails with an ERR_* instead of hanging
// or returning a stale value.
//
// reboot is left out of `commands` on purpose: nobody watches the device
// during an automated smoke run, so keep commands that interrupt it out.
// A telemetry channel served from the worker's own store (a `history` log,
// say) keeps answering after teardown(); list it as
// `offlineTelemetry: ['history']` next to `teardown`.

const { once } = require('node:events')
const { createServer } = require('./mock/server')

module.exports = {
  async setup () {
    const mock = createServer({ host: '127.0.0.1', port: 0, serial: 'SMOKE-0' })
    await once(mock.server, 'listening')

    return {
      config: { host: '127.0.0.1', port: mock.server.address().port },
      commands: {
        setPowerMode: { mode: 'normal' }
      },
      teardown: () => mock.exit()
    }
  }
}
