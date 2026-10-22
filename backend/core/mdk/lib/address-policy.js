'use strict'

const net = require('net')
const dns = require('dns')

// Device addresses come from remote registerThing/updateThing callers and the
// worker later dials them with the stored credentials, so an unchecked
// address is both an SSRF primitive and a way to redirect device passwords.
// Default policy: refuse loopback, unspecified, link-local (which covers the
// 169.254.169.254 cloud metadata endpoint), multicast/broadcast and the other
// well-known metadata addresses. An operator CIDR allowlist replaces the
// default policy entirely: when set, only addresses inside it are accepted.

const BLOCKED_V4 = [
  ['0.0.0.0', 8], // unspecified / "this network"
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, incl. 169.254.169.254 metadata
  ['100.100.100.200', 32], // Alibaba Cloud metadata
  ['224.0.0.0', 4], // multicast
  ['255.255.255.255', 32] // broadcast
]
const BLOCKED_V6 = [
  ['::', 128], // unspecified
  ['::1', 128], // loopback
  ['fe80::', 10], // link-local
  ['fd00:ec2::254', 128], // AWS IPv6 metadata
  ['ff00::', 8] // multicast
]
const BLOCKED_HOSTNAMES = /^(localhost|.*\.localhost|metadata|metadata\.google\.internal|instance-data|instance-data\.ec2\.internal)\.?$/i
const HOSTNAME_RE = /^(?=.{1,253}$)[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.?$/i

const DEFAULT_BLOCKLIST = new net.BlockList()
for (const [ip, prefix] of BLOCKED_V4) DEFAULT_BLOCKLIST.addSubnet(ip, prefix, 'ipv4')
for (const [ip, prefix] of BLOCKED_V6) DEFAULT_BLOCKLIST.addSubnet(ip, prefix, 'ipv6')

function _ipType (ip) {
  const v = net.isIP(ip)
  return v === 4 ? 'ipv4' : v === 6 ? 'ipv6' : null
}

// ::ffff:a.b.c.d must be judged by its embedded IPv4 address.
function _normalizeIp (ip) {
  const m = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip)
  return m ? m[1] : ip
}

/**
 * Builds a net.BlockList from CIDR strings ("10.0.0.0/8", "fd00::/8", or a
 * bare IP). Throws ERR_ADDRESS_ALLOWLIST_INVALID on a malformed entry.
 */
function buildCidrList (cidrs) {
  const list = new net.BlockList()
  for (const entry of cidrs) {
    if (typeof entry !== 'string') throw new Error('ERR_ADDRESS_ALLOWLIST_INVALID')
    const [ip, prefixStr] = entry.trim().split('/')
    const type = _ipType(ip)
    if (!type) throw new Error(`ERR_ADDRESS_ALLOWLIST_INVALID: ${entry}`)
    const max = type === 'ipv4' ? 32 : 128
    const prefix = prefixStr === undefined ? max : Number(prefixStr)
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > max) {
      throw new Error(`ERR_ADDRESS_ALLOWLIST_INVALID: ${entry}`)
    }
    list.addSubnet(ip, prefix, type)
  }
  return list
}

function _isIpAllowed (ip, allowlist) {
  const addr = _normalizeIp(ip)
  const type = _ipType(addr)
  if (!type) return false
  if (allowlist) return allowlist.check(addr, type)
  return !DEFAULT_BLOCKLIST.check(addr, type)
}

/**
 * Validates a device `port`: an integer 1..65535 (a numeric string is
 * accepted). Returns the port as a number; undefined passes through.
 */
function validatePort (port) {
  if (port === undefined || port === null) return port
  const n = typeof port === 'string' && /^\d+$/.test(port) ? Number(port) : port
  if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error('ERR_THING_PORT_INVALID')
  return n
}

/**
 * Validates a device `address` against the policy. `opts.allowedCidrs`
 * (array of CIDR strings) replaces the default blocklist with a positive
 * allowlist. Hostnames are resolved (opts.lookup, default dns.promises.lookup)
 * and every resolved address must pass. Throws ERR_THING_ADDRESS_*.
 */
async function validateAddress (address, opts = {}) {
  if (typeof address !== 'string' || !address.length || address.length > 253) {
    throw new Error('ERR_THING_ADDRESS_INVALID')
  }
  const allowlist = Array.isArray(opts.allowedCidrs) && opts.allowedCidrs.length
    ? buildCidrList(opts.allowedCidrs)
    : null

  if (_ipType(address)) {
    if (!_isIpAllowed(address, allowlist)) throw new Error(`ERR_THING_ADDRESS_FORBIDDEN: ${address}`)
    return address
  }

  if (!HOSTNAME_RE.test(address)) throw new Error('ERR_THING_ADDRESS_INVALID')
  if (!allowlist && BLOCKED_HOSTNAMES.test(address)) throw new Error(`ERR_THING_ADDRESS_FORBIDDEN: ${address}`)

  const lookup = opts.lookup || ((host) => dns.promises.lookup(host, { all: true, verbatim: true }))
  let resolved
  try {
    resolved = await lookup(address)
  } catch (e) {
    throw new Error(`ERR_THING_ADDRESS_UNRESOLVABLE: ${address}`)
  }
  const ips = (Array.isArray(resolved) ? resolved : [resolved]).map((r) => (typeof r === 'string' ? r : r && r.address))
  if (!ips.length) throw new Error(`ERR_THING_ADDRESS_UNRESOLVABLE: ${address}`)
  for (const ip of ips) {
    if (!_isIpAllowed(ip, allowlist)) throw new Error(`ERR_THING_ADDRESS_FORBIDDEN: ${address} -> ${ip}`)
  }
  return address
}

module.exports = { validateAddress, validatePort, buildCidrList }
