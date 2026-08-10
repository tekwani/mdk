'use strict'

const CryptoJS = require('crypto-js')
const WMApiBase = require('./wm-api-base')
const hex2a = require('../utils/hex2a.js')
const { API_VERSIONS, API_DEFAULTS, COMMAND_MAP_V3, V3_STATUS_PARAMS, RESPONSE_CODES_V3 } = require('./constants')

/**
 * Whatsminer API v3 handler. Key differences from v2:
 * - Token generated per-command: SHA256(cmd + password + salt + ts).base64.substring(0, 8)
 * - Response format: {code, when, msg, desc} instead of {STATUS, When, Code, Msg}
 * - Response codes: 0=Success, -1=Fail, -2=Invalid command, -4=No permission
 * - Dot notation commands (get.miner.status with param)
 */
class WMApiV3 extends WMApiBase {
  constructor (opts) {
    super(opts)
    // Salt from get.device.info, used for per-command token generation
    this.salt = undefined
  }

  static get VERSION () {
    return API_VERSIONS.V3
  }

  static get DEFAULT_PORT () {
    return API_DEFAULTS[API_VERSIONS.V3].port
  }

  getAuthCommand () {
    return API_DEFAULTS[API_VERSIONS.V3].authCommand
  }

  async authenticate () {
    const res = await this.requestRead(this.getAuthCommand())

    // IP limit error (V3: -4, V2: 136)
    if (res?.code === RESPONSE_CODES_V3.NO_PERMISSION || res?.Code === 136) {
      throw new Error('ERR_TOKEN_FETCH_IP_LIMIT')
    }

    const isSuccess = res?.code === RESPONSE_CODES_V3.SUCCESS || res?.Code === 131
    if (!isSuccess) {
      throw new Error(`ERR_AUTH_FAILED_${res?.code || res?.Code}`)
    }

    // V3: {code, when, msg: {salt, ...}, desc}; V2: {STATUS, When, Code, Msg: {salt, ...}}
    const msgObj = res.msg || res.Msg || {}
    const salt = msgObj.salt

    if (!salt) {
      throw new Error('ERR_INVALID_AUTH_RESPONSE')
    }

    this.salt = salt

    return { salt }
  }

  async refreshToken () {
    try {
      await this.authenticate()
    } catch (e) {
      this.debugError('refreshToken error', e)
      throw e
    }
  }

  /**
   * Derive the per-request token and AES key exactly as the vendor's v3 API
   * specifies: `SHA256(command + password + salt + timestamp)`, the first 8
   * Base64 characters as the request token, and the full hex digest as the
   * AES-256-ECB key. `salt` comes from the device's auth response and
   * `timestamp` changes per request.
   *
   * This is a **wire-protocol implementation, not password storage.** Static
   * analysis flags the single fast hash of a password here and recommends a
   * slow KDF (bcrypt/scrypt/PBKDF2) — that guidance does not apply: the miner
   * firmware computes the same digest to verify the request, so substituting a
   * KDF (or a different construction) makes every authenticated call fail. The
   * v2 handler has the same shape for the same reason (`md5.crypt` + AES-ECB).
   *
   * Residual risk we cannot remove client-side: because the derivation is a
   * single SHA256 rather than a KDF, an attacker who captures traffic can brute
   * force the device password offline more cheaply than a KDF would allow, and
   * AES-ECB leaks block-level structure. Both are dictated by the vendor
   * protocol. Mitigate at the network layer — keep miner control interfaces on
   * a management VLAN that is not reachable from untrusted networks.
   */
  _generateToken (command, timestamp) {
    const tokenInput = `${command}${this.password}${this.salt}${timestamp}`
    const tokenHash = CryptoJS.SHA256(tokenInput)
    const tokenBase64 = tokenHash.toString(CryptoJS.enc.Base64)
    const token = tokenBase64.substring(0, 8)
    // Full SHA256 hash is used as the AES encryption key
    const key = tokenHash.toString()

    return { token, key }
  }

  async requestRead (command, params = {}) {
    const cmd = {
      cmd: command,
      ...params
    }
    this.debugError(`Sending command ${JSON.stringify(cmd)}`)
    try {
      const res = await this._requestMiner(cmd)
      this.debugError(`Received response ${JSON.stringify(res)}`)
      return res
    } catch (error) {
      this.debugError(error)
      throw new Error('ERR_READ_FAILED')
    }
  }

