'use strict'

const path = require('path')
const { RPC_TIMEOUT } = require('./constants')

const getRpcTimeout = (conf) => {
  return conf.rpcTimeout || RPC_TIMEOUT
}

// tether-wrk-base opens the worker's corestore at `store/<name>` relative to
// the process's working directory, unless env is 'test' and ctx.tmpdir is set.
// Anchor that default to the worker's own data dir instead (ctx.tmpdir when
// given, else ctx.root), so the store sits with the rest of the gateway's
// state whatever directory the process starts in. An absolute path, or the
// base's test-env tmpdir placement, is returned unchanged.
const resolveStoreDir = (storeDir, ctx = {}) => {
  if (!storeDir || path.isAbsolute(storeDir)) return storeDir
  if (ctx.env === 'test' && ctx.tmpdir) return storeDir
  const base = ctx.tmpdir || ctx.root
  return base ? path.resolve(base, storeDir) : storeDir
}

module.exports = {
  getRpcTimeout,
  resolveStoreDir
}
