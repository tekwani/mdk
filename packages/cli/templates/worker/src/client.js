'use strict'

const { opts, env, config, logger } = require('@tetherto/mdk-worker/device')

// The "vendor SDK" for your device's own HTTP JSON API. Plain device I/O — no
// MDK concepts, no base classes. This is all a plugin author writes to talk
// to their own device; replace it with your real protocol.
//
// The runtime loads this module fresh into a private registry per device, so
// binding directly to the ambient device module here — rather than exporting
// a `createClient(opts)` factory for a caller to invoke — already yields one
// client per device with no extra plumbing.
// Log only non-secret fields and key names: `env` carries credentials such as
// DEVICE_TOKEN, and `opts`/`config` may too — never log their values.
logger('config received: host=%s port=%s env keys=%o config keys=%o',
  opts.host, opts.port, Object.keys(env || {}), Object.keys(config || {}))

const base = `http://${opts.host || '127.0.0.1'}:${opts.port}`
const auth = env.DEVICE_TOKEN ? { authorization: `Bearer ${env.DEVICE_TOKEN}` } : {}

const call = async (path, callOpts) => {
  let res, body
  try {
    res = await fetch(base + path, { ...callOpts, headers: { ...auth, ...(callOpts && callOpts.headers) } })
    body = await res.json()
  } catch (err) {
    // An unreachable device or a non-JSON reply: surface it as this plugin's
    // own error code, not fetch's bare "fetch failed".
    throw new Error(`ERR_DEVICE_CALL_FAILED: ${(err.cause && err.cause.code) || err.message}`)
  }
  if (!res.ok || body.ok === false) {
    throw new Error(body.error || `ERR_DEVICE_CALL_FAILED: ${res.status}`)
  }
  return body
}

const command = (cmd, args) => call('/api/v3/command', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ cmd, ...args })
})

module.exports = {
  getSummary: () => call('/api/v3/summary'),
  reboot: () => command('reboot'),
  setPowerMode: (mode) => command('set-power-mode', { mode })
}
