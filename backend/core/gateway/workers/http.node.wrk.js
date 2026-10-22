'use strict'

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const async = require('async')
const TetherWrkBase = require('@tetherto/tether-wrk-base/workers/base.wrk.tether')
const createLogger = require('debug')
const debug = createLogger('store:aggr')
const { createRuntimeClient, getOrCreateSeed, resolvePluginDir } = require('@tetherto/mdk-app-runtime')
const { loadPlugin } = require('@tetherto/mdk-app-runtime/lib/plugin-loader')
const { buildFastifyRoutes, errorResponse, resolveAppTimeout } = require('./lib/plugin-adapter')
const { fastifyLoggerOptions, gatewayLogger } = require('./lib/logger')
const { resolveSecurityOptions, buildHostAllowlist, createHostCheck } = require('./lib/security')
const { resolveStoreDir } = require('./lib/utils')

// Publishes the key app runtimes allow-list. The directory is private to this
// user and the file is not group/other-writable (runtimes refuse one that is),
// and it is replaced atomically so a runtime never reads half a key.
function writeGatewayKeyFile (file, key) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
  const tmp = `${file}.${crypto.randomBytes(8).toString('hex')}.tmp`
  try {
    fs.writeFileSync(tmp, key, { mode: 0o644, flag: 'wx' })
    fs.chmodSync(tmp, 0o644) // the umask may have narrowed it; never widened past 0o644
    fs.renameSync(tmp, file)
  } catch (err) {
    try { fs.unlinkSync(tmp) } catch {}
    throw err
  }
}

class WrkServerHttp extends TetherWrkBase {
  constructor (conf, ctx) {
    super(conf, ctx)

    if (!ctx.port) {
      throw new Error('ERR_HTTP_PORT_INVALID')
    }

    this.storeDir = 'http'
    this.prefix = `${this.wtype}-${ctx.port}`
    this.queuedRequests = new Map()

    this.init()
    this.start()
  }

  init () {
    super.init()

    const storeFac = (this.conf.init?.facilities || []).find(([, mod, name]) => mod === '@tetherto/hp-svc-facs-store' && name === 's0')
    if (storeFac) storeFac[4] = { ...storeFac[4], storeDir: resolveStoreDir(storeFac[4].storeDir, this.ctx) }

    // Validated up front so a bad option fails the boot, not the first request.
    this._security = resolveSecurityOptions(this.conf, this.ctx)
    resolveAppTimeout(this.conf)

    this.setInitFacs([
      ['fac', '@bitfinex/bfx-facs-lru', '10s', '10s', { max: 10000, maxAge: 10000 }],
      ['fac', '@bitfinex/bfx-facs-lru', '15s', '15s', { max: 10000, maxAge: 15000 }],
      ['fac', '@bitfinex/bfx-facs-lru', '30s', '30s', { max: 10000, maxAge: 30000 }],
      ['fac', '@bitfinex/bfx-facs-lru', '1m', '1m', { max: 10000, maxAge: 60000 }],
      ['fac', '@bitfinex/bfx-facs-lru', '15m', '15m', { max: 10000, maxAge: 60000 * 15 }],
      ['fac', '@tetherto/svc-facs-httpd', 'h0', 'h0', {
        // Static serving is opt-in: only when common.json sets staticRootPath.
        staticRootPath: this.conf.staticRootPath,
        staticOn404File: 'index.html',
        port: this.ctx.port,
        logger: fastifyLoggerOptions(this.conf),
        // No GET /echo: the gateway serves only what its plugins and caller declare.
        addDefaultRoutes: false,
        trustProxy: this._security.trustProxy,
        bodyLimit: this._security.bodyLimit
      }, 0]
    ])

    // ctx.apps (`{ name, appDir, keyFile, mount? }`) is the complete inventory
    // of a gateway's app routes. Each app runs in its own runtime process: only
    // its route table is read here, and every request is forwarded over HRPC.
    this._apps = (this.ctx.apps || []).map(app => ({
      ...app,
      routes: loadPlugin(resolvePluginDir(app.appDir), undefined, { handlers: false }).routes
    }))
    this._runtimeClient = null
  }

  debugGeneric (msg) {
    debug(`[HTTP/${this.ctx.shard}]`, ...arguments)
  }

  _start (cb) {
    async.series([
      next => { super._start(next) },
      async () => {
        await this.net_r0.startRpcServer()

        const httpd = this.httpd_h0
        const security = this._security
        const log = gatewayLogger(this.conf)

        // Registered before any route so their onRoute/onRequest hooks cover
        // every plugin and additional route.
        if (security.helmet) httpd.addPlugin([require('@fastify/helmet'), security.helmet])
        else log.warn('security headers (helmet) are disabled')
        if (security.rateLimit) httpd.addPlugin([require('@fastify/rate-limit'), security.rateLimit])
        else log.warn('rate limiting is disabled')

        const hostAllowlist = buildHostAllowlist(security.allowedHosts, {
          port: String(this.ctx.port),
          host: httpd.opts.host || httpd.conf?.host
        })
        if (hostAllowlist) httpd.addHook('onRequest', createHostCheck(hostAllowlist))
        else log.warn('allowedHosts contains "*": the Host check is off, so DNS rebinding is not blocked')

        this.ctx.additionalRoutes?.forEach(r => {
          httpd.addRoute(r)
        })

        if (this._apps.length || this.ctx.gatewayKeyFile) {
          // One stable key, across restarts, for every app runtime to allow-list.
          const seed = getOrCreateSeed(path.join(this.ctx.root, 'identity', 'seedRuntimeClient'))
          this._runtimeClient = createRuntimeClient({ seed, bootstrap: this.ctx.kernelBootstrap })
          await this._runtimeClient.connect()
        }

        for (const app of this._apps) {
          buildFastifyRoutes(app, this._runtimeClient, this, { authVerifier: security.authVerifier }).forEach(r => {
            httpd.addRoute(r)
          })
        }

        if (!security.authVerifier) {
          const closed = this._apps.flatMap(a => a.routes.filter(r => r.auth === true).map(r => r.id))
          if (closed.length) log.warn(`no authVerifier configured: ${closed.length} auth: true route(s) answer 401 (${closed.join(', ')})`)
        }

        httpd.addErrorHandler((err, request, reply) => {
          const body = errorResponse(err, request.log)
          reply.status(body.statusCode).send(body)
        })

        await httpd.startServer()

        // The net facility's DHT client key; startGateway publishes it to the
        // trusted-keys dir as gateway.pub. App routes use appClientKey below.
        this.status.rpcClientKey = this.net_r0.dht.defaultKeyPair.publicKey.toString('hex')

        // The key app runtimes allow-list (their allowedKeyFiles), published
        // once the listener is up.
        if (this._runtimeClient) {
          this.status.appClientKey = this._runtimeClient.publicKey.toString('hex')
          if (this.ctx.gatewayKeyFile) {
            writeGatewayKeyFile(this.ctx.gatewayKeyFile, this.status.appClientKey)
          }
        }
        this.saveStatus()
      }
    ], cb)
  }

  _stop (cb) {
    async.series([
      next => { super._stop(next) },
      async () => {
        const client = this._runtimeClient
        this._runtimeClient = null
        if (client) await client.close()
      }
    ], cb)
  }
}

module.exports = WrkServerHttp
module.exports.writeGatewayKeyFile = writeGatewayKeyFile
