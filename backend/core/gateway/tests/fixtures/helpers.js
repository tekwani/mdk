'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')

const ECHO_APP = path.join(__dirname, 'echo-app')

function tmpDir (t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-gateway-'))
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))
  return dir
}

function capturingLogger () {
  const lines = []
  const logger = {}
  for (const level of ['error', 'warn', 'info', 'debug', 'trace', 'fatal']) {
    logger[level] = (...args) => lines.push(`${level}:${args.join(' ')}`)
  }
  logger.child = () => logger
  logger.lines = lines
  return logger
}

module.exports = { ECHO_APP, tmpDir, capturingLogger }
