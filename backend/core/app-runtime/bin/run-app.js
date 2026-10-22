#!/usr/bin/env node
'use strict'

// Entry point for a supervised app-runtime child process. The supervisor (the
// CLI) passes createAppRuntime's options as JSON in MDK_APP_RUNTIME_OPTIONS
// (kernelKey / allowedKeys as hex strings) and listens for IPC messages:
//   { type: 'ready', publicKey: <hex> }   serving
//   { type: 'error', message }            start failed (process exits 1)
// SIGTERM, SIGINT or IPC disconnect stop the runtime and exit 0.
// `--help` / `-h` prints usage and exits 0.

const ENV_OPTIONS = 'MDK_APP_RUNTIME_OPTIONS'

const USAGE = `Usage: ${ENV_OPTIONS}='<json>' mdk-app-runtime

Runs one MDK app runtime: loads the app at options.appDir and serves its
routes over HRPC until SIGTERM, SIGINT or IPC disconnect.

${ENV_OPTIONS} holds the createAppRuntime() options as a JSON object
(name, appDir, storeDir, kernelKey, allowedKeys, allowedKeyFiles, keyFile, ...;
keys as hex strings). It is removed from the environment before the app loads.
Normally started by \`mdk run\`, which sets it.

Options:
  -h, --help  Print this help and exit
`

function _defaultIo () {
  return {
    send: typeof process.send === 'function' ? (msg) => process.send(msg) : null,
    stdout: (text) => process.stdout.write(text),
    stderr: (line) => process.stderr.write(line + '\n'),
    exit: (code) => process.exit(code),
    on: (event, fn) => process.on(event, fn)
  }
}

async function main (env, io, argv) {
  env = env || process.env
  io = { ..._defaultIo(), ...io }

  if ((argv || []).some((arg) => arg === '--help' || arg === '-h')) {
    io.stdout(USAGE)
    io.exit(0)
    return null
  }

  let runtime = null
  const fail = (err) => {
    const message = (err && err.message) || String(err)
    if (io.send) {
      try { io.send({ type: 'error', message }) } catch {}
    }
    io.stderr(`mdk-app-runtime: ${message}`)
    io.exit(1)
    return null
  }

  let options
  try {
    if (!env[ENV_OPTIONS]) throw new Error(`ERR_APP_RUNTIME_OPTIONS_REQUIRED: set ${ENV_OPTIONS}`)
    try {
      options = JSON.parse(env[ENV_OPTIONS])
    } catch (err) {
      throw new Error(`ERR_APP_RUNTIME_OPTIONS_INVALID: ${ENV_OPTIONS} is not valid JSON`)
    }
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new Error(`ERR_APP_RUNTIME_OPTIONS_INVALID: ${ENV_OPTIONS} must be a JSON object`)
    }
    // The options carry the app's config: keep it out of anything the app spawns.
    delete env[ENV_OPTIONS]
  } catch (err) {
    return fail(err)
  }

  let publicKey
  try {
    const { createAppRuntime } = require('../lib/runtime')
    runtime = createAppRuntime(options)
    publicKey = (await runtime.start()).publicKey
  } catch (err) {
    if (runtime) await runtime.stop().catch(() => {})
    return fail(err)
  }

  let stopping = null
  const shutdown = () => {
    if (!stopping) {
      stopping = runtime.stop().then(() => io.exit(0), (err) => {
        io.stderr(`mdk-app-runtime: stop failed: ${err && err.message}`)
        io.exit(1)
      })
    }
    return stopping
  }
  io.on('SIGTERM', shutdown)
  io.on('SIGINT', shutdown)
  io.on('disconnect', shutdown)

  if (io.send) {
    try {
      io.send({ type: 'ready', publicKey: publicKey.toString('hex') })
    } catch {
      // The supervisor's IPC channel is gone; nobody is waiting for this runtime.
      shutdown()
    }
  }
  return { runtime, shutdown }
}

module.exports = { main, ENV_OPTIONS, USAGE }

if (require.main === module) {
  main(process.env, undefined, process.argv.slice(2)).catch((err) => {
    process.stderr.write(`mdk-app-runtime: ${err && err.message}\n`)
    process.exit(1)
  })
}