  async requestWrite (command, params = {}, json = true) {
    let retry = 0
    let err = null

    while (retry < 3) {
      try {
        if (this.salt === undefined) {
          await this.refreshToken()
        }

        const ts = Math.floor(Date.now() / 1000)
        const { token, key } = this._generateToken(command, ts)

        const cmdObj = {
          cmd: command,
          ts,
          token,
          account: 'super',
          ...params
        }

        const cmd = JSON.stringify(cmdObj)
        this.debugError(`Sending command ${cmd}`)

        const data = CryptoJS.AES.encrypt(cmd, CryptoJS.SHA256(key), { mode: CryptoJS.mode.ECB }).toString()
        const encCmd = {
          enc: 1,
          data
        }

        const res = await this._requestMiner(encCmd, json)

        // cases when we only need to write to miner and there is no response, e.g: reboot
        if (res.length === 0) {
          return null
        }
        if (!res.enc) {
          this.debugError(`Received response ${JSON.stringify(res)}`)
          throw new Error(this._getAPICodeMsg(res))
        }

        const decrypted = CryptoJS.AES.decrypt(res.enc, CryptoJS.SHA256(key), { mode: CryptoJS.mode.ECB }).toString()
        const response = JSON.parse(hex2a(decrypted))

        const responseCode = response.code !== undefined ? response.code : response.Code

        if (responseCode === RESPONSE_CODES_V3.NO_PERMISSION) {
          this.salt = undefined
          retry++
          continue
        }
        this.debugError(`Received response ${JSON.stringify(response)}`)
        return response
      } catch (e) {
        err = e
        this.salt = undefined
        retry++
      }
    }

    if (err) {
      this.debugError('write_err', err)
      throw err
    }
    return null
  }

  async _requestMiner (command, json = true) {
    const response = await this.rpc.request(JSON.stringify(command))
    return json ? JSON.parse(response) : response
  }

  _getAPICodeMsg (res) {
    const code = res?.code !== undefined ? res.code : res?.Code

    const v3CodeMessages = {
      0: 'OK',
      [-1]: 'ERR_FAIL',
      [-2]: 'ERR_INVALID_CMD',
      [-4]: 'ERR_NO_PERMISSION'
    }

    const v2CodeMessages = {
      14: 'ERR_INVALID_CMD',
      23: 'ERR_JSON_CMD',
      45: 'ERR_PERMISSION_DENIED',
      131: 'OK',
      135: 'ERR_TOKEN_EXPIRED',
      136: 'ERR_IP_LIMIT'
    }

    return v3CodeMessages[code] || v2CodeMessages[code] || `ERR_UNKNOWN_CODE_${code}`
  }

  transformCommand (command) {
    return COMMAND_MAP_V3[command] || command
  }

  getStatusParam (command) {
    return V3_STATUS_PARAMS[command]
  }

  /**
   * Parses V3 {code, when, msg, desc} responses into the V2-compatible shape
   * ({STATUS, When, Code, Msg, Description} plus SUMMARY/POOLS/DEVS/DEVDETAILS
   * for get.miner.status). Already-V2 responses pass through untouched.
   */
  parseResponse (response, originalCommand) {
    if (response?.STATUS !== undefined || response?.Code !== undefined) {
      return response
    }

    if (response?.code !== undefined) {
      const msg = response.msg

      const isMinerStatusCommand = ['summary', 'pools', 'edevs', 'devdetails'].includes(originalCommand)
      const isMinerStatusResponse = response.desc === 'get.miner.status' ||
        (isMinerStatusCommand && typeof msg === 'object')

      if (isMinerStatusResponse && typeof msg === 'object') {
        const converted = this._convertStatusResponse(msg, originalCommand)
        return {
          STATUS: response.code === RESPONSE_CODES_V3.SUCCESS ? 'S' : 'E',
          When: response.when || Date.now(),
          Code: this._convertV3CodeToV2(response.code),
          Description: response.desc || '',
          ...converted
        }
      }

      if (originalCommand === 'status' && typeof msg === 'object') {
        return {
          STATUS: response.code === RESPONSE_CODES_V3.SUCCESS ? 'S' : 'E',
          When: response.when || Date.now(),
          Code: this._convertV3CodeToV2(response.code),
          Msg: this._convertSettingFields(msg),
          Description: response.desc || ''
        }
      }

      return {
        STATUS: response.code === RESPONSE_CODES_V3.SUCCESS ? 'S' : 'E',
        When: response.when || Date.now(),
        Code: this._convertV3CodeToV2(response.code),
        Msg: msg,
        Description: response.desc || ''
      }
    }

    return response
  }

  _convertStatusResponse (msg, originalCommand) {
    const result = {}

    if (msg.summary) {
      result.SUMMARY = [this._convertSummaryFields(msg.summary)]
    } else if (originalCommand === 'summary' && msg.elapsed !== undefined) {
      result.SUMMARY = [this._convertSummaryFields(msg)]
    }

    if (msg.pools) {
      result.POOLS = msg.pools.map(p => this._convertPoolFields(p))
    } else if (originalCommand === 'pools' && Array.isArray(msg)) {
      result.POOLS = msg.map(p => this._convertPoolFields(p))
    }

    if (msg.edevs) {
      result.DEVS = msg.edevs.map(d => this._convertEdevFields(d))
    } else if (originalCommand === 'edevs' && Array.isArray(msg)) {
      result.DEVS = msg.map(d => this._convertEdevFields(d))
    }

    if (msg.devdetails) {
      result.DEVDETAILS = msg.devdetails.map(d => this._convertDevdetailFields(d))
    } else if (originalCommand === 'devdetails' && Array.isArray(msg)) {
      result.DEVDETAILS = msg.map(d => this._convertDevdetailFields(d))
    }

    return result
  }

