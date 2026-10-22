'use strict'

// HTTP hardening for the gateway: which callers reach an `auth: true` route,
// which Host headers are served, and the Fastify-level limits. Every option is
// read from the worker ctx first (what startGateway passes) and then from the
// gateway's common.json, so both programmatic and file-configured gateways get
// the same switches. Defaults are the safe side of each.

const DEFAULT_BODY_LIMIT = 1048576 // 1 MiB, Fastify's own default made explicit
const DEFAULT_RATE_LIMIT = {
  max: 300,
  timeWindow: '1 minute',
  // An ERR_* error, so errorResponse forwards the code instead of masking and
  // logging every 429 as an unexpected failure.
  errorResponseBuilder: (request, context) => Object.assign(new Error('ERR_RATE_LIMITED'), { statusCode: context.statusCode })
}
// Helmet's defaults, minus upgrade-insecure-requests: a UI served from
// staticRootPath over plain http on a LAN address would otherwise have every
// asset rewritten to an https URL nothing answers.
const DEFAULT_HELMET = {
  contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } }
}
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]']
const WILDCARD_BIND = new Set(['0.0.0.0', '::', '[::]'])

// The permission an identity must carry for `?overwriteCache=true` to skip a
// cached response. Only an identity the authVerifier returned can carry it.
const OVERWRITE_CACHE_PERM = 'cache:overwrite'

function _pick (name, conf, ctx) {
  if (ctx && ctx[name] !== undefined) return ctx[name]
  if (conf && conf[name] !== undefined) return conf[name]
  return undefined
}

// Off unless set. Anything Fastify accepts passes through (a hop count, an
// address list); only the CLI's 'true'/'false' strings are turned into booleans.
function _trustProxy (value) {
  if (value === undefined || value === null || value === 'false') return false
  if (value === 'true') return true
  return value
}

// Built-in verifier for single-machine stacks (`mdk run`, the examples): a caller
// whose TCP peer is loopback is the local operator, the identity the agent plugin
// already falls back to. It reads the socket, never X-Forwarded-For, so it must not
// be used behind a reverse proxy on the same host (every proxied request would be
// loopback). Remote callers get 401 and need a real verifier.
//
// A loopback socket is not enough on its own: any page open in the operator's
// browser can fire a no-cors POST at http://localhost:<port>/..., and the Host
// check passes. So a browser request must also come from a loopback origin (the
// UI on localhost, or a Vite dev server on another port, which forwards the
// browser's Origin through its proxy) or, while the Host allowlist is on, from
// this gateway's own origin. Clients that send neither Origin nor
// Sec-Fetch-Site (curl, Node, the CLI) are unaffected.
//
// The same-origin case trusts request.host, which only the Host allowlist
// vouches for: with allowedHosts "*" a DNS-rebound page (Origin and Host both
// http://attacker.example:<port>) would otherwise look same-origin. So with the
// Host check off only loopback Origins are accepted.
const LOCAL_IDENTITY = Object.freeze({ user: Object.freeze({ userId: 'local' }) })
const LOOPBACK_HOSTNAMES = new Set(LOOPBACK_HOSTS)

function _isLoopbackAddress (addr) {
  if (!addr) return false
  const a = addr.startsWith('::ffff:') ? addr.slice(7) : addr
  return a === '::1' || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(a)
}

function _isLocalBrowserCaller (request, trustSameOrigin) {
  const headers = request.headers || {}
  if (headers['sec-fetch-site'] === 'cross-site') return false

  const origin = headers.origin
  if (origin === undefined) return true
  let url
  try {
    url = new URL(origin) // 'null' (sandboxed iframe, file://) throws and is refused
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  if (LOOPBACK_HOSTNAMES.has(url.hostname)) return true
  if (!trustSameOrigin) return false
  // Same origin as the request; request.host has already passed the Host allowlist.
  const host = request.host ?? headers.host
  return typeof host === 'string' && url.host === host.toLowerCase()
}

// hostCheckActive: whether the Host allowlist runs before the verifier. Only
// then is a non-loopback same-origin Origin accepted.
function createLoopbackVerifier ({ hostCheckActive = false } = {}) {
  const trustSameOrigin = hostCheckActive === true
  return async function loopbackVerifier (request) {
    if (!_isLoopbackAddress(request.socket?.remoteAddress)) return false
    return _isLocalBrowserCaller(request, trustSameOrigin) ? { ...LOCAL_IDENTITY } : false
  }
}

// The strict variant (loopback Origins only), safe whatever the Host check.
// resolveSecurityOptions swaps in the same-origin-aware one when the allowlist is on.
const loopbackVerifier = createLoopbackVerifier()
const loopbackVerifierHostChecked = createLoopbackVerifier({ hostCheckActive: true })

const BUILTIN_VERIFIERS = { loopback: loopbackVerifier }

function resolveSecurityOptions (conf = {}, ctx = {}) {
  // A function from ctx, or the name of a built-in ('loopback') from ctx or common.json.
  let authVerifier = ctx.authVerifier ?? conf.authVerifier
  if (typeof authVerifier === 'string') {
    if (!Object.hasOwn(BUILTIN_VERIFIERS, authVerifier)) {
      throw new Error(`ERR_GATEWAY_AUTH_VERIFIER_INVALID: unknown built-in verifier "${authVerifier}" (known: ${Object.keys(BUILTIN_VERIFIERS).join(', ')})`)
    }
    authVerifier = BUILTIN_VERIFIERS[authVerifier]
  }
  if (authVerifier != null && typeof authVerifier !== 'function') {
    throw new Error('ERR_GATEWAY_AUTH_VERIFIER_INVALID: authVerifier must be a function or the name of a built-in verifier')
  }

  // worker.js CLI flags (--allowed-hosts a,b --body-limit 2097152
  // --trust-proxy true) arrive as strings.
  let allowedHosts = _pick('allowedHosts', conf, ctx)
  if (typeof allowedHosts === 'string') allowedHosts = allowedHosts.split(',').map(h => h.trim()).filter(Boolean)
  if (allowedHosts !== undefined && !Array.isArray(allowedHosts)) {
    throw new Error('ERR_GATEWAY_ALLOWED_HOSTS_INVALID: allowedHosts must be an array of host names')
  }

  // buildHostAllowlist turns the Host check off for '*'.
  const hostCheckActive = !(allowedHosts || []).includes('*')
  if (authVerifier === loopbackVerifier && hostCheckActive) authVerifier = loopbackVerifierHostChecked

  let bodyLimit = _pick('bodyLimit', conf, ctx) ?? DEFAULT_BODY_LIMIT
  if (typeof bodyLimit === 'string' && /^\d+$/.test(bodyLimit)) bodyLimit = Number(bodyLimit)
  if (!Number.isInteger(bodyLimit) || bodyLimit <= 0) {
    throw new Error('ERR_GATEWAY_BODY_LIMIT_INVALID: bodyLimit must be a positive integer (bytes)')
  }

  const rateLimit = _pick('rateLimit', conf, ctx)
  const helmet = _pick('helmet', conf, ctx)

  return {
    authVerifier: authVerifier || null,
    allowedHosts: allowedHosts || [],
    hostCheckActive,
    trustProxy: _trustProxy(_pick('trustProxy', conf, ctx)),
    bodyLimit,
    // false switches a layer off; an object is merged over the defaults.
    rateLimit: rateLimit === false ? false : { ...DEFAULT_RATE_LIMIT, ...(rateLimit || {}) },
    helmet: helmet === false ? false : { ...DEFAULT_HELMET, ...(helmet || {}) }
  }
}

// Splits a Host header (or an allowlist entry) into a lower-cased hostname and
// an optional port, keeping IPv6 literals bracketed: "[::1]:3000" → ["[::1]", "3000"].
function _splitHost (value) {
  const v = String(value).trim().toLowerCase()
  const m = v.startsWith('[') ? v.match(/^(\[[^\]]*\])(?::(\d+))?$/) : v.match(/^([^:]+)(?::(\d+))?$/)
  if (!m) return null
  return { hostname: m[1], port: m[2] || null }
}

