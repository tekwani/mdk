'use strict'

const crypto = require('crypto')
const debug = require('debug')('mdk:kernel:hrpc')
const HyperswarmRPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const { serialize, deserialize } = require('../protocol/envelope')
const { routeEnvelope } = require('./envelope-router')
const { parseAllowlist, normalizeKey, normalizeRoles, hasRole, FULL_ACCESS } = require('./caller-auth')

/**
 * Kernel HRPC listener. Admission is fail-closed: only public keys on the
 * allowlist (`whitelist`, or added at runtime with allowKey()) may connect,
 * and an empty allowlist admits nobody. `allowAll: true` is the one explicit
 * way to admit every DHT peer (development only; logged loudly).
 */

class HRPCListener {
  constructor (opts) {
    this.dispatcher = opts.dispatcher
    this.telemetryCollector = opts.telemetryCollector
    this.registry = opts.registry
    this.actionManager = opts.actionManager
    this._allowed = parseAllowlist(opts.whitelist)
    this.allowAll = opts.allowAll === true
    this.store = opts.store || null
    this.bootstrap = opts.bootstrap || null

    this._rpc = null
    this._server = null
    this._dht = null
    this._confBee = null
  }

  async start () {
    if (this.allowAll) {
      console.warn('[mdk-kernel] WARNING: HRPC allowAll is enabled — every DHT peer that knows the Kernel key can command devices. Never use this outside local development.')
    } else if (this._allowed.size === 0) {
      debug('HRPC allowlist is empty: every caller is rejected until allowKey() admits one')
    }

    const seedDht = await this._getOrCreateSeed('seedDht')
    const seedRpc = await this._getOrCreateSeed('seedRpc')

    this._dht = new DHT({ keyPair: DHT.keyPair(seedDht), bootstrap: this.bootstrap })
    this._rpc = new HyperswarmRPC({ dht: this._dht, seed: seedRpc })

    const firewall = this._buildFirewall()
    this._server = this._rpc.createServer({ firewall })

    this._server.respond('mdk', async (reqBuf, rpc) => {
      try {
        // Re-checked per request: a key revoked after its connection opened
        // must stop working without waiting for the connection to drop.
        const caller = this._callerFor(rpc)
        if (!caller) return serialize({ error: 'ERR_KERNEL_CALLER_NOT_ALLOWED' })
        const envelope = deserialize(reqBuf)
        const result = await this.handleEnvelope(envelope, caller)
        return serialize(result || {})
      } catch (err) {
        debug('request error: %s', err.message)
        return serialize({ error: err.message })
      }
    })

    await this._server.listen()

    const pubKeyHex = this._server.publicKey.toString('hex')
    debug('HRPC listener listening (pubkey: %s...)', pubKeyHex.slice(0, 16))

    return { publicKey: this._server.publicKey }
  }

  async stop () {
    if (this._server) { await this._server.close(); this._server = null }
    if (this._rpc) { await this._rpc.destroy(); this._rpc = null }
    if (this._dht) { await this._dht.destroy(); this._dht = null }
    debug('HRPC listener stopped')
  }

  getRpc () { return this._rpc }
  getDht () { return this._dht }

  getPublicKey () {
    return this._server ? this._server.publicKey : null
  }

  // The key this Kernel dials workers with (the DHT default keypair that
  // @hyperswarm/rpc clients connect from) — what a Worker allowlist names.
  getClientPublicKey () {
    return this._dht ? this._dht.defaultKeyPair.publicKey : null
  }

  /**
   * Admit a caller at runtime.
   * @param {string|Buffer} key - caller public key
   * @param {string[]} [roles] - default full access (['admin'])
   */
  allowKey (key, roles) {
    const hex = normalizeKey(key)
    this._allowed.set(hex, normalizeRoles(roles))
    debug('caller allowed: %s...', hex.slice(0, 16))
    return hex
  }

  revokeKey (key) {
    const hex = normalizeKey(key)
    const had = this._allowed.delete(hex)
    if (had) debug('caller revoked: %s...', hex.slice(0, 16))
    return had
  }

  listAllowedKeys (minRole = 'read') {
    return [...this._allowed].filter(([, roles]) => hasRole(roles, minRole)).map(([hex]) => hex)
  }

  getCallerRoles (key) {
    let hex
    try { hex = normalizeKey(key) } catch { return null }
    if (this._allowed.has(hex)) return this._allowed.get(hex)
    return this.allowAll ? FULL_ACCESS : null
  }

  _callerFor (rpc) {
    const remote = rpc && rpc.stream && rpc.stream.remotePublicKey
    if (!remote) return null
    const roles = this.getCallerRoles(remote)
    return roles ? { publicKey: remote.toString('hex'), roles } : null
  }

  async _getOrCreateSeed (name) {
    if (!this.store) return crypto.randomBytes(32)

    if (!this._confBee) {
      this._confBee = this.store.getBee
        ? this.store.getBee({ name: 'storeConf' }, { keyEncoding: 'utf-8' })
        : this.store.sub('storeConf')
      if (this._confBee.ready) await this._confBee.ready()
    }

    const existing = await this._confBee.get(name)
    if (existing && existing.value) {
      return Buffer.isBuffer(existing.value) ? existing.value : Buffer.from(existing.value)
    }

    const seed = crypto.randomBytes(32)
    await this._confBee.put(name, seed)
    debug('created persistent seed: %s', name)
    return seed
  }

  async handleEnvelope (envelope, caller) {
    return routeEnvelope(envelope, {
      dispatcher: this.dispatcher,
      telemetryCollector: this.telemetryCollector,
      registry: this.registry,
      actionManager: this.actionManager
    }, caller)
  }

  // Returns true to reject. Fail closed: an unknown key is rejected even when
  // the allowlist is empty.
  _buildFirewall () {
    return (remotePublicKey) => {
      if (this.getCallerRoles(remotePublicKey)) return false
      debug('blocked: %s...', remotePublicKey.toString('hex').slice(0, 16))
      return true
    }
  }
}

module.exports = { HRPCListener }