  _convertSummaryFields (summary) {
    // V3 hash rates are in TH/s, V2 uses MH/s
    const thsToMhs = (ths) => (ths || 0) * 1000000

    return {
      Elapsed: summary.elapsed || 0,
      Uptime: summary['bootup-time'] || 0,
      'MHS av': thsToMhs(summary['hash-average']),
      'MHS 5s': thsToMhs(summary['hash-average']),
      'MHS 1m': thsToMhs(summary['hash-1min']),
      'MHS 5m': thsToMhs(summary['hash-average']),
      'MHS 15m': thsToMhs(summary['hash-15min']),
      'HS RT': thsToMhs(summary['hash-realtime']),
      freq_avg: summary['freq-avg'] || 0,
      'Target Freq': summary['target-freq'] || 0,
      'Factory GHS': (summary['factory-hash'] || 0) * 1000,
      Power: summary['power-5min'] || summary['power-realtime'] || 0,
      'Power Rate': summary['power-rate'] || 0,
      'Env Temp': summary['environment-temperature'] || 0,
      Temperature: Array.isArray(summary['board-temperature'])
        ? summary['board-temperature'][0] || 0
        : summary['board-temperature'] || 0,
      'Chip Temp Min': summary['chip-temp-min'] || 0,
      'Chip Temp Avg': summary['chip-temp-avg'] || 0,
      'Chip Temp Max': summary['chip-temp-max'] || 0,
      'Power Limit': summary['power-limit'] || 0,
      'Upfreq Complete': summary['up-freq-finish'] || 0,
      'Fan Speed In': summary['fan-speed-in'] || 0,
      'Fan Speed Out': summary['fan-speed-out'] || 0
    }
  }

  _convertPoolFields (pool) {
    return {
      POOL: pool.id || 0,
      URL: pool.url || '',
      Status: pool.status ? pool.status.charAt(0).toUpperCase() + pool.status.slice(1) : 'Alive',
      User: pool.account || '',
      'Stratum Active': pool['stratum-active'] || false,
      'Stratum Difficulty': pool['stratum-diff'] || 0,
      Accepted: pool.accepted || 0,
      Rejected: pool.rejected || 0,
      Stale: pool.stale || 0,
      'Pool Rejected%': pool['reject-rate'] || 0
    }
  }

  _convertEdevFields (dev) {
    const thsToMhs = (ths) => (ths || 0) * 1000000

    return {
      ASC: dev.id || 0,
      ID: dev.id || 0,
      Slot: dev.slot || 0,
      'MHS av': thsToMhs(dev['hash-average']),
      'Factory GHS': (dev['factory-hash'] || 0) * 1000,
      'Chip Frequency': dev.freq || 0,
      'Effective Chips': dev['effective-chips'] || 0,
      'Chip Temp Min': dev['chip-temp-min'] || 0,
      'Chip Temp Avg': dev['chip-temp-avg'] || 0,
      'Chip Temp Max': dev['chip-temp-max'] || 0
    }
  }

  _convertDevdetailFields (detail) {
    return {
      DEVDETAILS: detail.slot || detail.id || 0,
      ID: detail.id || 0,
      Name: detail.name || 'SM',
      Driver: detail.driver || '',
      Model: detail.model || ''
    }
  }

  _convertSettingFields (msg) {
    return {
      mineroff: msg['miner-off'] || 'false',
      mineroff_reason: msg['miner-off-reason'] || '',
      mineroff_time: msg['miner-off-time'] || '',
      FirmwareVersion: msg['firmware-version'] || '',
      power_mode: msg['power-mode'] || 'normal',
      power_limit_set: msg['power-limit-set'] || '',
      hash_percent: msg['hash-percent'] || '0',
      fast_mining: msg['fast-mining'] || 'false',
      fast_hash: msg['fast-hash'] || 'false',
      liquid_temp: msg['liquid-temp'] || 0,
      power_pct: msg['power-pct'] !== undefined ? msg['power-pct'].toString() : '100'
    }
  }

  _convertV3CodeToV2 (v3Code) {
    const codeMap = {
      [RESPONSE_CODES_V3.SUCCESS]: 131,
      [RESPONSE_CODES_V3.FAIL]: 14,
      [RESPONSE_CODES_V3.INVALID_COMMAND]: 14,
      [RESPONSE_CODES_V3.NO_PERMISSION]: 135
    }
    return codeMap[v3Code] || v3Code
  }

  /**
   * V3 tokens are per-command, so token info is just the salt.
   */
  getTokenInfo () {
    if (!this.salt) return undefined
    return { salt: this.salt }
  }

  generateTokenInfo (command) {
    if (!this.salt) return undefined
    const ts = Math.floor(Date.now() / 1000)
    const { token, key } = this._generateToken(command, ts)
    return { token, key, salt: this.salt, ts }
  }

  clearToken () {
    this.salt = undefined
  }
}

module.exports = WMApiV3
