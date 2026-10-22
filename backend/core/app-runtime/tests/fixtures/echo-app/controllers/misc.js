'use strict'

const gw = require('@tetherto/mdk-gateway/plugin')

// Counts module loads, so a test can tell that a process never loaded the app.
globalThis.__echoAppLoads = (globalThis.__echoAppLoads || 0) + 1

let calls = 0

async function whoami (req) {
  return { info: req._info }
}

// A cache hit is visible as an unchanged n.
async function counter (req) {
  return { n: ++calls, k: req.query.k }
}

// Answers after `query.ms` milliseconds.
async function slow (req) {
  const ms = Number(req.query.ms) || 0
  await new Promise((resolve) => setTimeout(resolve, ms))
  return { waited: ms }
}

// Never returns the secret key: only what proves the identity is well formed.
async function config () {
  const { kernelKeyPair, ...rest } = gw.config
  return {
    ...rest,
    kernelPublicKey: kernelKeyPair.publicKey.toString('hex'),
    kernelKeyPairKeys: Object.keys(kernelKeyPair),
    kernelKeyPairFrozen: Object.isFrozen(kernelKeyPair),
    kernelSecretMatchesPublic: Buffer.compare(kernelKeyPair.secretKey.subarray(32), kernelKeyPair.publicKey) === 0
  }
}

async function failSafe () {
  const err = new Error('ERR_ECHO_REJECTED: nope')
  err.statusCode = 422
  throw err
}

async function failMasked () {
  throw new Error('secret internals: db password is hunter2')
}

async function failMasked503 () {
  const err = new Error('upstream exploded at 10.0.0.7')
  err.statusCode = 503
  throw err
}

module.exports = { whoami, counter, slow, config, failSafe, failMasked, failMasked503 }
