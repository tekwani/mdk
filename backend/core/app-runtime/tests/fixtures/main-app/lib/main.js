'use strict'

const state = require('./state')

async function start (config) {
  await new Promise((resolve) => setTimeout(resolve, 50))
  state.started = { label: config.label, dataDir: config.dataDir }
}

module.exports = { start }