// The Host values this gateway answers to. Loopback on the bound port is always
// in, plus the bound address itself when it is a specific one, plus whatever the
// operator lists. An entry with a port matches only that port; one without
// matches the host on any port (a reverse proxy usually drops :443). '*' turns
// the check off.
function buildHostAllowlist (configured, { port, host } = {}) {
  if (configured.includes('*')) return null

  const entries = LOOPBACK_HOSTS.map(h => `${h}:${port}`)
  if (host && !WILDCARD_BIND.has(host)) {
    entries.push(`${host.includes(':') && !host.startsWith('[') ? `[${host}]` : host}:${port}`)
  }
  entries.push(...configured)

  const list = []
  for (const entry of entries) {
    const parsed = _splitHost(entry)
    if (!parsed) throw new Error(`ERR_GATEWAY_ALLOWED_HOSTS_INVALID: "${entry}"`)
    list.push(parsed)
  }
  return list
}

function isHostAllowed (allowlist, hostHeader) {
  if (allowlist === null) return true
  if (!hostHeader) return false
  const got = _splitHost(hostHeader)
  if (!got) return false
  return allowlist.some(e => e.hostname === got.hostname && (e.port === null || e.port === got.port))
}

// onRequest hook: a request whose Host is not this gateway's is refused before
// routing, which is what stops a DNS-rebound page from reading a localhost
// gateway. request.host honours X-Forwarded-Host only when trustProxy is on.
function createHostCheck (allowlist) {
  return async function hostCheck (request) {
    if (!isHostAllowed(allowlist, request.host)) {
      throw Object.assign(new Error('ERR_GATEWAY_HOST_NOT_ALLOWED'), { statusCode: 403 })
    }
  }
}

function _unauthorized () {
  return Object.assign(new Error('ERR_AUTH_UNAUTHORIZED'), { statusCode: 401 })
}

// Route-level preParsing hook for an `auth: true` route. With no verifier the route is
// closed (401); with one, its truthy return is the caller's identity and becomes
// req._info for the controller. A verifier may throw its own 4xx ERR_* (403 for
// a missing permission, say); anything else it throws fails closed as a 401.
function createAuthHook (authVerifier, routeInfo) {
  return async function authHook (request) {
    if (!authVerifier) throw _unauthorized()

    let identity
    try {
      identity = await authVerifier(request, routeInfo)
    } catch (err) {
      const status = err?.statusCode
      if (Number.isInteger(status) && status >= 400 && status < 500 && /^ERR_/.test(err.message)) throw err
      request.log?.error(err)
      throw _unauthorized()
    }

    if (!identity) throw _unauthorized()
    request._info = typeof identity === 'object' ? identity : {}
    request._authenticated = true
  }
}

function canOverwriteCache (request) {
  if (request._authenticated !== true) return false
  const perms = request._info?.perms
  return Array.isArray(perms) && perms.includes(OVERWRITE_CACHE_PERM)
}

module.exports = {
  DEFAULT_BODY_LIMIT,
  DEFAULT_RATE_LIMIT,
  DEFAULT_HELMET,
  OVERWRITE_CACHE_PERM,
  loopbackVerifier,
  createLoopbackVerifier,
  resolveSecurityOptions,
  buildHostAllowlist,
  isHostAllowed,
  createHostCheck,
  createAuthHook,
  canOverwriteCache
}
